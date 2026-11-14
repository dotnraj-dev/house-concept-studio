"""RunPod queue worker. Scene downloads are limited to your configured application host."""
import base64, json, os, pathlib, subprocess, tempfile, urllib.parse, urllib.request
import runpod

def download(url, target, token=None, max_bytes=52_428_800):
    parsed = urllib.parse.urlparse(url)
    allowed = os.environ.get('SCENE_ALLOWED_HOST', '').lower()
    if not allowed or parsed.scheme != 'https' or parsed.netloc.lower() != allowed:
        raise ValueError('Set SCENE_ALLOWED_HOST to the exact HTTPS application hostname.')
    headers = {'Authorization': 'Bearer ' + token} if token else {}
    request = urllib.request.Request(url, headers=headers)
    # Do not follow redirects with a bearer credential.
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, hdrs, newurl):
            return None
    opener = urllib.request.build_opener(NoRedirect)
    with opener.open(request, timeout=60) as response, open(target, 'wb') as output:
        total = 0
        while True:
            chunk = response.read(1_048_576)
            if not chunk:
                break
            total += len(chunk)
            if total > max_bytes:
                raise ValueError('Downloaded scene exceeds the worker limit.')
            output.write(chunk)

def handler(event):
    data = event['input']
    with tempfile.TemporaryDirectory(prefix='house-render-') as folder:
        root = pathlib.Path(folder)
        scene, options, image = root/'scene.glb', root/'options.json', root/'render.png'
        download(data['scene_url'], scene, data['scene_token'])
        if scene.read_bytes()[:4] != b'glTF':
            raise ValueError('Scene is not GLB.')
        config = {'camera': data['camera'], 'require_gpu': True, 'samples': min(512, max(128, int(data.get('samples', 256)))), 'width': min(3840, max(1280, int(data.get('width', 1920))))}
        if data.get('environment_url'):
            environment = root/'daylight.hdr'
            download(data['environment_url'], environment, max_bytes=10_485_760)
            config['environment_file'] = str(environment)
        options.write_text(json.dumps(config), encoding='utf-8')
        completed = subprocess.run([os.environ.get('BLENDER_BIN', 'blender'), '--background', '--python', str(pathlib.Path(__file__).with_name('render.py')), '--', str(scene), str(options), str(image)], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=540)
        if completed.returncode or not image.is_file():
            print(completed.stdout.decode('utf-8', errors='replace')[-8000:])
            raise RuntimeError('Blender could not render the submitted scene.')
        return {'image_base64': base64.b64encode(image.read_bytes()).decode('ascii'), 'renderer': 'Blender Cycles', 'width': config['width'], 'samples': config['samples']}

if __name__ == '__main__':
    runpod.serverless.start({'handler': handler})
