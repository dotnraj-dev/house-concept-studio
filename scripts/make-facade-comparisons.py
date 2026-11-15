"""Build labelled QA contact sheets from original references and actual browser PNGs."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageOps
root=Path(__file__).resolve().parents[1]
out=root/'docs/screenshots/facade'
items=[
 ('tn-contemporary-slats','Contemporary slats','ext-01-contemporary-slats.png'),
 ('tn-jaali-stone','Jaali and stone','ext-02-jaali-stone.png'),
 ('tn-curved-villa','Curved villa','ext-03-curved-villa.png'),
 ('tn-tiled-bungalow','Tiled bungalow (G+1 adaptation)','ext-04-tiled-bungalow.png'),
 ('tn-narrow-g2','Narrow urban (G+1 study)','ext-05-narrow-g2.png'),
]
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',22)
small=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',17)
for style,title,reference in items:
 canvas=Image.new('RGB',(1800,800),'#f4f2ed');d=ImageDraw.Draw(canvas)
 d.text((28,16),title,fill='#193b37',font=font)
 d.text((28,62),'PRIMARY REFERENCE: '+reference,fill='#555951',font=small)
 d.text((584,62),'ACTUAL BROWSER 3D: 30 x 50 ft / G+1 / same street-corner camera',fill='#555951',font=small)
 for file,x,w in [(root/'docs/references'/reference,28,520),(out/(style+'.png'),584,1188)]:
  im=Image.open(file).convert('RGB');im=ImageOps.contain(im,(w,670),Image.Resampling.LANCZOS)
  canvas.paste(im,(x+(w-im.width)//2,103+(670-im.height)//2))
 canvas.save(out/('compare-'+style+'.jpg'),quality=94)
sections=''.join(f'<section id="{style}"><h2>{title}</h2><a href="compare-{style}.jpg"><img loading="lazy" src="compare-{style}.jpg" alt="Primary reference beside actual browser capture: {title}"></a><p><a href="../../references/{reference}">Original reference</a> · <a href="{style}.png">Full browser screenshot</a> · <a href="comparison.md">Three remaining differences</a></p></section>' for style,title,reference in items)
html='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Tamil Nadu facade comparison</title><style>
*{box-sizing:border-box}body{margin:0;background:#f4f2ed;color:#193b37;font:17px/1.6 system-ui,sans-serif}
main{max-width:1820px;margin:auto;padding:40px 24px}h1{font-size:clamp(28px,4vw,52px);line-height:1.1;letter-spacing:-.04em;margin:10px 0 22px}h2{font-size:26px;margin:0 0 18px}p{max-width:960px}a{color:#235d54;text-underline-offset:4px}
.note{border-left:4px solid #b68e54;padding-left:20px}section{padding:38px 0;border-top:1px solid #c9cec5;margin-top:34px}img{display:block;width:100%;height:auto}.baseline{max-width:1150px}
</style><main><p>HOUSE CONCEPT STUDIO / FACADE STUDY</p><h1>Five Tamil Nadu facade recipes.</h1>
<p class="note">Actual browser captures, not AI replacement images. The kit is differentiated and opening-aware, but the results still fall short of the references in realism and composition. Read the honest three remaining differences per recipe.</p>
<p><a href="comparison.md">Full comparison</a> · <a href="../../../FACADE-KIT-UPDATE.md">Implementation and limits</a> · <a href="browser-verification.json">Capture evidence</a> · <a href="glb-verification.json">GLB evidence</a></p>
<section><h2>Before: original exterior</h2><p>The genuine pre-edit capture. Same measured G+1 house, street camera and presentation settings.</p><a href="before-exterior.png"><img class="baseline" src="before-exterior.png" alt="Genuine exterior baseline before facade-kit changes"></a></section>
'''+sections+'''<section><h2>Entrance access</h2><p><a href="entrance-closed.png">Closed main door</a> · <a href="entrance-open-walk.png">Opened with E and walked through</a> · <a href="walkthrough-verification.json">Camera evidence</a></p></section></main></html>'''
(out/'index.html').write_text(html,encoding='utf-8')
print('Saved five labelled reference/browser comparison boards and the gallery.')
