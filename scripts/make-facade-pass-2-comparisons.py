"""Labelled reference/before/after boards. Original captures and references are not altered."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageOps
root=Path(__file__).resolve().parents[1]
out=root/'docs/screenshots/facade-pass-2'
items=[
 ('tn-contemporary-slats','Contemporary slats','ext-01-contemporary-slats.png'),
 ('tn-jaali-stone','Jaali and stone','ext-02-jaali-stone.png'),
 ('tn-curved-villa','Curved villa','ext-03-curved-villa.png'),
 ('tn-tiled-bungalow','Tiled bungalow','ext-04-tiled-bungalow.png'),
 ('tn-narrow-g2','Narrow urban','ext-05-narrow-g2.png'),
]
def font(size):
 for name in ['C:/Windows/Fonts/arial.ttf','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf']:
  if Path(name).exists():return ImageFont.truetype(name,size)
 return ImageFont.load_default()
for style,title,reference in items:
 board=Image.new('RGB',(2600,1080),'#f4f2ed');d=ImageDraw.Draw(board)
 d.text((26,18),title+' / facade pass 2',fill='#203c35',font=font(28))
 files=[(root/'docs/references'/reference,26,470,'PRIMARY REFERENCE'),(out/('before-'+style+'-front.png'),520,1010,'BEFORE / ORIGINAL CAMERA'),(out/('after-'+style+'-matched-front.png'),1550,1024,'AFTER / SAME BASELINE CAMERA')]
 for file,x,width,label in files:
  d.text((x,68),label,fill='#596359',font=font(19))
  im=ImageOps.contain(Image.open(file).convert('RGB'),(width,945),Image.Resampling.LANCZOS)
  board.paste(im,(x+(width-im.width)//2,112+(945-im.height)//2))
 board.save(out/('compare-'+style+'.jpg'),quality=93)
sections=''
for style,title,ref in items:
 sections+=f'''<section id="{style}"><h2>{title}</h2><a href="compare-{style}.jpg"><img loading="lazy" src="compare-{style}.jpg" alt="{title}: reference, authentic before and matched-camera after"></a>
 <p><a href="../../references/{ref}">Original reference</a> · <a href="comparison.md">What matches / what still differs</a></p>
 <div class="pair"><figure><figcaption>Final Front view · 5.5 ft eye height</figcaption><a href="after-{style}-front.png"><img loading="lazy" src="after-{style}-front.png" alt="{title}, final road-facing camera"></a></figure>
 <figure><figcaption>Retained corner view</figcaption><a href="after-{style}-corner.png"><img loading="lazy" src="after-{style}-corner.png" alt="{title}, corner camera"></a></figure></div></section>'''
html='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Facade pass 2 · Tamil Nadu recipes</title>
<style>*{box-sizing:border-box}body{margin:0;background:#f4f2ed;color:#203c35;font:17px/1.65 system-ui,sans-serif}main{max-width:1900px;padding:42px 26px;margin:auto}h1{font-size:clamp(32px,4vw,56px);line-height:1.1;letter-spacing:-.035em}h2{font-size:28px}p{max-width:1100px}a{color:#235a4b;text-underline-offset:4px}.note{border-left:4px solid #ab895d;padding-left:20px}section{border-top:1px solid #c9cdc2;padding-top:25px;margin-top:40px}img{display:block;width:100%;height:auto}.pair{display:grid;grid-template-columns:1fr 1fr;gap:22px}figure{margin:0}figcaption{margin:15px 0;font-size:15px}@media(max-width:700px){.pair{grid-template-columns:1fr}}
</style><main><p>HOUSE CONCEPT STUDIO / VISUAL REVIEW</p><h1>The frontage, in five styles.</h1>
<p class="note">The room layout, floor count and plan generation are unchanged. These are actual browser 3D screenshots. They show the second facade pass and still fall short of the references' realism.</p>
<p>Each board uses the authentic before and a new after at the same baseline camera. Below it, the final Front view uses the corrected 5.5 ft eye height. The initial before camera had been raised by the old orbit limit; its original files are retained. Recipe lighting deliberately changes between before and after.</p>
<p><a href="comparison.md">Full visual comparison and camera notes</a> · <a href="../../../FACADE-PASS-2.md">Implementation report</a> · <a href="after-verification.json">Capture evidence</a> · <a href="geometry-verification.json">Scenery budget</a> · <a href="controls-verification.json">Controls and entrance</a> · <a href="glb-verification.json">GLB evidence</a></p>'''+sections+'</main></html>'
(out/'index.html').write_text(html,encoding='utf-8')
print('Saved five three-way comparison boards and the final-view gallery.')
