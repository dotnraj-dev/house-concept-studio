import assert from 'node:assert/strict';
import test from 'node:test';
import {Box3,Group,Mesh,BoxGeometry,MeshBasicMaterial,Vector3} from 'three';
import {collectObstacles,obstacleBlocks,type Body} from './obstacles';

const body:Body={x:0,z:0,bottom:0,height:5.6,radius:.6};
test('movement blocks solid furniture, permits clear routes and supports jumping over low objects',()=>{
  const table=new Box3(new Vector3(2,0,-1),new Vector3(4,2,1));
  assert.equal(obstacleBlocks([table],body,{...body,x:1.8}),true);
  assert.equal(obstacleBlocks([table],body,{...body,x:1}),false);
  assert.equal(obstacleBlocks([table],body,{...body,x:3,bottom:2.1}),false);
});
test('seated viewpoints can exit furniture without passing deeper through it',()=>{
  const sofa=new Box3(new Vector3(-3,0,-1.5),new Vector3(3,2.7,1.5)),seated={...body,z:-.25};
  assert.equal(obstacleBlocks([sofa],seated,{...seated,z:-.5}),false);
  assert.equal(obstacleBlocks([sofa],seated,{...seated,z:0}),true);
});
test('obstacles use rendered world dimensions and ignore scene interaction markers',()=>{
  const root=new Group();root.position.set(-10,9,-20);
  const solid=new Group();solid.position.x=5;solid.rotation.y=Math.PI/2;solid.userData.solid=true;
  solid.add(new Mesh(new BoxGeometry(6,3,2),new MeshBasicMaterial()));root.add(solid);
  const marker=new Mesh(new BoxGeometry(100,100,100),new MeshBasicMaterial());marker.userData.interactionId='seat';root.add(marker);
  const boxes=collectObstacles(root);assert.equal(boxes.length,1);
  assert.ok(Math.abs(boxes[0].min.x+6)<1e-6);assert.ok(Math.abs(boxes[0].max.z+17)<1e-6);
});
