// Turns validated command actions into editor changes, using exactly the functions behind the 2D tools.
// The result is a preview (new PlanEdits plus a readable change list); the caller applies it on "Apply".
import type {Plan, Room, RoomKind, TerraceOptions} from '../types';
import {terraceChecks, terraceLevel, terraceOptions} from '../terrace';
import type {WindowSpec} from '../house3d/layout';
import {makeHouseLayout} from '../house3d/layout';
import {furnitureObjects} from '../house3d/furniture-objects';
import {INTERIOR_OPTIONS} from '../interior-options';
import {
  addObject, addRoom, addWindow, applyPlanEdits, attachBathroom, changeKind, detachBathroom, moveObject, moveRoom, removeObject,
  removeRoom, removeWindow, renameRoom, resizeRoom, resizeWindow, rotateObject, setFloor, setRoomInterior, snap,
  type EditorObject, type PlanEdits,
} from '../editor-model';
import type {CommandAction, CommandContext, CommandResult} from './command-schema';

type Direction = 'north' | 'south' | 'east' | 'west';
export type ViewRequest = Extract<CommandAction, {op: 'view'}>;
export type Preview = {edits: PlanEdits; changes: string[]; views: ViewRequest[]; touched: string[]; newIssues: string[]; terrace?: Partial<TerraceOptions>};
const STAIR_WORDS = {internal: 'inside the house', front: 'outside at the front', side: 'outside on the side', rear: 'outside at the rear'} as const;
export class Ambiguous extends Error {
  constructor(public ref: string, public choices: string[]) { super(`“${ref}” matches ${choices.length} items.`); }
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const SELF = new Set(['this', 'it', 'selected', 'this room', 'selected room', 'here', 'current room']);
const KIND_WORDS: Record<string, RoomKind> = {hall: 'living', 'living room': 'living', living: 'living', sitting: 'living', drawing: 'living', bed: 'bedroom', 'bed room': 'bedroom', bath: 'bathroom', washroom: 'bathroom', restroom: 'bathroom', wc: 'toilet', puja: 'pooja', 'pooja room': 'pooja', prayer: 'pooja', mandir: 'pooja', samayal: 'kitchen', storeroom: 'store', office: 'study'};

export function sideOfWindow(w: WindowSpec): Direction {return w.outward[0] < 0 ? 'west' : w.outward[0] > 0 ? 'east' : w.outward[1] < 0 ? 'north' : 'south';}

/** Furniture currently in the plan: generated pieces with editor overrides, minus removed ones, plus added ones. */
export function planObjects(plan: Plan): EditorObject[] {
  const data = plan.editor?.data.objects || {}, seen = new Set<string>(), out: EditorObject[] = [];
  for (const room of plan.rooms) for (const o of furnitureObjects(plan, room)) {
    seen.add(o.id); const v = data[o.id];
    if (v !== null) out.push(v || o);
  }
  for (const [id, v] of Object.entries(data)) if (v && !seen.has(id) && v.kind !== 'service') out.push(v);
  return out;
}

export function buildCommandContext(plan: Plan, selection: string | null, floor: number): CommandContext {
  const layout = makeHouseLayout(plan), label = new Map(plan.rooms.map(r => [r.id, r.label]));
  return {
    selection, floor, levels: plan.levels || 1, footprint: {width: plan.width, depth: plan.depth}, vastu: plan.design?.vastuMode,
    rooms: plan.rooms.slice(0, 120).map(r => ({id: r.id, label: r.label, kind: r.kind, floor: r.floor, x: +r.x.toFixed(2), y: +r.y.toFixed(2), w: +r.w.toFixed(2), h: +r.h.toFixed(2), ...(r.attachedTo ? {attachedTo: r.attachedTo} : {})})),
    windows: layout.windows.slice(0, 300).map(w => ({id: w.id, room: label.get(w.roomId) || w.roomId, side: sideOfWindow(w), width: +w.width.toFixed(2)})),
    objects: planObjects(plan).slice(0, 300).map(o => ({id: o.id, label: o.label, room: label.get(o.roomId) || o.roomId})),
    terrace: (({stairLocation, stairType, tankMount, tankCapacity, independentFloors}) => ({stairLocation, stairType, tankMount, tankCapacity, independentFloors}))(terraceOptions(plan)),
  };
}

/** Finds one room by id, name, number or type. Several matches raise Ambiguous so the user can choose. */
export function resolveRoom(plan: Plan, ref: string, selection: string | null, floor: number, kinds?: RoomKind[]): Room {
  const q = norm(ref), pool = kinds ? plan.rooms.filter(r => kinds.includes(r.kind)) : plan.rooms;
  if (SELF.has(q)) {
    const r = plan.rooms.find(r => r.id === selection);
    if (r) return r;
    throw new Error('Select a room first, or name the room in the command.');
  }
  const byId = plan.rooms.find(r => r.id === ref);
  if (byId) return byId;
  const exact = pool.filter(r => norm(r.label) === q);
  if (exact.length === 1) return exact[0];
  const words = q.replace(/\b(the|a|an)\b/g, ' ').replace(/\s+/g, ' ').trim(), bare = words.replace(/\broom\b/g, '').trim();
  const kind = (KIND_WORDS[words] || KIND_WORDS[bare] || (pool.some(r => r.kind === bare) ? bare : undefined)) as RoomKind | undefined;
  let found = words.length > 1 ? pool.filter(r => norm(r.label).includes(words)) : [];
  if (!found.length && kind) found = pool.filter(r => r.kind === kind);
  if (!found.length) {
    const tokens = bare.split(' ').filter(t => t.length > 1);
    found = pool.filter(r => tokens.length > 0 && tokens.every(t => norm(r.label).includes(t) || r.kind.includes(t)));
  }
  if (found.length > 1) {
    const here = found.filter(r => r.floor === floor);
    if (here.length === 1) return here[0];
    const sel = found.find(r => r.id === selection);
    if (sel) return sel;
    throw new Ambiguous(ref, found.map(r => r.label));
  }
  if (!found.length) throw new Error(`There is no room called “${ref}” in this plan.`);
  return found[0];
}

function resolveObject(plan: Plan, ref: string, selection: string | null, floor: number): EditorObject {
  const all = planObjects(plan), q = norm(ref).replace(/\b(the|a|an)\b/g, ' ').replace(/\s+/g, ' ').trim();
  const byId = all.find(o => o.id === ref || (SELF.has(q) && o.id === selection));
  if (byId) return byId;
  let found = all.filter(o => norm(o.label) === q || norm(o.kind) === q || norm(o.label).includes(q));
  if (found.length > 1) { const here = found.filter(o => o.floor === floor); if (here.length) found = here; }
  if (found.length > 1) {
    const rooms = new Map(plan.rooms.map(r => [r.id, r.label]));
    throw new Ambiguous(ref, found.map(o => `${o.label} in ${rooms.get(o.roomId) || 'the plan'}`));
  }
  if (!found.length) throw new Error(`There is no “${ref}” in this plan. Add one first, for example “add a ${q} in the living room”.`);
  return found[0];
}

const exterior = (plan: Plan, r: Room, side: Direction) => side === 'north' ? r.y < .3 : side === 'south' ? r.y + r.h > plan.depth - .3 : side === 'west' ? r.x < .3 : r.x + r.w > plan.width - .3;
const overlaps = (plan: Plan, floor: number, x: number, y: number, w: number, h: number) => plan.rooms.some(r => r.floor === floor && x < r.x + r.w - .1 && x + w > r.x + .1 && y < r.y + r.h - .1 && y + h > r.y + .1);

function freeSpot(plan: Plan, floor: number, w: number, h: number, side?: string): [number, number] {
  let best: [number, number] | null = null, score = Infinity;
  for (let y = 0; y <= plan.depth - h + 1e-6; y += .5) for (let x = 0; x <= plan.width - w + 1e-6; x += .5) {
    if (overlaps(plan, floor, x, y, w, h)) continue;
    const s = side === 'north' ? y : side === 'south' ? plan.depth - (y + h) : side === 'west' ? x : side === 'east' ? plan.width - (x + w) : Math.hypot(x + w / 2 - plan.width / 2, y + h / 2 - plan.depth / 2);
    if (s < score) { score = s; best = [x, y]; }
  }
  if (best) return best;
  const x = side === 'east' ? plan.width - w : side === 'west' ? 0 : (plan.width - w) / 2, y = side === 'south' ? plan.depth - h : side === 'north' ? 0 : (plan.depth - h) / 2;
  return [Math.max(0, x), Math.max(0, y)];
}

const sizeFor = (kind: RoomKind): [number, number] => kind === 'bathroom' || kind === 'toilet' ? [6, 7] : kind === 'pooja' ? [5, 5] : kind === 'store' || kind === 'utility' ? [6, 6] : kind === 'living' ? [12, 14] : kind === 'kitchen' ? [9, 10] : [10, 11];

/** Collapses the history entries added by one command into a single undo step. */
export function squash(before: PlanEdits, after: PlanEdits, label: string): PlanEdits {
  const added = after.past.length - before.past.length;
  if (added < 1) return after;
  const first = after.past[before.past.length], last = after.past.at(-1)!;
  return {...after, past: [...before.past, {...last, id: first.id, label, before: first.before, after: last.after}]};
}

function placeIn(r: Room, w: number, h: number, side?: string): [number, number] {
  const m = .6, cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  const x = side === 'east' ? r.x + r.w - m - w / 2 : side === 'west' ? r.x + m + w / 2 : cx, y = side === 'north' ? r.y + m + h / 2 : side === 'south' ? r.y + r.h - m - h / 2 : cy;
  return [snap(x), snap(y)];
}

export function previewActions(plan: Plan, start: PlanEdits, actions: CommandAction[], summary: string, selection: string | null, floor: number): Preview {
  let e = start, terrace: Partial<TerraceOptions> | undefined; const changes: string[] = [], views: ViewRequest[] = [], touched = new Set<string>();
  const options = () => ({...terraceOptions(plan), ...terrace});
  const current = () => applyPlanEdits(plan, e);
  for (const a of actions) {
    const p = current();
    switch (a.op) {
      case 'terrace': {
        const now = options(), patch: Partial<TerraceOptions> = {}, top = terraceLevel(plan);
        if (a.stairLocation && a.stairLocation !== now.stairLocation) { patch.stairLocation = a.stairLocation; changes.push(`Place the stair ${STAIR_WORDS[a.stairLocation]}`); }
        if (a.stairType && a.stairType !== now.stairType) {
          if ((patch.stairLocation ?? now.stairLocation) === 'internal' && a.stairType === 'spiral') { patch.stairLocation = 'side'; changes.push('Place the stair outside on the side (a spiral stair is external)'); }
          patch.stairType = a.stairType; changes.push(`Use a ${a.stairType === 'spiral' ? 'spiral' : 'dog-legged'} stair`);
        }
        if (a.tankMount && a.tankMount !== now.tankMount) { patch.tankMount = a.tankMount; changes.push(a.tankMount === 'headroom' ? 'Put the water tank on the stair headroom roof' : 'Put the water tank on the terrace slab'); }
        if (a.tankCapacity !== undefined && a.tankCapacity !== now.tankCapacity) { patch.tankCapacity = a.tankCapacity; changes.push(`Make the water tank ${a.tankCapacity.toLocaleString('en-IN')} litres`); }
        if (a.independentFloor !== undefined) {
          const f = a.independentFloor; if (f < 1 || f >= top) throw new Error(top > 1 ? `Choose a floor from 1 to ${top - 1}.` : 'This house has only a ground floor.');
          const on = a.independent !== false, list = now.independentFloors.filter(v => v !== f);
          if (on !== now.independentFloors.includes(f)) {
            patch.independentFloors = on ? [...list, f].sort() : list; changes.push(on ? `Make floor ${f} an independent dwelling with its own entrance` : `Make floor ${f} part of the main house`);
            if (on && (patch.stairLocation ?? now.stairLocation) === 'internal') { patch.stairLocation = 'side'; changes.push('Place the stair outside on the side so floor ' + f + ' has a separate entry'); }
          }
        }
        if (!Object.keys(patch).length) throw new Error('The stair and tank already use those settings.');
        terrace = {...terrace, ...patch}; break;
      }
      case 'view': views.push(a); changes.push(a.target === 'floor' ? `Show floor ${a.floor ?? 0}` : a.target === 'terrace' ? 'Show the terrace plan' : a.target === 'undo' || a.target === 'redo' ? a.target[0].toUpperCase() + a.target.slice(1) : `Switch to ${a.target} view`); break;
      case 'addRoom': {
        const f = a.floor ?? floor; if (f >= (p.levels || 1)) throw new Error(`Floor ${f} does not exist in this plan.`);
        const [dw, dh] = sizeFor(a.kind), w = snap(a.w ?? dw), h = snap(a.h ?? dh), [x, y] = freeSpot(p, f, w, h, a.side);
        const ids = new Set(p.rooms.map(r => r.id)); e = addRoom(e, p, a.kind, f, snap(x), snap(y), w, h);
        const made = current().rooms.find(r => !ids.has(r.id));
        if (made && a.label) e = renameRoom(e, current(), made.id, a.label);
        if (made) touched.add(made.id);
        changes.push(`Add ${a.label || a.kind} (${w} × ${h} ft)${a.side && a.side !== 'center' ? ` on the ${a.side} side` : ''}`); break;
      }
      case 'removeRoom': { const r = resolveRoom(p, a.room, selection, floor); e = removeRoom(e, p, r.id); changes.push(`Remove ${r.label}`); break; }
      case 'moveRoom': {
        const r = resolveRoom(p, a.room, selection, floor); touched.add(r.id);
        if (a.floor !== undefined && a.floor !== r.floor) { e = setFloor(e, p, r.id, a.floor); changes.push(`Move ${r.label} to floor ${a.floor}`); }
        if (a.side) {
          const x = a.side === 'east' ? p.width - r.w : a.side === 'west' ? 0 : r.x, y = a.side === 'north' ? 0 : a.side === 'south' ? p.depth - r.h : r.y;
          e = moveRoom(e, current(), r.id, +x.toFixed(3), +y.toFixed(3)); changes.push(`Move ${r.label} to the ${a.side} side`);
        } else if (a.dx || a.dy) {
          e = moveRoom(e, current(), r.id, snap(r.x + (a.dx || 0)), snap(r.y + (a.dy || 0))); changes.push(`Move ${r.label} by ${a.dx || 0} ft east and ${a.dy || 0} ft south`);
        } else if (a.floor === undefined) throw new Error(`Say where to move ${r.label}: a side (north, south, east, west) or a floor.`);
        break;
      }
      case 'resizeRoom': {
        const r = resolveRoom(p, a.room, selection, floor), k = a.scale ?? 1, w = snap(a.w ?? r.w * k), h = snap(a.h ?? r.h * k);
        const x = snap(Math.max(0, r.x - (w - r.w) / 2)), y = snap(Math.max(0, r.y - (h - r.h) / 2));
        e = resizeRoom(e, p, r.id, x, y, w, h); touched.add(r.id); changes.push(`Resize ${r.label} to ${w} × ${h} ft`); break;
      }
      case 'renameRoom': { const r = resolveRoom(p, a.room, selection, floor); e = renameRoom(e, p, r.id, a.label); touched.add(r.id); changes.push(`Rename ${r.label} to ${a.label}`); break; }
      case 'changeKind': { const r = resolveRoom(p, a.room, selection, floor); e = changeKind(e, p, r.id, a.kind); touched.add(r.id); changes.push(`Make ${r.label} a ${a.kind}`); break; }
      case 'attachBathroom': {
        const b = resolveRoom(p, a.bathroom, selection, floor, ['bathroom']), bed = resolveRoom(p, a.bedroom, selection, b.floor, ['bedroom']);
        e = attachBathroom(e, p, b.id, bed.id); touched.add(b.id); touched.add(bed.id); changes.push(`Attach ${b.label} to ${bed.label}`); break;
      }
      case 'detachBathroom': { const b = resolveRoom(p, a.bathroom, selection, floor, ['bathroom']); e = detachBathroom(e, p, b.id); touched.add(b.id); changes.push(`Make ${b.label} a common bathroom`); break; }
      case 'addWindow': {
        const r = resolveRoom(p, a.room, selection, floor);
        if (!exterior(p, r, a.side)) throw new Error(`The ${a.side} wall of ${r.label} is an inside wall. Windows go on outside walls.`);
        const along = a.side === 'north' || a.side === 'south', len = along ? r.w : r.h, width = Math.min(a.width ?? 4, len - .6);
        if (width < 1.5) throw new Error(`The ${a.side} wall of ${r.label} is too short for a window.`);
        const start = (along ? r.x : r.y) + (len - width) / 2, wet = r.kind === 'bathroom' || r.kind === 'toilet', kitchen = r.kind === 'kitchen';
        const at = a.side === 'north' ? r.y : a.side === 'south' ? r.y + r.h : a.side === 'west' ? r.x : r.x + r.w;
        const outward: [number, number] = a.side === 'west' ? [-1, 0] : a.side === 'east' ? [1, 0] : a.side === 'north' ? [0, -1] : [0, 1];
        const id = `window-ai-${r.id}-${a.side}-${Object.keys(e.data.windows).length + 1}`;
        e = addWindow(e, {id, floor: r.floor, axis: along ? 'x' : 'z', x: along ? start : at, z: along ? at : start, width, outward, roomId: r.id, sill: wet ? 5.8 : kitchen ? 3.35 : 2.1, height: wet ? 1.5 : kitchen ? 4 : 5.4});
        touched.add(r.id); changes.push(`Add a ${+width.toFixed(1)} ft window on the ${a.side} wall of ${r.label}`); break;
      }
      case 'removeWindow': case 'resizeWindow': {
        const r = resolveRoom(p, a.room, selection, floor), list = makeHouseLayout(p).windows.filter(w => w.roomId === r.id && (!a.side || sideOfWindow(w) === a.side));
        if (!list.length) throw new Error(`${r.label} has no window${a.side ? ` on the ${a.side} wall` : ''}.`);
        const sides = [...new Set(list.map(sideOfWindow))];
        if (sides.length > 1 && !a.side) throw new Ambiguous(`window`, sides.map(s => `${s} window of ${r.label}`));
        for (const w of list) e = a.op === 'removeWindow' ? removeWindow(e, w.id) : resizeWindow(e, w, a.width);
        touched.add(r.id); changes.push(a.op === 'removeWindow' ? `Remove the ${sides[0]} window${list.length > 1 ? 's' : ''} of ${r.label}` : `Make the ${sides[0]} window of ${r.label} ${a.width} ft wide`); break;
      }
      case 'addObject': {
        const r = resolveRoom(p, a.room, selection, floor), w = a.kind === 'sofa' ? 5 : a.kind === 'painting' ? 2.8 : 2, h = a.kind === 'sofa' ? 2.7 : a.kind === 'painting' ? .5 : 2;
        const [x, y] = placeIn(r, w, h, a.side), label = a.kind[0].toUpperCase() + a.kind.slice(1);
        e = addObject(e, {id: `object-ai-${Date.now().toString(36)}-${changes.length}`, kind: a.kind, label, roomId: r.id, floor: r.floor, x, y, w, h, angle: 0});
        touched.add(r.id); changes.push(`Add a ${a.kind} in ${r.label}${a.side && a.side !== 'center' ? ` (${a.side} side)` : ''}`); break;
      }
      case 'moveObject': {
        const target = a.room ? resolveRoom(p, a.room, selection, floor) : undefined, o = resolveObject(p, a.object, selection, floor);
        const r = target || p.rooms.find(v => v.id === o.roomId); if (!r) throw new Error(`${o.label} has no room to move within.`);
        const turned = Math.abs(Math.sin(o.angle)) > .7, same = r.id === o.roomId;
        let [x, y] = placeIn(r, turned ? o.h : o.w, turned ? o.w : o.h, a.side);
        if (same && (a.side === 'east' || a.side === 'west')) y = o.y; else if (same && (a.side === 'north' || a.side === 'south')) x = o.x;
        e = moveObject(e, o, x, y, r.id, r.floor); touched.add(r.id);
        changes.push(`Move ${o.label} to ${target ? r.label : `the ${a.side && a.side !== 'center' ? a.side + ' side' : 'centre'} of ${r.label}`}${target && a.side && a.side !== 'center' ? ` (${a.side} side)` : ''}`); break;
      }
      case 'removeObject': { const o = resolveObject(p, a.object, selection, floor); e = removeObject(e, o.id); touched.add(o.roomId); changes.push(`Remove ${o.label}`); break; }
      case 'rotateObject': { const o = resolveObject(p, a.object, selection, floor); e = rotateObject(e, o, o.angle + a.degrees * Math.PI / 180); touched.add(o.roomId); changes.push(`Rotate ${o.label} by ${a.degrees}°`); break; }
      case 'setInterior': {
        const r = resolveRoom(p, a.room, selection, floor), options = INTERIOR_OPTIONS[a.field] as Record<string, string>;
        const key = Object.keys(options).find(k => norm(k) === norm(a.value)) || Object.keys(options).find(k => norm(options[k]).includes(norm(a.value)));
        if (!key) throw new Error(`“${a.value}” is not an option here. Choose ${Object.values(options).join(', ')}.`);
        e = setRoomInterior(e, p, r.id, {[a.field]: key}); touched.add(r.id); changes.push(`${r.label}: ${options[key]}`); break;
      }
    }
  }
  const after = applyPlanEdits(plan, e), oldIds = new Set((applyPlanEdits(plan, start).checks || []).map(c => c.id));
  const newIssues = [...new Map((after.checks || []).filter(c => c.status === 'conflict' && !oldIds.has(c.id)).map(c => [c.id, c.detail])).values()];
  if (terrace) {
    const design = plan.design, before = new Set(terraceChecks(plan).filter(c => c.status !== 'pass').map(c => c.id));
    const next = design ? terraceChecks({...plan, design: {...design, terrace: {...terraceOptions(plan), ...terrace}}}) : [];
    newIssues.push(...next.filter(c => c.status !== 'pass' && !before.has(c.id)).map(c => c.detail));
  }
  return {edits: e === start ? start : squash(start, e, 'AI: ' + summary.slice(0, 80)), changes, views, touched: [...touched], newIssues, ...(terrace ? {terrace} : {})};
}

/** Ambiguity found while resolving names becomes a clarifying question with clickable options. */
export function clarifyFrom(err: Ambiguous, text: string): CommandResult {
  const at = text.toLowerCase().indexOf(err.ref.toLowerCase());
  const options = err.choices.slice(0, 5).map(choice => ({label: choice, command: at >= 0 ? text.slice(0, at) + choice + text.slice(at + err.ref.length) : `${text} (${choice})`}));
  if (options.length < 2) return {type: 'unsupported', message: err.message};
  return {type: 'clarify', question: `Which one do you mean by “${err.ref}”?`, options};
}
