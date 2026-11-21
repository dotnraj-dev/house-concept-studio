import {useMemo} from 'react';
import {ExtrudeGeometry, MeshPhysicalMaterial, MeshStandardMaterial, Shape} from 'three';

/** Procedural modern Indian hatchback (no realistic CC0 car exists in the asset library). Units: feet; front faces -Z. */
const LENGTH = 12.6, WIDTH = 5.5, BEVEL = .22;

function profile(points: [number, number][]) {
  const shape = new Shape();
  points.forEach(([z, y], i) => (i ? shape.lineTo(z, y) : shape.moveTo(z, y)));
  shape.closePath();
  return shape;
}

// Side profile (length coordinate, height); negative = front.
const arch = (center: number): [number, number][] => Array.from({length: 17}, (_, i) => {
  const dz = 1.18 - i * 2.36 / 16;
  return [center + dz, 1.05 + Math.sqrt(Math.max(0, 1.18 ** 2 - dz ** 2))];
});
const BODY: [number, number][] = [[-6.15, 1.05], [-6.3, 2.05], [-6.05, 2.6], [-4.6, 2.95], [-2.55, 3.15], [-.95, 4.55], [.2, 4.78], [3.7, 4.72], [5.55, 3.95], [6.15, 3.1], [6.2, 1.05], [4.93, 1.05], ...arch(3.75), [-2.77, 1.05], ...arch(-3.95), [-6.15, 1.05]];
const GLASS: [number, number][] = [[-2.38, 3.2], [-.9, 4.48], [.25, 4.66], [3.6, 4.6], [5.38, 3.9], [5.7, 3.25]];

const paint = new MeshPhysicalMaterial({color: '#c6cbcc', metalness: .52, roughness: .27, clearcoat: 1, clearcoatRoughness: .1});
const glass = new MeshPhysicalMaterial({color: '#263840', metalness: .12, roughness: .07, clearcoat: 1, clearcoatRoughness: .04});
const tyre = new MeshStandardMaterial({color: '#1b1c1e', roughness: .92});
const rim = new MeshStandardMaterial({color: '#b9bcc0', metalness: .85, roughness: .28});
const trim = new MeshStandardMaterial({color: '#202326', roughness: .55});
const head = new MeshStandardMaterial({color: '#f4f2ea', emissive: '#fff6df', emissiveIntensity: .25, roughness: .2});
const tail = new MeshStandardMaterial({color: '#7a1012', emissive: '#a3191b', emissiveIntensity: .2, roughness: .3});
const chrome = new MeshStandardMaterial({color: '#b6bdbe', metalness: .85, roughness: .26});
const plate = new MeshStandardMaterial({color: '#ecece3', roughness: .7});

export function CarModel({size}: {size: [number, number, number]}) {
  const [body, cabin] = useMemo(() => {
    const extrude = (pts: [number, number][], depth: number, bevel: number) => {
      const g = new ExtrudeGeometry(profile(pts), {depth, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 4, curveSegments: 6});
      g.translate(0, 0, -depth / 2);
      g.rotateY(-Math.PI / 2); // profile x (length) -> scene z, extrusion (width) -> scene x
      return g;
    };
    return [extrude(BODY, WIDTH - 2 * BEVEL, BEVEL), extrude(GLASS, WIDTH - .2, .14)];
  }, []);
  const outer = {x: WIDTH + .1, y: 4.78 + BEVEL, z: LENGTH + .5};
  const scale = Math.min(size[0] / outer.x, size[1] / outer.y, size[2] / outer.z);
  const wheels: [number, number][] = [[-1, -3.95], [1, -3.95], [-1, 3.75], [1, 3.75]];
  return <group scale={scale} userData={{label: 'Hatchback'}}>
    <mesh geometry={body} material={paint} castShadow receiveShadow/>
    <mesh geometry={cabin} material={glass} castShadow/>
    {wheels.map(([side, z]) => <group key={`${side}${z}`} position={[side * (WIDTH / 2 - .32), 1.05, z]} rotation={[0, 0, Math.PI / 2]}>
      <mesh material={tyre} castShadow><cylinderGeometry args={[1.05, 1.05, .72, 28]}/></mesh>
      <mesh material={rim} position={[0, -side * .37, 0]}><cylinderGeometry args={[.62, .62, .04, 24]}/></mesh>
      {Array.from({length: 6}, (_, i) => <mesh key={i} material={chrome} position={[0, -side * .402, 0]} rotation={[0, i * Math.PI / 3, 0]}><boxGeometry args={[.12, .018, 1.05]}/></mesh>)}
      <mesh material={trim} position={[0,-side*.42,0]}><cylinderGeometry args={[.18,.18,.04,20]}/></mesh>
    </group>)}
    {[-1, 1].map(side => <group key={side}>
      <mesh material={head} position={[side * 1.8, 2.48, -6.34]} rotation={[0,side*.12,0]}><boxGeometry args={[1.27, .42, .12]}/></mesh>
      <mesh material={tail} position={[side * 2.05, 2.55, 6.29]}><boxGeometry args={[.86, .48, .1]}/></mesh>
      <mesh material={trim} position={[side * (WIDTH / 2 + .1), 3.55, -2.05]}><sphereGeometry args={[.34,12,8]}/></mesh>
      <mesh material={chrome} position={[side * (WIDTH / 2 + .015), 2.7, side < 0 ? -1.05 : 1.2]}><boxGeometry args={[.03,.055,.48]}/></mesh>
      <mesh material={trim} position={[side * (WIDTH / 2 + .015), 2.74, .2]}><boxGeometry args={[.03,2.45,.045]}/></mesh>
      <mesh material={trim} position={[side * (WIDTH / 2 + .015), 3.6, -.93]} rotation={[side*.27,0,0]}><boxGeometry args={[.03,1.95,.045]}/></mesh>
    </group>)}
    <mesh material={trim} position={[0, 1.42, -6.35]}><boxGeometry args={[4.9, .36, .14]}/></mesh>
    <mesh material={trim} position={[0, 2.12, -6.36]}><boxGeometry args={[3.05, .37, .12]}/></mesh>
    {[-.12,0,.12].map(y=><mesh key={y} material={chrome} position={[0,2.12+y,-6.43]}><boxGeometry args={[2.85,.025,.025]}/></mesh>)}
    <mesh material={plate} position={[0, 1.6, -6.44]}><boxGeometry args={[1.25,.31,.025]}/></mesh>
    <mesh material={chrome} position={[0, 2.58, -6.45]}><circleGeometry args={[.12,16]}/></mesh>
    <mesh material={trim} position={[0, 1.4, 6.32]}><boxGeometry args={[4.9, .35, .14]}/></mesh>
  </group>;
}
