import {BufferGeometry, Group, Matrix4, Mesh, type Material, type Object3D, type Texture} from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/** Originals of merged meshes live on this layer: hidden from cameras and shadow cameras,
 * but still present for collision (obstacles.ts), raycast picking and GLB export. */
export const BATCHED_LAYER = 31;

const MAPS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'alphaMap', 'bumpMap', 'clearcoatNormalMap'] as const;
const SCALARS = ['roughness', 'metalness', 'opacity', 'emissiveIntensity', 'clearcoat', 'clearcoatRoughness', 'envMapIntensity', 'alphaTest', 'side', 'transmission', 'ior', 'sheen', 'bumpScale', 'aoMapIntensity'] as const;
const FLAGS = ['transparent', 'depthWrite', 'depthTest', 'flatShading', 'vertexColors', 'wireframe', 'toneMapped', 'fog'] as const;

function textureKey(t: Texture | null | undefined): string {
  if (!t) return '-';
  return [t.source?.uuid ?? t.uuid, t.repeat.x, t.repeat.y, t.offset.x, t.offset.y, t.rotation, t.center.x, t.center.y, t.wrapS, t.wrapT, t.colorSpace, t.channel, t.flipY].join(',');
}

/** Two materials with the same signature render identically, so meshes using them can share one draw call. */
export function materialSignature(material: Material): string | null {
  const m = material as Material & Record<string, any>;
  if (m.isShaderMaterial || m.isRawShaderMaterial || m.userData?.noBatch) return null;
  const parts: (string | number | boolean)[] = [m.type];
  if (m.color) parts.push(m.color.getHexString());
  if (m.emissive) parts.push(m.emissive.getHexString());
  if (m.normalScale) parts.push(m.normalScale.x, m.normalScale.y);
  for (const k of SCALARS) parts.push(m[k] ?? '');
  for (const k of FLAGS) parts.push(m[k] ? 1 : 0);
  for (const k of MAPS) parts.push(textureKey(m[k]));
  if (m.defines && Object.keys(m.defines).length) parts.push(JSON.stringify(m.defines));
  return parts.join('|');
}

function effectivelyVisible(o: Object3D): boolean {
  for (let q: Object3D | null = o; q; q = q.parent) if (!q.visible) return false;
  return true;
}

function dynamicAncestor(o: Object3D, root: Object3D): boolean {
  for (let q: Object3D | null = o; q && q !== root.parent; q = q.parent) {
    const u = q.userData;
    if (u.actionId || u.interactionId || u.runtimeOnly || u.dynamic || u.noBatch) return true;
  }
  return false;
}

export type Candidate = {mesh: Mesh; materialKey: string};

/** Static, opaque, single-material meshes under root that are safe to merge. */
export function collectCandidates(root: Object3D): Candidate[] {
  const out: Candidate[] = [];
  root.traverse(o => {
    const mesh = o as Mesh;
    if (!mesh.isMesh || (mesh as any).isInstancedMesh || (mesh as any).isSkinnedMesh || mesh.userData.staticBatchCopy) return;
    if (Array.isArray(mesh.material) || !mesh.geometry?.attributes?.position) return;
    // Geometry groups (e.g. BoxGeometry's six faces) only matter for multi-material meshes, excluded above.
    if (mesh.morphTargetInfluences?.length) return;
    const material = mesh.material as Material;
    if (material.transparent || (material as any).opacity < 1) return;
    if (!effectivelyVisible(mesh) || dynamicAncestor(mesh, root)) return;
    const key = materialSignature(material);
    if (key) out.push({mesh, materialKey: key});
  });
  return out;
}

function geometryKey(g: BufferGeometry): string {
  return `${g.index ? 'i' : 'n'}:${Object.keys(g.attributes).sort().map(k => `${k}${g.attributes[k].itemSize}`).join(',')}`;
}

/** Fingerprint of everything that would change the batches: membership, materials, shadows, transforms. */
export function sceneFingerprint(candidates: Candidate[]): string {
  const parts: string[] = [];
  for (const {mesh, materialKey} of candidates) {
    const e = mesh.matrixWorld.elements;
    parts.push(`${mesh.uuid}:${mesh.geometry.uuid}:${mesh.castShadow ? 1 : 0}${mesh.receiveShadow ? 1 : 0}:${materialKey}:${e[0].toFixed(4)},${e[2].toFixed(4)},${e[5].toFixed(4)},${e[12].toFixed(3)},${e[13].toFixed(3)},${e[14].toFixed(3)}`);
  }
  return parts.join(';');
}

/** Like sceneFingerprint but without transforms: membership, materials, shadows and geometry only. */
export function membershipFingerprint(candidates: Candidate[]): string {
  return candidates.map(({mesh, materialKey}) => `${mesh.uuid}:${mesh.geometry.uuid}:${mesh.castShadow ? 1 : 0}${mesh.receiveShadow ? 1 : 0}:${materialKey}`).join(';');
}

export function matrixKey(mesh: Mesh): string { return mesh.matrixWorld.elements.map(v => v.toFixed(4)).join(','); }

export type BatchResult ={group: Group; batched: Mesh[]; drawCalls: number};

/** Merge candidates per (material, shadow flags, geometry layout) into world-space meshes. */
export function buildBatches(candidates: Candidate[], minPerBatch = 2): BatchResult {
  const groups = new Map<string, Candidate[]>();
  for (const c of candidates) {
    const key = `${c.materialKey}#${c.mesh.castShadow ? 1 : 0}${c.mesh.receiveShadow ? 1 : 0}#${geometryKey(c.mesh.geometry)}`;
    const list = groups.get(key);
    if (list) list.push(c); else groups.set(key, [c]);
  }
  const group = new Group();
  group.name = 'Static batches (runtime only)';
  group.userData.runtimeOnly = true;
  const batched: Mesh[] = [];
  const m = new Matrix4();
  for (const list of groups.values()) {
    if (list.length < minPerBatch) continue;
    const geometries = list.map(({mesh}) => {
      const g = mesh.geometry.clone();
      m.copy(mesh.matrixWorld);
      g.applyMatrix4(m);
      return g;
    });
    const merged = mergeGeometries(geometries, false);
    geometries.forEach(g => g.dispose());
    if (!merged) continue;
    merged.computeBoundingSphere();
    merged.computeBoundingBox();
    const first = list[0].mesh;
    const mesh = new Mesh(merged, first.material as Material);
    mesh.castShadow = first.castShadow;
    mesh.receiveShadow = first.receiveShadow;
    mesh.matrixAutoUpdate = false;
    mesh.userData.staticBatchCopy = true;
    mesh.userData.runtimeOnly = true;
    mesh.raycast = () => {};
    group.add(mesh);
    batched.push(...list.map(c => c.mesh));
  }
  group.updateMatrixWorld(true);
  return {group, batched, drawCalls: group.children.length};
}

export function disposeBatches(group: Group | null) {
  group?.traverse(o => { if ((o as Mesh).isMesh) (o as Mesh).geometry.dispose(); });
  group?.removeFromParent();
}
