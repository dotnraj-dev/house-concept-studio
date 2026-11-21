// Free, offline command understanding (no AI call). Handles common edits in English and Tamil-English
// ("pooja room-a north side-ku maathu"). Returns null when unsure so the caller can ask the AI provider.
import type {Plan, RoomKind} from '../types';
import type {CommandAction, CommandResult} from './command-schema';
import {OBJECT_KINDS, ROOM_KINDS} from './command-schema';

type Dir = 'north' | 'south' | 'east' | 'west';
const TANGLISH: [RegExp, string][] = [
  [/\bvadakku\b/g, 'north'], [/\bther(k|u)ku?\b/g, 'south'], [/\bkizhakku\b/g, 'east'], [/\bmerku\b/g, 'west'],
  [/\b(maa?thu|maa?ttru|maa?tru|maathunga|shift pannu|move pannu)\b/g, 'move'], [/\b(podu|vainga|vai|add pannu|serthu|sethu)\b/g, 'add'],
  [/\b(eduthudu|eduthu vidu|eduthuru|thookku|thukku|remove pannu|delete pannu|venam|vendam)\b/g, 'remove'],
  [/\b(perusa|periya|perisa|peridha)\b/g, 'bigger'], [/\b(chinna|chinnadha|kammi)\b/g, 'smaller'],
  [/\bjannal\b/g, 'window'], [/\bpadam\b/g, 'painting'], [/\bsamayal arai\b/g, 'kitchen'], [/\bpadukkai arai\b/g, 'bedroom'],
  [/\b(side|wall|room|floor)-?(ku|kku|la|le|il)\b/g, '$1'], [/([a-z])-(a|ah|ai|ku|kku|la)\b/g, '$1'],
];
const DIR = /\b(north|south|east|west)\b/;
const NUM_WORDS: Record<string, number> = {ground: 0, first: 1, second: 2, third: 3, fourth: 4};
type Kind = typeof ROOM_KINDS[number];
const KIND_SYNONYMS: [RegExp, Kind][] = [
  [/\b(living( room)?|hall|drawing room|sitting room)\b/, 'living'], [/\bdining( room)?\b/, 'dining'], [/\bkitchen\b/, 'kitchen'],
  [/\b(bed ?rooms?|guest room|kids room|master)\b/, 'bedroom'], [/\b(bath ?rooms?|washroom)\b/, 'bathroom'], [/\b(toilet|wc)\b/, 'toilet'],
  [/\b(pooja|puja|prayer)( room)?\b/, 'pooja'], [/\b(study|office)( room)?\b/, 'study'], [/\bstore( room)?\b/, 'store'], [/\butility\b/, 'utility'],
  [/\bbalcony\b/, 'balcony'], [/\bsit-?out\b/, 'sit-out'], [/\blounge\b/, 'lounge'], [/\bfoyer\b/, 'foyer'],
];
type Field = Extract<CommandAction, {op: 'setInterior'}>['field'];
const INTERIOR: [RegExp, Field, string, RoomKind | null][] = [
  [/\bfalse ceiling\b.*\b(off|remove|no|plain)\b|\b(remove|no|plain)\b.*\bfalse ceiling\b|\bplain ceiling\b/, 'ceiling', 'off', null],
  [/\bfalse ceiling\b|\bcove light\b/, 'ceiling', 'on', null],
  [/\bmarble\b.*\btv\b|\btv\b.*\bmarble\b/, 'tvWall', 'marble', 'living'], [/\blouvre\b.*\btv\b|\btv\b.*\blouvre/, 'tvWall', 'louvre', 'living'], [/\bfluted\b/, 'tvWall', 'fluted', 'living'],
  [/\b(teal|velvet)\b.*headboard|headboard.*\b(teal|velvet)\b/, 'headboard', 'teal', 'bedroom'], [/charcoal.*headboard|headboard.*charcoal/, 'headboard', 'charcoal', 'bedroom'],
  [/timber.*headboard|headboard.*timber/, 'headboard', 'timber', 'bedroom'], [/linen.*headboard|headboard.*linen/, 'headboard', 'linen', 'bedroom'],
  [/\btan\b.*granite|granite.*\btan\b/, 'granite', 'tan', 'kitchen'], [/\bwhite\b.*granite|granite.*\bwhite\b/, 'granite', 'white', 'kitchen'],
  [/\bgreen\b.*granite|granite.*\bgreen\b/, 'granite', 'green', 'kitchen'], [/\b(black|galaxy)\b.*granite|granite.*\b(black|galaxy)\b/, 'granite', 'galaxy', 'kitchen'],
  [/\b(athangudi|blue)\b.*\b(tiles?|dado)\b|\b(tiles?|dado)\b.*\b(athangudi|blue)\b/, 'dado', 'blue', 'kitchen'], [/\bterracotta\b/, 'dado', 'terracotta', 'kitchen'],
  [/\bsage\b.*\b(tiles?|dado)\b|\b(tiles?|dado)\b.*\bsage\b/, 'dado', 'sage', 'kitchen'], [/\bivory\b.*\b(tiles?|dado)\b|\b(tiles?|dado)\b.*\bivory\b/, 'dado', 'ivory', 'kitchen'],
  [/\bmarble mandir\b|\bmandir\b.*\bmarble\b/, 'mandir', 'marble', 'pooja'], [/\b(teak|timber|wooden) mandir\b/, 'mandir', 'timber', 'pooja'],
  [/\bjaali\b|\bbell doors?\b/, 'poojaDoors', 'jaali', 'pooja'], [/\bstandard (pooja )?doors?\b/, 'poojaDoors', 'standard', 'pooja'],
];

