"""Download verified CC0 photographic maps; no runtime network dependency."""
from pathlib import Path
import requests,hashlib
ROOT=Path(__file__).resolve().parents[1]/'public/assets/materials'
ASSETS={'stackstone':'stacked_stone_wall','pavers':'rectangular_paving','marble':'marble_01'}
def main():
 for surface,asset in ASSETS.items():
  r=requests.get('https://api.polyhaven.com/files/'+asset,timeout=30);r.raise_for_status()
  for kind,suffix in [('Diffuse','color'),('nor_gl','normal'),('Rough','roughness')]:
   node=r.json()[kind]['2k' if surface=='stackstone' else '1k']['jpg'];p=ROOT/(surface+'-'+suffix+'.jpg')
   if p.exists() and hashlib.md5(p.read_bytes()).hexdigest()==node['md5']:continue
   data=requests.get(node['url'],timeout=50);data.raise_for_status();assert hashlib.md5(data.content).hexdigest()==node['md5'];p.write_bytes(data.content);print(p.name,len(data.content),flush=True)
if __name__=='__main__':main()
