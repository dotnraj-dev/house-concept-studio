import {useEffect, useRef} from 'react';
import {useFrame, useThree} from '@react-three/fiber';
import type {Group, Mesh} from 'three';
import {BATCHED_LAYER, buildBatches, collectCandidates, disposeBatches, matrixKey, membershipFingerprint} from './static-batch';

type State = {
  group: Group | null;
  originals: Map<Mesh, number>;
  lastMatrix: WeakMap<Mesh, string>;
  moves: WeakMap<Mesh, number>;
  fingerprint: string;
  pending: string;
  frame: number;
};

/**
 * Merges static, opaque architecture/furniture under the HouseExport root into a few meshes per material.
 * Originals move to BATCHED_LAYER (not drawn, still collide/raycast/export). Meshes seen moving in two
 * checks are animated (fans, shelf doors, sliding wardrobes) and stay unmerged; a single move (a plan edit)
 * just rebuilds. Membership, material, visibility or shadow changes also rebuild.
 */
export function StaticBatcher({enabled = true, rootName = 'HouseExport'}: {enabled?: boolean; rootName?: string}) {
  const {scene, raycaster, invalidate} = useThree();
  const state = useRef<State>({group: null, originals: new Map(), lastMatrix: new WeakMap(), moves: new WeakMap(), fingerprint: '', pending: '', frame: 0});

  const restore = () => {
    const s = state.current;
    for (const [mesh, mask] of s.originals) mesh.layers.mask = mask;
    s.originals.clear();
    disposeBatches(s.group);
    s.group = null;
    s.fingerprint = '';
  };

  useEffect(() => {
    raycaster.layers.enable(BATCHED_LAYER);
    return () => { restore(); };
  }, [raycaster]);

  useEffect(() => { if (!enabled) { restore(); invalidate(); } }, [enabled]);

  useFrame(() => {
    const s = state.current;
    if (!enabled || ++s.frame % 10) return;
    const root = scene.getObjectByName(rootName);
    if (!root) return;
    let candidates = collectCandidates(root);
    let movedBatched = false;
    for (const {mesh} of candidates) {
      const key = matrixKey(mesh), last = s.lastMatrix.get(mesh);
      s.lastMatrix.set(mesh, key);
      if (last === undefined || last === key) continue;
      const moves = (s.moves.get(mesh) ?? 0) + 1;
      s.moves.set(mesh, moves);
      if (moves >= 2) mesh.userData.dynamic = true;
      if (s.originals.has(mesh)) movedBatched = true;
    }
    candidates = candidates.filter(c => !c.mesh.userData.dynamic);
    const fingerprint = membershipFingerprint(candidates);
    if (!movedBatched && fingerprint === s.fingerprint) return;
    // Rebuild once the membership is stable for two checks (Suspense loading, React updates).
    if (!movedBatched && fingerprint !== s.pending) { s.pending = fingerprint; invalidate(); return; }
    restore();
    const result = buildBatches(candidates);
    for (const mesh of result.batched) {
      s.originals.set(mesh, mesh.layers.mask);
      mesh.layers.set(BATCHED_LAYER);
    }
    scene.add(result.group);
    s.group = result.group;
    s.fingerprint = s.pending = fingerprint;
    invalidate();
  });
  return null;
}