export function normaliseText(text: string): string {
  let t = ' ' + text.toLowerCase().replace(/[’']/g, '').replace(/\s+/g, ' ') + ' ';
  for (const [re, to] of TANGLISH) t = t.replace(re, to);
  return t.replace(/\s+/g, ' ').trim();
}

type Mention = {ref: string; at: number; end: number};
/** Room mentions in reading order: a full room name, or a type word (which may match several rooms). */
function roomMentions(t: string, plan: Plan): Mention[] {
  const found: Mention[] = [], free = (at: number, end: number) => !found.some(f => at < f.end && end > f.at);
  const labels = [...new Set(plan.rooms.map(r => r.label))].sort((a, b) => b.length - a.length);
  for (const label of labels) {
    const l = label.toLowerCase(); let i = t.indexOf(l);
    while (i >= 0) { if (free(i, i + l.length)) found.push({ref: label, at: i, end: i + l.length}); i = t.indexOf(l, i + 1); }
  }
  for (const [re, kind] of KIND_SYNONYMS) {
    const g = new RegExp(re.source, 'g'); let m: RegExpExecArray | null;
    while ((m = g.exec(t))) { const at = m.index, end = at + m[0].length; if (free(at, end)) found.push({ref: m[0].startsWith('master') ? 'master' : kind, at, end}); }
  }
  const self = /\b(this room|this|it|there|here|selected)\b/.exec(t);
  if (self && free(self.index, self.index + self[0].length)) found.push({ref: 'selected', at: self.index, end: self.index + self[0].length});
  return found.sort((a, b) => a.at - b.at);
}

function floorOf(t: string, current: number): number | undefined {
  const m = /\b(ground|first|second|third|fourth)\s+floor\b|\bfloor\s+(\d)\b|\b(upstairs|downstairs)\b/.exec(t);
  if (!m) return undefined;
  if (m[1]) return NUM_WORDS[m[1]];
  if (m[2]) return +m[2];
  return m[3] === 'upstairs' ? current + 1 : Math.max(0, current - 1);
}

const objectIn = (t: string) => OBJECT_KINDS.find(k => new RegExp(`\\b${k}s?\\b`).test(t)) || (/\b(photo|frame|picture|wall art)\b/.test(t) ? 'painting' as const : undefined);
const title = (s: string) => s.trim().replace(/\b\w/g, c => c.toUpperCase());

function parseStep(t: string, plan: Plan, floor: number): CommandAction[] | CommandResult | null {
  const dir = DIR.exec(t)?.[1] as Dir | undefined, rooms = roomMentions(t, plan), named = rooms.filter(r => r.ref !== 'selected'), first = rooms[0]?.ref;
  const add = /\b(add|put|place|create|new|need|want|insert|include|give)\b/.test(t), remove = /\b(remove|delete|drop|close|block|without|get rid of)\b/.test(t);
  const move = /\b(move|shift|relocate|bring)\b/.test(t), num = [...t.matchAll(/(\d+(?:\.\d+)?)/g)].map(m => +m[1]);
  // View shortcuts and history (free, instant)
  if (/^(undo|undo that|go back)$/.test(t)) return [{op: 'view', target: 'undo'}];
  if (/^(redo|redo that)$/.test(t)) return [{op: 'view', target: 'redo'}];
  if (/^(show |go to |open )?(the )?front (view|elevation)$/.test(t)) return [{op: 'view', target: 'front'}];
  if (/^(start |begin )?(walk|walkthrough|walk through|walk inside)$/.test(t)) return [{op: 'view', target: 'walk'}];
  if (/^(present|presentation|start presentation|present mode)$/.test(t)) return [{op: 'view', target: 'present'}];
  if (/^(show |open |go to )?(the )?(2d|plan|floor plan)( view)?$/.test(t)) return [{op: 'view', target: '2d'}];
  if (/^(show |open |go to )?(the )?(3d|model)( view)?$/.test(t)) return [{op: 'view', target: '3d'}];
  const fl = floorOf(t, floor);
  if (/^(show|open|go to|view)\b/.test(t) && fl !== undefined && !named.length) return [{op: 'view', target: 'floor', floor: fl}];
  // Bathroom attachment
  if (/\b(attach|attached|ensuite|en-suite|connect|detach|common)\b/.test(t) && /\b(bath|bathroom|toilet)/.test(t)) {
    const bath = named.find(r => /bath|toilet/i.test(r.ref))?.ref || 'bathroom', bed = named.find(r => !/bath|toilet/i.test(r.ref))?.ref || 'selected';
    if (/\b(detach|common|separate|unattach)\b/.test(t)) return [{op: 'detachBathroom', bathroom: bath}];
    return [{op: 'attachBathroom', bathroom: bath, bedroom: bed}];
  }
  // Windows
  if (/\bwindows?\b/.test(t)) {
    const room = named[0]?.ref || 'selected';
    if (remove) return [{op: 'removeWindow', room, ...(dir ? {side: dir} : {})}];
    if (/\b(wider|bigger|larger|width|smaller|narrower)\b/.test(t)) return [{op: 'resizeWindow', room, width: num[0] ?? (/smaller|narrower/.test(t) ? 3 : 6), ...(dir ? {side: dir} : {})}];
    if ((add || move) && dir) return [{op: 'addWindow', room, side: dir, ...(num[0] ? {width: num[0]} : {})}];
    return null;
  }
  // Interior finishes
  for (const [re, field, value, kind] of INTERIOR) if (re.test(t)) return [{op: 'setInterior', room: named[0]?.ref || (rooms[0]?.ref === 'selected' ? 'selected' : kind || 'selected'), field, value}];
  // Furniture and decor
  const obj = objectIn(t);
  if (obj) {
    const target = named[0]?.ref;
    if (remove) return [{op: 'removeObject', object: obj}];
    if (/\b(rotate|turn|spin)\b/.test(t)) return [{op: 'rotateObject', object: obj, degrees: num[0] ?? 90}];
    if (move) return [{op: 'moveObject', object: obj, ...(target ? {room: target} : {}), ...(dir ? {side: dir} : {})}];
    if (add) return [{op: 'addObject', kind: obj, room: target || 'selected', ...(dir ? {side: dir} : {})}];
  }
  // "Facing" can mean several things: ask instead of guessing
  if (/\b(facing|face|faces)\b/.test(t) && dir && !add && !remove && !/\bmain (door|entrance)\b/.test(t)) {
    const room = named[0]?.ref || 'selected', name = room === 'selected' ? 'the selected room' : `the ${room}`;
    return {type: 'clarify', question: `What should face ${dir}?`, options: [
      {label: `Move ${name} to the ${dir} side`, command: `move ${room} to the ${dir} side`},
      {label: `Add a window on its ${dir} wall`, command: `add a window on the ${dir} side of ${room}`},
      {label: `Main entrance facing ${dir}`, command: `main door facing ${dir}`},
    ]};
  }
  if (/\bmain (door|entrance)\b/.test(t)) return {type: 'unsupported', message: 'The main entrance direction comes from the brief (Brief → Design → Main door facing). Change it there and the plan is regenerated; the command bar cannot move the main entrance yet.'};
  // Rooms
  const kindWord = KIND_SYNONYMS.find(([re]) => re.test(t))?.[1];
  if (/\b(rename|call it|name it)\b/.test(t)) { const m = /\b(?:to|as)\s+["“]?([a-z0-9 ]{2,40}?)["”]?$/.exec(t); if (m) return [{op: 'renameRoom', room: named[0]?.ref || 'selected', label: title(m[1])}]; }
  const convert = /\b(make|convert|change|turn)\b(.*)\b(?:into|to|as)\s+(?:an?\s+)?([a-z -]+?)$/.exec(t) || /\b(make)\b(.*?)\s+an?\s+([a-z -]+?)$/.exec(t);
  if (convert && !add) {
    const to = KIND_SYNONYMS.find(([re]) => re.test(convert[3]))?.[1] || (ROOM_KINDS as readonly string[]).find(k => k === convert[3].replace(/ room$/, '').trim());
    const source = roomMentions(convert[2], plan)[0]?.ref || 'selected';
    if (to && !/\b(bigger|larger|smaller|wider)\b/.test(t)) return [{op: 'changeKind', room: source, kind: to as Kind}];
  }
  if (add && kindWord && !move) {
    const label = /\bmaster\b/.test(t) ? 'Master bedroom' : /\bguest\b/.test(t) ? 'Guest bedroom' : undefined;
    return [{op: 'addRoom', kind: kindWord, ...(dir ? {side: dir} : {}), ...(fl !== undefined ? {floor: fl} : {}), ...(label ? {label} : {})}];
  }
  if (remove && first) return [{op: 'removeRoom', room: first}];
  const size = /(\d+(?:\.\d+)?)\s*(?:ft\s*)?(?:x|×|by|into)\s*(\d+(?:\.\d+)?)/.exec(t);
  if (size) return [{op: 'resizeRoom', room: first || 'selected', w: +size[1], h: +size[2]}];
  if (/\b(bigger|larger|increase|expand|enlarge|smaller|reduce|shrink|decrease)\b/.test(t) && first) {
    const grow = /\b(bigger|larger|increase|expand|enlarge)\b/.test(t), pct = /(\d+)\s*(%|percent)/.exec(t), feet = !pct && num.length ? num[0] : undefined;
    const r = plan.rooms.find(v => v.label === first);
    if (feet && r) return [{op: 'resizeRoom', room: first, w: r.w + (grow ? feet : -feet), h: r.h}];
    const scale = pct ? 1 + (grow ? 1 : -1) * +pct[1] / 100 : grow ? 1.15 : .87;
    return [{op: 'resizeRoom', room: first, scale: Math.min(2, Math.max(.5, +scale.toFixed(3)))}];
  }
  if ((move || /\bto the (north|south|east|west)\b/.test(t)) && (first || dir || fl !== undefined)) {
    const room = first || 'selected', by = /(\d+(?:\.\d+)?)\s*(?:ft|feet)?\s*(?:to the\s+|towards?\s+)?(north|south|east|west)/.exec(t);
    if (by) { const n = +by[1], d = by[2]; return [{op: 'moveRoom', room, dx: d === 'east' ? n : d === 'west' ? -n : 0, dy: d === 'south' ? n : d === 'north' ? -n : 0}]; }
    if (fl !== undefined || dir) return [{op: 'moveRoom', room, ...(fl !== undefined ? {floor: fl} : {}), ...(dir ? {side: dir} : {})}];
  }
  return null;
}

/** Splits multi-step requests ("move the sofa to the north, then remove the plant") and parses each step. */
export function parseLocal(text: string, plan: Plan, floor: number): CommandResult | null {
  const t = normaliseText(text);
  if (!t) return null;
  const parts = t.split(/\s*(?:;|,\s*(?:and\s+)?then\b|\band then\b|\bthen\b|,\s*and\b|\balso\b)\s*/).map(s => s.replace(/^[,\s]+|[,\s.]+$/g, '')).filter(Boolean);
  const steps = (parts.length > 1 ? parts : [t]).flatMap(s => s.split(/,?\s+and\s+(?=(?:add|put|remove|delete|move|shift|make|rotate|turn|attach|rename|show)\b)/)).map(s => s.replace(/^[,\s]+|[,\s.]+$/g, '')).filter(Boolean);
  const actions: CommandAction[] = [];
  for (const step of steps) {
    const r = parseStep(step, plan, floor);
    if (!r) return null;
    if (!Array.isArray(r)) return steps.length === 1 ? r : null;
    actions.push(...r);
  }
  if (!actions.length) return null;
  return {type: 'actions', summary: text.trim().slice(0, 200), actions};
}
