"""Authenticated Blender worker for any rented NVIDIA GPU. No pip packages required.

Bind to loopback and connect through an SSH tunnel. See GPU-SETUP.md.
"""
import base64
import hashlib
import hmac
import json
import os
from pathlib import Path
import shutil
import signal
import struct
import subprocess
import threading
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

MAX_SCENE = 50 * 1024 * 1024
MAX_BODY = 85 * 1024 * 1024
PNG_SIGNATURE = b'\x89PNG\r\n\x1a\n'
ACTIVE = {'IN_QUEUE', 'IN_PROGRESS'}


def validate_scene(data):
    if len(data) < 20 or len(data) > MAX_SCENE:
        raise ValueError('Scene must be a GLB under 50 MB.')
    magic, version, total, chunk_size, kind = struct.unpack('<4sIII4s', data[:20])
    if magic != b'glTF' or version != 2 or total != len(data) or kind != b'JSON' or chunk_size > len(data) - 20:
        raise ValueError('Scene is not a complete GLB 2.0 file.')
    manifest = json.loads(data[20:20 + chunk_size])
    if manifest.get('asset', {}).get('version') != '2.0' or len(manifest.get('nodes', [])) > 50000:
        raise ValueError('Unsupported scene manifest.')
    for item in manifest.get('buffers', []) + manifest.get('images', []):
        if item.get('uri') and not item['uri'].startswith('data:'):
            raise ValueError('Scene must embed every texture and buffer.')


def validate_options(options):
    import math
    if options.get('width') not in (1280, 1920, 3840) or options.get('samples') not in (128, 256, 512):
        raise ValueError('Unsupported render quality.')
    camera = options.get('camera', {})
    for name, length in (('position', 3), ('quaternion', 4)):
        value = camera.get(name)
        if not isinstance(value, list) or len(value) != length or any(type(x) not in (int, float) or not math.isfinite(x) for x in value):
            raise ValueError('Invalid camera pose.')
    if abs(math.hypot(*camera['quaternion']) - 1) >= .02:
        raise ValueError('Invalid camera rotation.')
    if type(camera.get('fov', 52)) not in (int, float) or not 15 <= camera.get('fov', 52) <= 110:
        raise ValueError('Invalid camera field of view.')
    if camera.get('units','feet') not in ('feet','metres'):
        raise ValueError('Invalid camera units.')
    return {'camera': camera, 'width': options['width'], 'samples': options['samples'], 'require_gpu': True}


class RenderStore:
    def __init__(self, root, blender='blender', timeout=600):
        self.root = Path(root).resolve()
        self.root.mkdir(parents=True, exist_ok=True)
        self.blender = blender
        self.timeout = timeout
        self.lock = threading.RLock()
        self.jobs = {}
        self.processes = {}
        for file in self.root.glob('*/status.json'):
            try:
                job = json.loads(file.read_text())
                if job['status'] in ACTIVE:
                    job.update(status='FAILED', message='Worker restarted during the render. Check the GPU process before retrying.')
                self.jobs[job['id']] = job
                self.persist(job)
            except (ValueError, KeyError, OSError):
                continue

    def persist(self, job):
        folder = self.root / job['id']
        folder.mkdir(exist_ok=True)
        temp = folder / 'status.tmp'
        temp.write_text(json.dumps(job), encoding='utf-8')
        temp.replace(folder / 'status.json')

    def public(self, job_id):
        with self.lock:
            job = dict(self.jobs[job_id])
            job.pop('digest', None)
            if job['status'] == 'IN_PROGRESS':
                job['elapsedSeconds'] = round(time.time() - job['started'])
            if job['status'] == 'COMPLETED':
                image = (self.root / job_id / 'render.png').read_bytes()
                job['output'] = {'image_base64': base64.b64encode(image).decode('ascii')}
            return job

    def submit(self, payload):
        job_id = str(uuid.UUID(payload['id']))
        scene = base64.b64decode(payload['scene_base64'], validate=True)
        validate_scene(scene)
        options = validate_options(payload['options'])
        environment = None
        if payload.get('environment_base64'):
            environment = base64.b64decode(payload['environment_base64'], validate=True)
            if len(environment) > 10 * 1024 * 1024 or not environment.startswith((b'#?RADIANCE', b'#?RGBE')):
                raise ValueError('Invalid daylight HDR file.')
        digest = hashlib.sha256(scene + json.dumps(options, sort_keys=True).encode() + (environment or b'')).hexdigest()
        with self.lock:
            if job_id in self.jobs:
                if self.jobs[job_id]['digest'] != digest:
                    raise ValueError('A different scene already uses this job ID.')
                return self.public(job_id)
            if any(j['status'] in ACTIVE for j in self.jobs.values()):
                raise BlockingIOError('This GPU is busy. Wait for its active render to finish.')
            folder = self.root / job_id
            folder.mkdir(exist_ok=True)
            (folder / 'scene.glb').write_bytes(scene)
            if environment:
                (folder / 'daylight.hdr').write_bytes(environment)
                options['environment_file'] = str(folder / 'daylight.hdr')
            (folder / 'options.json').write_text(json.dumps(options), encoding='utf-8')
            self.jobs[job_id] = {'id': job_id, 'status': 'IN_QUEUE', 'message': '', 'digest': digest, 'started': time.time(), 'elapsedSeconds': 0}
            self.persist(self.jobs[job_id])
            threading.Thread(target=self.run, args=(job_id,), daemon=True).start()
            return self.public(job_id)

    def run(self, job_id):
        folder = self.root / job_id
        process = None
        with self.lock:
            job = self.jobs[job_id]
            if job['status'] == 'CANCELLED':
                return
            job.update(status='IN_PROGRESS', started=time.time())
            self.persist(job)
            try:
                log = open(folder / 'blender.log', 'wb')
                process = subprocess.Popen([self.blender, '--background', '--disable-autoexec', '--python', str(Path(__file__).with_name('render.py')), '--', str(folder / 'scene.glb'), str(folder / 'options.json'), str(folder / 'render.png')], stdout=log, stderr=subprocess.STDOUT)
                self.processes[job_id] = process
            except OSError:
                job.update(status='FAILED', message='Blender could not start. Check BLENDER_BIN and worker logs.')
                self.persist(job)
                if 'log' in locals():
                    log.close()
                return
        try:
            process.wait(timeout=self.timeout)
            with self.lock:
                if job['status'] != 'CANCELLED':
                    image = folder / 'render.png'
                    valid = process.returncode == 0 and image.is_file() and image.stat().st_size <= 30 * 1024 * 1024 and image.read_bytes().startswith(PNG_SIGNATURE)
                    job.update(status='COMPLETED' if valid else 'FAILED', message='' if valid else 'Render failed. Check blender.log; GPU availability, scene size or memory may be the cause.')
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()
            with self.lock:
                if job['status'] != 'CANCELLED':
                    job.update(status='TIMED_OUT', message='Render exceeded the worker time limit.')
        finally:
            log.close()
            with self.lock:
                self.processes.pop(job_id, None)
                job['elapsedSeconds'] = round(time.time() - job['started'])
                self.persist(job)
            # Source assets can be large; retain output and logs, remove input after completion.
            for name in ('scene.glb', 'daylight.hdr', 'render.blend', 'render.blend1'):
                (folder / name).unlink(missing_ok=True)

    def cancel(self, job_id):
        with self.lock:
            job = self.jobs[job_id]
            if job['status'] in ACTIVE:
                job.update(status='CANCELLED', message='Render cancelled. The rented GPU instance is still running.')
                process = self.processes.get(job_id)
                if process and process.poll() is None:
                    process.kill()
                    process.wait(timeout=10)
                self.persist(job)
            return {'ok': True}


