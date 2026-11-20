import {Suspense, useMemo, useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {useTexture} from '@react-three/drei';
import {CanvasTexture, DoubleSide, LatheGeometry, MeshPhysicalMaterial, MeshStandardMaterial, SRGBColorSpace, Vector2, type RectAreaLight} from 'three';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {CEILING_LEVEL, FLOOR_HEIGHT} from '../building-dimensions';
import {fitoutOf} from '../fitout';
import type {Plan, Room} from '../types';
import {Block} from './Surface';
import {LibraryModel} from './Assets';
import {roomFitments} from './fitout-layout';
import {furnishingFrame, type HouseLayout} from './layout';
import {bedroomFurniture, kitchenCounter, livingFurniture} from './furniture';
import {bathroomFixtures} from './bathroom';
import {showerZone} from './interior-layout';

/**
 * Indian interior kit (AGENTS.md §4): false ceilings with cove light, fluted TV wall, pooja mandir details,
 * Tamil Nadu kitchen finishes and bedroom headboard walls. All dimensions in feet. Static pieces are merged by
 * StaticBatcher; lights follow the same visibility rule as the room spot lights.
 */
RectAreaLightUniformsLib.init();

const brass = new MeshStandardMaterial({color: '#b88a3e', metalness: .92, roughness: .24});
const steel = new MeshStandardMaterial({color: '#cfd3d6', metalness: .95, roughness: .18});
const coveGlow = new MeshStandardMaterial({color: '#fff1d6', emissive: '#ffc77a', emissiveIntensity: 2.4, toneMapped: false});
const backGlow = new MeshStandardMaterial({color: '#ffe7bf', emissive: '#ffb85c', emissiveIntensity: 1.6, toneMapped: false});
const downlight = new MeshStandardMaterial({color: '#fffaf0', emissive: '#ffe6bd', emissiveIntensity: 2, toneMapped: false});

type Flags = {interior: boolean; walking: boolean; hideHigh: boolean};

/** Area light gated like RoomLight: cutaway overview, or the camera's floor while walking. */
function GatedAreaLight({floor, interior, walking, ...props}: {floor: number; interior: boolean; walking: boolean; position: [number, number, number]; rotation: [number, number, number]; width: number; height: number; intensity: number; color: string}) {
  const ref = useRef<RectAreaLight>(null);
  useFrame(({camera, invalidate}) => {
    if (!ref.current) return;
    const on = interior && (!walking || Math.floor((camera.position.y + .5) / FLOOR_HEIGHT) === floor);
    if (ref.current.visible !== on) { ref.current.visible = on; invalidate(); }
  });
  return <rectAreaLight ref={ref} visible={false} {...props}/>;
}

/** Gypsum drop around the edges, recessed centre, warm cove strip, downlights. */
function FalseCeiling({room, flags}: {room: Room; flags: Flags}) {
  const base = room.floor * FLOOR_HEIGHT, top = base + CEILING_LEVEL, drop = .55, band = Math.min(1.7, Math.min(room.w, room.h) * .18);
  const cx = room.x + room.w / 2, cz = room.y + room.h / 2, iw = room.w - 2 * band, ih = room.h - 2 * band;
  if (iw < 3 || ih < 3) return null;
  const y = top - drop / 2, lip = .22;
  const sides: [number, number, number, number][] = [
    [cx, room.y + band / 2, room.w, band], [cx, room.y + room.h - band / 2, room.w, band],
    [room.x + band / 2, cz, band, ih], [room.x + room.w - band / 2, cz, band, ih],
  ];
  const lips: [number, number, number, number][] = [[cx, room.y + band - lip / 2, iw + lip * 2, lip], [cx, room.y + room.h - band + lip / 2, iw + lip * 2, lip], [room.x + band - lip / 2, cz, lip, ih], [room.x + room.w - band + lip / 2, cz, lip, ih]];
  const strips: [number, number, number, number][] = [[cx, room.y + band - lip - .05, iw, .06], [cx, room.y + room.h - band + lip + .05, iw, .06], [room.x + band - lip - .05, cz, .06, ih], [room.x + room.w - band + lip + .05, cz, .06, ih]];
  return <group name={`False ceiling · ${room.label}`}>
    {sides.map(([x, z, w, d], i) => <Block key={i} position={[x, y, z]} size={[w, drop, d]} color="#f7f4ec" surface="paint"/>)}
    {/* Upstand lip hides the LED strip; the strip lights the recessed ceiling (cove). */}
    {lips.map(([x, z, w, d], i) => <Block key={'lip' + i} position={[x, top - drop + .14, z]} size={[w, .32, d]} color="#f7f4ec" surface="paint"/>)}
    {strips.map(([x, z, w, d], i) => <mesh key={'led' + i} position={[x, top - drop + .2, z]} material={coveGlow}><boxGeometry args={[w, .04, d]}/></mesh>)}
    {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b], i) =>
      <mesh key={'dl' + i} position={[cx + a * (room.w / 2 - band / 2), top - drop - .005, cz + b * (room.h / 2 - band / 2)]} rotation={[Math.PI / 2, 0, 0]} material={downlight}><circleGeometry args={[.16, 20]}/></mesh>)}
    <GatedAreaLight floor={room.floor} interior={flags.interior} walking={flags.walking} position={[cx, top - drop + .25, cz]} rotation={[Math.PI / 2, 0, 0]} width={iw} height={ih} intensity={2.2} color="#ffd6a0"/>
  </group>;
}

