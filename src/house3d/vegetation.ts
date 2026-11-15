import {BufferGeometry,Float32BufferAttribute,Vector3,Matrix4,Quaternion,Euler,TubeGeometry,CatmullRomCurve3,SphereGeometry,Color} from 'three';
export type TreeKind='coconut'|'rain-tree'|'frangipani';
type Point=[number,number,number];
type Batch={positions:number[];normals:number[];colors:number[]};
const batch=():Batch=>({positions:[],normals:[],colors:[]});
export function seeded(seed:number){return ()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};}
function bake(to:Batch,source:BufferGeometry,matrix:Matrix4,tint:Color){
 const g=source.index?source.toNonIndexed():source,p=g.attributes.position,n=g.attributes.normal,v=new Vector3(),normal=new Vector3();
 for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(matrix);to.positions.push(v.x,v.y,v.z);normal.fromBufferAttribute(n,i).transformDirection(matrix);to.normals.push(normal.x,normal.y,normal.z);to.colors.push(tint.r,tint.g,tint.b);}
 if(g!==source)g.dispose();
}
function finish(b:Batch){const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(b.positions,3));g.setAttribute('normal',new Float32BufferAttribute(b.normals,3));g.setAttribute('color',new Float32BufferAttribute(b.colors,3));g.computeBoundingSphere();return g;}
function leaf(length:number,width:number){
 const g=new BufferGeometry(),p:Point[]=[[0,0,0],[-width/2,length*.46,.035],[0,length,.02],[width/2,length*.46,.035],[0,length*.46,-.035]];
 const vertices=[0,1,4,1,2,4,4,2,3,4,3,0].flatMap(i=>p[i]);g.setAttribute('position',new Float32BufferAttribute(vertices,3));g.computeVertexNormals();return g;
}
function branch(b:Batch,points:Point[],radius:number,tint:Color){
 const g=new TubeGeometry(new CatmullRomCurve3(points.map(p=>new Vector3(...p))),Math.max(3,points.length*3),radius,7,false);bake(b,g,new Matrix4(),tint);g.dispose();
}
/** Botanical meshes are baked once per species, then whole trees are instanced.
 * Leaves have pointed profiles and a folded midrib; no sphere-clump foreground trees. */
export function treeGeometry(kind:TreeKind){
 const bark=batch(),foliage=batch(),random=seeded(kind==='coconut'?71:kind==='rain-tree'?124:811);
 const brown=new Color(kind==='coconut'?'#8a806b':'#706c59');
 const transform=(at:Point,rotation:Point,scale=1)=>new Matrix4().compose(new Vector3(...at),new Quaternion().setFromEuler(new Euler(...rotation)),new Vector3(scale,scale,scale));
 if(kind==='coconut'){
  branch(bark,[[0,0,0],[.25,7,0],[.75,15,.25],[1,23,.6]],.31,brown);
  const blade=leaf(1.75,.15);
  for(let frond=0;frond<14;frond++){
   const angle=frond*2.39996,len=6.7+random()*2,c=Math.cos(angle),s=Math.sin(angle);
   const point=(t:number):Point=>[1+c*len*t,23+2.8*Math.sin(t*2.6)-2*t*t,.6+s*len*t];
   branch(bark,[point(0),point(.33),point(.7),point(1)],.027,new Color('#718243'));
   for(let k=1;k<19;k++)for(const sign of [-1,1]){
    const t=k/20,p=point(t),scale=(.4+Math.sin(t*Math.PI)*.65)*(1+random()*.15);
    const q=new Quaternion().setFromUnitVectors(new Vector3(0,1,0),new Vector3(-s*sign*.85+c*.45,-.35,c*sign*.85+s*.45).normalize());
    const matrix=new Matrix4().compose(new Vector3(...p),q,new Vector3(scale,scale,scale));
    bake(foliage,blade,matrix,new Color('#4f703b').multiplyScalar(.7+random()*.5));
   }
  }
  blade.dispose();
  const fruit=new SphereGeometry(.28,9,6);
  for(let i=0;i<6;i++)bake(bark,fruit,transform([1+Math.cos(i)*.4,22.6-random()*.5,.6+Math.sin(i)*.4],[0,0,0]),new Color('#72804c'));
  fruit.dispose();
 }else{
  const rain=kind==='rain-tree',height=rain?22:12,width=rain?14:10;
  branch(bark,[[0,0,0],[.1,height*.3,.1],[.35,height*.58,0]],rain?.42:.28,brown);
  const tips:Point[]=[];
  for(let j=0;j<(rain?11:7);j++){
   const a=j*2.39996,r=width*(.25+random()*.2),tip:Point=[Math.cos(a)*r,height*(.67+random()*.22),Math.sin(a)*r];
   branch(bark,[[.1,height*.25,.1],[tip[0]*.45,height*.57,tip[2]*.45],tip],rain?.105:.09,brown);
   tips.push(tip);
  }
  const blade=leaf(rain?1.1:1.45,rain?.40:.5),count=rain?2600:900;
  for(let i=0;i<count;i++){
   const tip=tips[i%tips.length],a=random()*Math.PI*2,r=Math.sqrt(random())*(rain?2.6:1.9);
   const p:Point=[tip[0]+Math.cos(a)*r,tip[1]+(random()-.5)*(rain?3.2:2),tip[2]+Math.sin(a)*r];
   bake(foliage,blade,transform(p,[random()*Math.PI*.9,random()*Math.PI*2,(random()-.5)*1.2],.65+random()*.7),new Color(rain?'#3b673b':'#507747').multiplyScalar(.65+random()*.65));
  }
  blade.dispose();
 }
 return {bark:finish(bark),foliage:finish(foliage),height:kind==='coconut'?27:kind==='rain-tree'?23:13,width:kind==='coconut'?17:kind==='rain-tree'?17:13};
}
export function shrubGeometry(){
 const b=batch(),random=seeded(421),blade=leaf(.48,.2);
 for(let i=0;i<260;i++){
  const a=random()*Math.PI*2,r=Math.sqrt(random())*1.1;
  const q=new Quaternion().setFromEuler(new Euler(random()*2,random()*6,(random()-.5)*2));
  bake(b,blade,new Matrix4().compose(new Vector3(Math.cos(a)*r,.3+random()*1.8,Math.sin(a)*r*.6),q,new Vector3(1,1,1)),new Color('#3d6a38').multiplyScalar(.65+random()*.65));
 }
 blade.dispose();return finish(b);
}