def make_handler(store, token):
    class Handler(BaseHTTPRequestHandler):
        protocol_version = 'HTTP/1.0'

        def log_message(self, fmt, *args):
            print('%s %s' % (self.command, self.path.split('?')[0]), flush=True)

        def send_json(self, code, data):
            body = json.dumps(data).encode()
            self.send_response(code)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(body)

        def authorised(self):
            if not hmac.compare_digest(self.headers.get('Authorization', ''), 'Bearer ' + token):
                self.send_json(401, {'error': 'Invalid worker token.'})
                return False
            return True

        def do_GET(self):
            if not self.authorised():
                return
            if self.path == '/health':
                gpu = ''
                try:
                    result = subprocess.run(['nvidia-smi', '--query-gpu=name', '--format=csv,noheader'], capture_output=True, text=True, timeout=8)
                    if result.returncode == 0:
                        gpu = result.stdout.strip()[:250]
                except (OSError, subprocess.TimeoutExpired):
                    pass
                with store.lock:
                    busy = any(j['status'] in ACTIVE for j in store.jobs.values())
                self.send_json(200, {'service': 'house-concept-render-worker', 'blender': bool(shutil.which(store.blender)), 'gpu': gpu, 'busy': busy})
            elif self.path.startswith('/jobs/'):
                try:
                    self.send_json(200, store.public(str(uuid.UUID(self.path[6:]))))
                except (ValueError, KeyError):
                    self.send_json(404, {'error': 'Render not found.'})
            else:
                self.send_json(404, {'error': 'Unknown route.'})

        def do_POST(self):
            if not self.authorised():
                return
            self.connection.settimeout(90)
            try:
                if self.path.startswith('/jobs/') and self.path.endswith('/cancel'):
                    self.send_json(200, store.cancel(str(uuid.UUID(self.path[6:-7]))))
                    return
                if self.path != '/jobs':
                    self.send_json(404, {'error': 'Unknown route.'})
                    return
                size = int(self.headers.get('Content-Length', '0'))
                if not 0 < size <= MAX_BODY:
                    self.send_json(413, {'error': 'Payload exceeds the worker limit.'})
                    return
                data = self.rfile.read(size)
                if len(data) != size:
                    raise ValueError('Incomplete scene upload.')
                self.send_json(202, store.submit(json.loads(data)))
            except BlockingIOError as error:
                self.send_json(409, {'error': str(error)})
            except (ValueError, KeyError, TypeError, struct.error):
                self.send_json(400, {'error': 'Invalid scene, camera, job ID or render options.'})
            except OSError:
                self.send_json(500, {'error': 'Worker could not store or process this job.'})
    return Handler


if __name__ == '__main__':
    secret = os.environ.get('GPU_WORKER_TOKEN', '')
    if len(secret) < 32:
        raise SystemExit('Set GPU_WORKER_TOKEN to a random secret of at least 32 characters.')
    store = RenderStore(os.environ.get('GPU_WORKER_DATA', './render-jobs'), os.environ.get('BLENDER_BIN', 'blender'))
    server = ThreadingHTTPServer((os.environ.get('GPU_WORKER_BIND', '127.0.0.1'), int(os.environ.get('GPU_WORKER_PORT', '8787'))), make_handler(store, secret))
    print('House render worker ready. Use an SSH tunnel; keep this process running.', flush=True)
    def stop_worker(_signal, _frame):
        raise KeyboardInterrupt
    signal.signal(signal.SIGTERM, stop_worker)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('Stopping worker and its active Blender job. Stop the rental separately.', flush=True)
    finally:
        server.server_close()
        for job_id in list(store.jobs):
            store.cancel(job_id)
