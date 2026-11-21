import test from 'node:test';
import assert from 'node:assert/strict';
import {fitPlan,zoomAt,fitBounds,panBy} from './plan-navigation';
test('cursor point stays under cursor when zooming',()=>{
 const view=fitPlan(40,60),cursor={x:12,y:25},next=zoomAt(view,cursor,2);
 assert.equal((cursor.x-next.x)/next.w,(cursor.x-view.x)/view.w);
 assert.equal((cursor.y-next.y)/next.h,(cursor.y-view.y)/view.h);
 assert.deepEqual(zoomAt(next,cursor,.5),view);
});
test('fit bounds includes room with padding and viewport aspect',()=>{
 const view=fitBounds(10,15,12,10,2);
 assert.equal(view.w/view.h,2);
 assert.ok(view.x<10&&view.y<15&&view.x+view.w>22&&view.y+view.h>25);
 assert.equal(panBy(view,3,-2).x,view.x+3);
});