/** Fluted timber TV wall with backlight, behind the existing TV joinery (local furnishing frame). */
function TvFeatureWall({room}: {room: Room}) {
  const base = room.floor * FLOOR_HEIGHT, {tv} = livingFurniture(room);
  const w = Math.min(room.w - 1.2, tv.w + 4.2), h = 8.2, z = room.y + .07, flutes = Math.max(8, Math.round(w / .26));
  return <group name="Fluted TV feature wall">
    <Block position={[tv.x, base + h / 2 + .3, z]} size={[w, h, .1]} color="#5b4231" surface="timber"/>
    {Array.from({length: flutes}, (_, i) => <Block key={i} position={[tv.x - w / 2 + (i + .5) * (w / flutes), base + h / 2 + .3, z + .09]} size={[w / flutes * .62, h - .3, .08]} color="#a47a52" surface="timber"/>)}
    <mesh position={[tv.x, base + h + .38, z + .07]} material={backGlow}><boxGeometry args={[w - .4, .05, .05]}/></mesh>
    <LibraryModel file="decor/brass_vase_01.glb" position={[tv.x + Math.min(2.3, w / 2 - .6), base + 2.3, room.y + .9]} size={[.55, 1.1, .55]} solid={false}/>
  </group>;
}

/** Upholstered padded headboard wall with a timber frame and a warm backlight. */
function HeadboardWall({room}: {room: Room}) {
  const base = room.floor * FLOOR_HEIGHT, bed = bedroomFurniture(room), w = Math.min(room.w - .8, bed.w + 3.4), z = room.y + .06;
  const cols = Math.max(3, Math.round(w / 1.3)), rows = 3, pw = w / cols, ph = 3.3 / rows;
  return <group name="Bedroom headboard wall">
    <Block position={[bed.x, base + 2.3, z]} size={[w + .3, 4.6, .12]} color="#6d4f39" surface="timber"/>
    {Array.from({length: cols * rows}, (_, i) => {const c = i % cols, r = Math.floor(i / cols);
      return <Block key={i} position={[bed.x - w / 2 + (c + .5) * pw, base + 1.05 + (r + .5) * ph, z + .13]} size={[pw - .07, ph - .07, .16]} color="#c9b8a2" surface="fabric"/>;})}
    <mesh position={[bed.x, base + 4.62, z + .12]} material={backGlow}><boxGeometry args={[w, .05, .05]}/></mesh>
  </group>;
}

/** 2 ft dado tiles above the counter and steel vessels on the hob (local frame). The counter itself is in HouseScene. */
function TnKitchenFinish({room}: {room: Room}) {
  const base = room.floor * FLOOR_HEIGHT, q = kitchenCounter(room);
  const pot = useMemo(() => new LatheGeometry([[0, 0], [.42, 0], [.46, .05], [.46, .5], [.5, .55], [.44, .58]].map(([x, y]) => new Vector2(x, y)), 28), []);
  const kadai = useMemo(() => new LatheGeometry([[0, 0], [.2, .02], [.42, .12], [.55, .3], [.57, .34]].map(([x, y]) => new Vector2(x, y)), 28), []);
  return <group name="Tamil Nadu kitchen finish">
    <Block position={[q.x, base + 4.1, room.y + room.h - .03]} size={[q.w, 2, .04]} color="#ece6d9" surface="tile"/>
    <mesh geometry={pot} material={steel} position={[q.hobX - .45, base + 3.14, q.z]} castShadow/>
    <mesh geometry={kadai} material={steel} position={[q.hobX + .5, base + 3.14, q.z]} castShadow/>
  </group>;
}

function kolamTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const x = c.getContext('2d')!;
  x.strokeStyle = '#fbf8f0'; x.fillStyle = '#fbf8f0'; x.lineWidth = 7; x.lineCap = 'round';
  const n = 5, s = 512 / (n + 1);
  for (let i = 1; i <= n; i++) for (let j = 1; j <= n; j++) { x.beginPath(); x.arc(i * s, j * s, 6, 0, Math.PI * 2); x.fill(); }
  for (let i = 1; i < n; i++) for (let j = 1; j < n; j++) { x.beginPath(); x.arc((i + .5) * s, (j + .5) * s, s * .5, 0, Math.PI * 2); x.stroke(); }
  x.beginPath(); x.arc(256, 256, s * 2.6, 0, Math.PI * 2); x.stroke();
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; t.anisotropy = 8; return t;
}

/** Turned brass kuthuvilakku: base, ringed stem, five-wick bowl, finial (AGENTS.md pooja reference). */
export function Kuthuvilakku({height = 2.2}: {height?: number}) {
  const geometry = useMemo(() => new LatheGeometry([
    [0, 0], [.42, 0], [.44, .06], [.3, .14], [.16, .2], [.12, .28], [.16, .32], [.1, .4], [.08, 1.05], [.13, 1.1], [.08, 1.15], [.08, 1.45],
    [.15, 1.5], [.42, 1.56], [.46, 1.63], [.4, 1.66], [.12, 1.7], [.07, 1.82], [.12, 1.9], [.06, 2.02], [.1, 2.08], [0, 2.2],
  ].map(([r, y]) => new Vector2(r * height / 2.2, y * height / 2.2)), 40), [height]);
  return <group name="Kuthuvilakku">
    <mesh geometry={geometry} material={brass} castShadow/>
    {Array.from({length: 5}, (_, i) => {const a = i / 5 * Math.PI * 2, r = .43 * height / 2.2;
      return <mesh key={i} position={[Math.cos(a) * r, 1.7 * height / 2.2, Math.sin(a) * r]} material={backGlow}><sphereGeometry args={[.035, 8, 8]}/></mesh>;})}
  </group>;
}

/** Gopuram-style crown, backlit jaali, kolam and lamps around the customer's prayer cabinet (Hindu option only). */
function PoojaDetails({plan, room, layout}: {plan: Plan; room: Room; layout: HouseLayout}) {
  const jaali = useTexture('/assets/materials/jaali-flower.png');
  const kolam = useMemo(kolamTexture, []);
  const f = roomFitments(plan, room, layout).find(item => item.kind === 'prayer');
  if (!f) return null;
  const base = room.floor * FLOOR_HEIGHT, w = f.width, d = f.depth;
  return <group name="Pooja mandir details" position={[f.x, base + f.bottom, f.z]} rotation={[0, f.angle, 0]}>
    {[0, 1, 2].map(i => <Block key={i} position={[0, f.height + .12 + i * .24, -d / 2 + d * .45]} size={[w * (.95 - i * .22), .24, d * (.8 - i * .15)]} color="#8a5a31" surface="timber"/>)}
    <mesh position={[0, f.height + .95, -d / 2 + d * .45]} material={brass} castShadow><coneGeometry args={[.16, .42, 20]}/></mesh>
    <mesh position={[0, f.height * .62, -d / 2 + .06]} material={backGlow}><planeGeometry args={[w * .7, f.height * .42]}/></mesh>
    <mesh position={[0, f.height * .62, -d / 2 + .1]}><planeGeometry args={[w * .74, f.height * .46]}/><meshStandardMaterial map={jaali} alphaMap={jaali} alphaTest={.5} color="#f3ead8" side={DoubleSide} roughness={.6}/></mesh>
    {[-1, 1].map(s => <group key={s} position={[s * (w / 2 + .45), -f.bottom, d / 2 - .15]}><Kuthuvilakku/></group>)}
    <mesh position={[0, -f.bottom + .03, d / 2 + 1.35]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2.2, 2.2]}/><meshStandardMaterial map={kolam} transparent depthWrite={false} roughness={.9}/></mesh>
    <LibraryModel file="pooja/brass_diya_lantern.glb" position={[w * .3, f.height * .53 + .05, 0]} size={[.45, .7, .45]} solid={false}/>
    <LibraryModel file="pooja/brass_pot_01.glb" position={[-w * .3, f.height * .53 + .05, 0]} size={[.4, .45, .4]} solid={false}/>
  </group>;
}


