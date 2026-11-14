"""Create a clean source checkout without local credentials, projects or generated outputs."""
from pathlib import Path
import datetime, json, re, shutil

root = Path(__file__).resolve().parents[1]
destination = root/'.deploy'/('source-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d-%H%M%S'))
destination.mkdir(parents=True, exist_ok=False)
folders = ['src','server','public','renderer','scripts','deploy','.github']
files = ['package.json','package-lock.json','tsconfig.json','vite.config.ts','index.html','.gitignore','.dockerignore','.env.example','Dockerfile','docker-compose.yml','Caddyfile','render.yaml','render.paid.yaml']
files += [file.name for file in root.glob('*.md')]
secret = re.compile(rb'(?:github_pat_[A-Za-z0-9_]{40,}|gh[opusr]_[A-Za-z0-9]{30,}|sk-proj-[A-Za-z0-9_-]{30,}|rnd_[A-Za-z0-9]{30,})')
copied = []
def copy(file):
    relative = file.relative_to(root)
    if file.is_symlink(): raise ValueError('Deployment source must not contain symlinks: '+str(relative))
    if any(part in ('__pycache__','render-jobs','node_modules','.git') for part in relative.parts):return
    if file.name.startswith('.env') and file.name!='.env.example':return
    if file.suffix in ('.pyc','.log') or file.name=='.worker-token':return
    data=file.read_bytes()
    if file.suffix in ('.ts','.tsx','.py','.json','.yml','.yaml','.md','.ps1','.sh') and secret.search(data):
        raise ValueError('Potential credential found in source file: '+str(relative))
    target=destination/relative;target.parent.mkdir(parents=True, exist_ok=True);target.write_bytes(data);copied.append(str(relative))
for name in files:
    file=root/name
    if file.is_file():copy(file)
for name in folders:
    for file in (root/name).rglob('*'):
        if file.is_file():copy(file)
state={'checkout':str(destination),'repository':'https://github.com/dotnraj-dev/house-concept-studio.git','files':len(copied)}
(root/'.deploy'/'source-state.json').write_text(json.dumps(state,indent=2),encoding='utf-8')
print(json.dumps(state))
