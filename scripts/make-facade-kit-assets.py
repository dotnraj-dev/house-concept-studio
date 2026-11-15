"""Original seamless facade maps and three CNC alpha masks. No reference photos are copied."""
from pathlib import Path
from PIL import Image,ImageDraw
import math,random
import numpy as np
OUT=Path(__file__).resolve().parents[1]/'public/assets/materials'
OUT.mkdir(parents=True,exist_ok=True)
size=1024
for kind in ['star','cross','flower']:
 im=Image.new('RGBA',(size,size),(0,0,0,0));draw=ImageDraw.Draw(im)
 for row in range(-1,9):
  for col in range(-1,9):
   cx=col*128+64;cy=row*128+64
   if kind=='star':
    points=[(cx+58*math.cos(i*math.pi/4),cy+58*math.sin(i*math.pi/4)) for i in range(8)]
    draw.line(points+[points[0]],fill='white',width=9,joint='curve')
    diamond=[(cx,cy-37),(cx+37,cy),(cx,cy+37),(cx-37,cy),(cx,cy-37)]
    draw.line(diamond,fill='white',width=8)
   elif kind=='cross':
    p=[(-19,-56),(19,-56),(19,-19),(56,-19),(56,19),(19,19),(19,56),(-19,56),(-19,19),(-56,19),(-56,-19),(-19,-19),(-19,-56)]
    draw.line([(cx+x,cy+y) for x,y in p],fill='white',width=8,joint='curve')
    draw.rectangle((cx-13,cy-13,cx+13,cy+13),outline='white',width=7)
   else:
    points=[(cx+60*math.cos(i*math.pi/3),cy+60*math.sin(i*math.pi/3)) for i in range(6)]
    draw.line(points+[points[0]],fill='white',width=8,joint='curve')
    for j in range(6):
     angle=j*math.pi/3;petal=[]
     for k in range(33):
      t=k*math.pi*2/32;r=22*(1-math.cos(t))
      petal.append((cx+math.cos(angle)*r-math.sin(angle)*8*math.sin(t),cy+math.sin(angle)*r+math.cos(angle)*8*math.sin(t)))
     draw.line(petal,fill='white',width=7)
 im.save(OUT/f'jaali-{kind}.png')
rng=random.Random(739);color=Image.new('RGB',(size,size),(88,83,75));height=Image.new('L',(size,size),50)
dc=ImageDraw.Draw(color);dh=ImageDraw.Draw(height)
for row in range(8):
 start=-rng.randrange(50,190)
 while start<size:
  width=rng.randrange(115,330);tone=rng.randrange(-20,20)
  box=(start+3,row*128+3,start+width-3,(row+1)*128-3)
  dc.rounded_rectangle(box,radius=5,fill=(176+tone,165+tone,145+tone));dh.rounded_rectangle(box,radius=6,fill=rng.randrange(170,230))
  start+=width
noise=np.random.default_rng(824).normal(0,3,(size,size,1))
arr=np.clip(np.array(color).astype(float)+noise,0,255).astype('uint8')
Image.fromarray(arr).save(OUT/'facade-stone-color.jpg',quality=92)
h=np.array(height).astype(float)/255
dy,dx=np.gradient(h*5)
normal=np.stack([-dx,-dy,np.ones_like(h)],axis=2);normal/=np.linalg.norm(normal,axis=2,keepdims=True)
Image.fromarray(((normal*.5+.5)*255).astype('uint8')).save(OUT/'facade-stone-normal.jpg',quality=94)
Image.fromarray(np.clip(205+np.random.default_rng(104).normal(0,6,(size,size)),0,255).astype('uint8')).save(OUT/'facade-stone-roughness.jpg',quality=90)
print('Created three original alpha masks and 6-inch-course stone PBR maps.')