const showerGlass = new MeshPhysicalMaterial({color: '#e8f2f1', metalness: 0, roughness: .04, transmission: .92, thickness: .08, transparent: true, opacity: .32, side: DoubleSide});
const hoodGlass = new MeshPhysicalMaterial({color: '#141618', metalness: .3, roughness: .06, clearcoat: 1, clearcoatRoughness: .03});

/** Wet/dry separation: frameless glass panel with a kerb at the open side of the shower; vanity mirror LED bar. */
function BathroomKit({room, layout}: {room: Room; layout: HouseLayout}) {
  const base = room.floor * FLOOR_HEIGHT, s = showerZone(room, layout);
  const basin = bathroomFixtures(room, layout).find(f => f.kind === 'basin');
  return <group name={`Bathroom kit · ${room.label}`}>
    {s && <group position={[s.x, base + .08, s.z]} rotation={[0, s.angle, 0]}>
      <Block position={[0, .06, s.depth / 2 - .05]} size={[s.width, .12, .1]} color="#d9d6cf" surface="stone"/>
      <mesh position={[-s.width * .18, 3.25, s.depth / 2 - .05]} material={showerGlass}><boxGeometry args={[s.width * .64, 6.3, .03]}/></mesh>
      <mesh position={[s.width * .14 + .02, 3.25, s.depth / 2 - .05]} material={steel}><boxGeometry args={[.03, 6.3, .05]}/></mesh>
    </group>}
    {basin && <group position={[basin.x, base + .08, basin.z]} rotation={[0, basin.angle, 0]}>
      <mesh position={[0, 5.78, -basin.depth / 2 + .26]} material={downlight}><boxGeometry args={[1.5, .06, .06]}/></mesh>
    </group>}
  </group>;
}

/** Modern slanted black-glass chimney hood with a brushed-steel duct (replaces the low-poly kit hood). Wall side is +Z. */
export function ModernHood({size}: {size: [number, number, number]}) {
  const [w, h, d] = size, canopy = .38;
  return <group name="Kitchen chimney hood">
    <mesh position={[0, canopy / 2, 0]} material={steel} castShadow><boxGeometry args={[w, canopy, d]}/></mesh>
    <mesh position={[0, canopy + .32, -d * .12]} rotation={[.55, 0, 0]} material={hoodGlass} castShadow><boxGeometry args={[w * .96, .78, .04]}/></mesh>
    <mesh position={[0, canopy + (h - canopy) / 2, d * .2]} material={steel} castShadow><boxGeometry args={[w * .34, h - canopy, d * .5]}/></mesh>
    <mesh position={[w * .32, canopy - .02, -d / 2 - .005]} material={downlight}><boxGeometry args={[.22, .04, .02]}/></mesh>
  </group>;
}

/** One hook per room from HouseScene; frame-based pieces use the same furnishing frame as Furniture. */
export function InteriorKit({plan, room, layout, interior, walking, hideHigh}: {plan: Plan; room: Room; layout: HouseLayout} & Flags) {
  const flags = {interior, walking, hideHigh};
  const furnished = plan.design?.furnished !== false;
  const masterBedroom = useMemo(() => plan.rooms.filter(r => r.kind === 'bedroom').sort((a, b) => b.w * b.h - a.w * a.h)[0]?.id, [plan.rooms]);
  const frame = furnishingFrame(plan, room);
  const local = frame.local;
  const ceiling = !hideHigh && (['living', 'lounge', 'dining'].includes(room.kind) || room.id === masterBedroom);
  const hindu = fitoutOf(plan.design).faith === 'hindu';
  return <group name={`Interior kit · ${room.label}`}>
    {ceiling && <FalseCeiling room={room} flags={flags}/>}
    {room.kind === 'bathroom' && <BathroomKit room={room} layout={layout}/>}
    {room.kind === 'pooja' && hindu && <Suspense fallback={null}><PoojaDetails plan={plan} room={room} layout={layout}/></Suspense>}
    <group position={[room.x + room.w / 2, 0, room.y + room.h / 2]} rotation={[0, frame.angle, 0]}>
      {furnished && (room.kind === 'living' || room.kind === 'lounge') && <TvFeatureWall room={local}/>}
      {furnished && room.kind === 'bedroom' && <HeadboardWall room={local}/>}
      {room.kind === 'kitchen' && <TnKitchenFinish room={local}/>}
    </group>
  </group>;
}
