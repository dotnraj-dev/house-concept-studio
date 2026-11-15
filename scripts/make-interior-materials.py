"""Original tile and woven rug maps. No stock photos or external image licensing."""
from pathlib import Path
import numpy as np
from PIL import Image
out=Path(__file__).resolve().parents[1]/'public/assets/materials';out.mkdir(exist_ok=True)
n=1024;y,x=np.mgrid[:n,:n];rng=np.random.default_rng(937)
noise=rng.normal(0,1,(n,n))
def save(name,color,height,rough):
 dx=(np.roll(height,-1,1)-np.roll(height,1,1))*.5;dy=(np.roll(height,-1,0)-np.roll(height,1,0))*.5
 v=np.stack([-dx,dy,np.ones_like(dx)],2);v/=np.linalg.norm(v,axis=2,keepdims=True)
 for kind,data in [('color',np.clip(color,0,255)),('normal',(v*.5+.5)*255),('roughness',np.broadcast_to(rough,(n,n)))]:
  Image.fromarray(np.uint8(np.clip(data,0,255))).save(out/(name+'-'+kind+'.jpg'),quality=92)
# 5 ft repeat with 2 large-format slabs. Thin neutral grout, subtle veining; bathroom floor has a satin anti-slip finish.
grout=(x%512<3)|(y%512<3)
vein=np.exp(-np.abs(np.sin((x+y*.4)/170+np.sin(y/115)*.6))*28)
for name,base,rough in [('porcelain',[229,226,217],61),('bathfloor',[195,198,190],163),('bathwall',[233,232,225],98),('quartz',[223,222,215],63)]:
 g=grout if name!='quartz' else np.zeros_like(grout)
 value=noise*.5-vein*(4 if name=='quartz' else 9)
 color=np.array(base)+value[:,:,None];color[g]=np.array(base)-38
 save(name,color,noise*.015-g*.7,rough+noise*2+g*100)
# Woven carpet with an original warm geometric border; texture uses normalized rug UVs.
weave=(np.sin(x*np.pi)*.8+np.cos(y*np.pi)*.8)+noise*1.7
color=np.broadcast_to(np.array([173.,157.,133.]),(n,n,3)).copy()+weave[:,:,None]
edge=np.minimum.reduce([x,y,n-1-x,n-1-y]);border=(edge>30)&(edge<70)
color[border]=[95,104,96]
motif=(np.abs((x%170)-85)+np.abs((y%170)-85)<45)&(edge>85)
color[motif]+=19
save('rug',color,weave*.24,235+noise*5)
print('Five original interior PBR materials generated.')

