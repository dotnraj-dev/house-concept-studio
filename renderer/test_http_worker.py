import base64
import io
import json
from pathlib import Path
import struct
import tempfile
import threading
import time
import unittest
from unittest.mock import patch
import urllib.request
import urllib.error
import uuid
from http.server import ThreadingHTTPServer
from http_worker import RenderStore, make_handler, validate_scene

PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=')


def glb(manifest):
    body = json.dumps(manifest).encode()
    body += b' ' * (-len(body) % 4)
    return struct.pack('<4sIII4s', b'glTF', 2, 20 + len(body), len(body), b'JSON') + body


class WorkerTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.store = RenderStore(self.folder.name)

    def tearDown(self):
        self.folder.cleanup()

    def payload(self):
        return {'id': str(uuid.uuid4()), 'scene_base64': base64.b64encode(glb({'asset': {'version': '2.0'}})).decode(), 'options': {'camera': {'position': [0, 5, 10], 'quaternion': [0, 0, 0, 1]}, 'width': 1280, 'samples': 128}}

    def test_rejects_external_files_and_unbounded_options(self):
        with self.assertRaises(ValueError):
            validate_scene(glb({'asset': {'version': '2.0'}, 'images': [{'uri': 'file:///secret'}]}))
        payload = self.payload()
        payload['options']['samples'] = 100000
        with self.assertRaises(ValueError):
            self.store.submit(payload)
        self.assertEqual(self.store.jobs, {})

    def test_idempotency_and_one_active_gpu_job(self):
        payload = self.payload()
        with patch.object(self.store, 'run'):
            first = self.store.submit(payload)
            second = self.store.submit(payload)
            self.assertEqual(first['id'], second['id'])
            with self.assertRaises(BlockingIOError):
                self.store.submit(self.payload())
            payload['options']['width'] = 1920
            with self.assertRaises(ValueError):
                self.store.submit(payload)
            self.store.cancel(first['id'])
            self.assertEqual(self.store.public(first['id'])['status'], 'CANCELLED')

    def test_completed_render_and_recovery_survive_restart(self):
        payload = self.payload()
        output = Path(self.folder.name) / payload['id'] / 'render.png'
        class Process:
            returncode = 0
            def wait(self, timeout=None):
                output.write_bytes(PNG)
        with patch('http_worker.subprocess.Popen', return_value=Process()):
            self.store.submit(payload)
            for _ in range(100):
                if self.store.public(payload['id'])['status'] == 'COMPLETED':
                    break
                time.sleep(.01)
        self.assertEqual(base64.b64decode(self.store.public(payload['id'])['output']['image_base64']), PNG)
        restored = RenderStore(self.folder.name)
        self.assertEqual(restored.public(payload['id'])['status'], 'COMPLETED')

    def test_token_required_for_worker_routes(self):
        server = ThreadingHTTPServer(('127.0.0.1', 0), make_handler(self.store, 'x' * 40))
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            with self.assertRaises(urllib.error.HTTPError) as denied:
                urllib.request.urlopen('http://127.0.0.1:%s/health' % server.server_port)
            self.assertEqual(denied.exception.code, 401)
            request = urllib.request.Request('http://127.0.0.1:%s/health' % server.server_port, headers={'Authorization': 'Bearer ' + 'x' * 40})
            with patch('http_worker.subprocess.run', side_effect=OSError):
                result = json.load(urllib.request.urlopen(request))
            self.assertEqual(result['service'], 'house-concept-render-worker')
        finally:
            server.shutdown()
            server.server_close()

    def test_cancellation_stops_the_running_blender_process(self):
        started, ended = threading.Event(), threading.Event()
        class Process:
            returncode = None
            def wait(self, timeout=None):
                started.set()
                if not ended.wait(2):
                    raise RuntimeError('Test process was not cancelled')
                return self.returncode
            def poll(self):
                return self.returncode
            def kill(self):
                self.returncode = -9
                ended.set()
        process = Process()
        with patch('http_worker.subprocess.Popen', return_value=process):
            job = self.store.submit(self.payload())
            self.assertTrue(started.wait(2))
            self.store.cancel(job['id'])
            self.assertTrue(ended.is_set())
            self.assertEqual(self.store.public(job['id'])['status'], 'CANCELLED')
            for _ in range(100):
                with self.store.lock:
                    finished = job['id'] not in self.store.processes
                if finished:
                    break
                time.sleep(.01)


if __name__ == '__main__':
    unittest.main()
