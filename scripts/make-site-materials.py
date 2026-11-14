"""Original repeatable surface maps. Run with Python, Pillow and NumPy; no network dependency."""
from pathlib import Path
import numpy as np
from PIL import Image
out=Path(__file__).resolve().parents[1]/'public/assets/materials'
rng=np.random.default_rng(2156)
n=512
y,x=np.mgrid[:n,:n]
def noise(scale):
    grid=rng.normal(size=(scale,scale))
    yy=y*scale/n;xx=x*scale/n
    a=yy.astype(int);b=xx.astype(int);f=yy-a;g=xx-b;f=f*f*(3-2*f);g=g*g*(3-2*g)
    return (grid[a,b]*(1-g)+grid[a,(b+1)%scale]*g)*(1-f)+(grid[(a+1)%scale,b]*(1-g)+grid[(a+1)%scale,(b+1)%scale]*g)*f
def write(name,base,v,relief,rough):
    color=np.clip(np.array(base)+v[:,:,None],0,255).astype('uint8')
    dx=(np.roll(relief,-1,axis=1)-np.roll(relief,1,axis=1))*.5
    dy=(np.roll(relief,-1,axis=0)-np.roll(relief,1,axis=0))*.5
    vec=np.stack([-dx,dy,np.ones_like(dx)],axis=2);vec/=np.linalg.norm(vec,axis=2,keepdims=True)
    for m,data in [('color',color),('normal',np.uint8((vec*.5+.5)*255)),('roughness',np.uint8(np.clip(rough+v*.28,0,255)))]:
        Image.fromarray(data).save(out/(name+'-'+m+'.jpg'),quality=88)
fine=rng.normal(size=(n,n))
write('paint',[249,247,241],noise(12)*.8+fine*.9,fine*.065,209)
write('asphalt',[93,94,91],noise(5)*3+fine*10,fine*.13,220)
write('lawn',[112,130,83],noise(6)*8+noise(40)*5+fine*11,fine*.12,238)
course=np.mod(y,64);flute=np.cos(x*2*np.pi/32)
write('clayroof',[184,117,83],flute*11+noise(10)*6-np.exp(-course/4)*34+fine*2,flute*.9-np.exp(-course/3)*1.6,192)
write('limestone',[219,214,202],noise(5)*2+noise(26)*1.8+fine*1.7,fine*.06,175)
