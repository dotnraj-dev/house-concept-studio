import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_REQUIREMENTS, DEFAULT_SETTINGS, DEFAULT_RATIOS, type Plan} from './types';
import {generatePlan} from './plan';
import {applyPlanEdits, emptyEdits, undo} from './editor-model';
import {parseLocal, normaliseText} from './ai/local-commands';
import {Ambiguous, buildCommandContext, clarifyFrom, planObjects, previewActions} from './ai/execute';
import {CommandContextSchema, CommandResultSchema, normaliseModelResult, type CommandResult} from './ai/command-schema';
import {interpretCommand} from '../server/ai-commands';

const base = generatePlan(DEFAULT_REQUIREMENTS, DEFAULT_SETTINGS, 0, DEFAULT_RATIOS);
const pooja = base.rooms.find(r => r.kind === 'pooja'), living = base.rooms.find(r => r.kind === 'living')!, kitchen = base.rooms.find(r => r.kind === 'kitchen')!;
const actions = (r: CommandResult | null) => { assert.ok(r && r.type === 'actions', `expected actions, got ${JSON.stringify(r)}`); return r.actions; };
const run = (text: string, plan: Plan = base, selection: string | null = null) => {
  const r = parseLocal(text, plan, 0); assert.ok(r && r.type === 'actions', `not parsed: ${text} -> ${JSON.stringify(r)}`);
  return previewActions(plan, emptyEdits(), r.actions, r.summary, selection, 0);
};
const roomAfter = (p: ReturnType<typeof run>, id: string) => applyPlanEdits(base, p.edits).rooms.find(r => r.id === id);

test('local shortcuts need no AI call', () => {
  for (const [text, target] of [['undo', 'undo'], ['redo', 'redo'], ['front view', 'front'], ['walk', 'walk'], ['present', 'present'], ['show 2d', '2d'], ['3d view', '3d']] as const)
    assert.deepEqual(actions(parseLocal(text, base, 0)), [{op: 'view', target}], text);
  assert.deepEqual(actions(parseLocal('show first floor', base, 0)), [{op: 'view', target: 'floor', floor: 1}]);
});

test('move a room to a compass side', () => {
  const p = run(`move the ${living.label} to the north side`);
  assert.equal(roomAfter(p, living.id)?.y, 0);
  assert.equal(p.edits.past.length, 1, 'one undo step');
  assert.deepEqual(applyPlanEdits(base, undo(p.edits)).rooms.find(r => r.id === living.id), living);
});

test('Tamil-English: pooja room-a north side-ku maathu', () => {
  assert.equal(normaliseText('pooja room-a north side-ku maathu'), 'pooja room north side move');
  if (!pooja) return;
  const p = run('pooja room-a north side-ku maathu');
  assert.equal(roomAfter(p, pooja.id)?.y, 0);
});

test('Tamil-English with Tamil direction words: kitchen-a kizhakku side-ku maathu', () => {
  const p = run('kitchen-a kizhakku side-ku maathu');
  const k = roomAfter(p, kitchen.id)!; assert.equal(+(k.x + k.w).toFixed(2), base.width);
});

test('add and remove windows on outside walls; inside walls are refused', () => {
  const ext = base.rooms.find(r => r.floor === 0 && r.y < .3 && r.w >= 6 && !['portico', 'stairs', 'passage', 'foyer'].includes(r.kind))!;
  const p = run(`add a window on the north side of ${ext.label}`);
  const w = Object.values(p.edits.data.windows)[0]!;
  assert.equal(w.roomId, ext.id); assert.deepEqual(w.outward, [0, -1]);
  const inner = base.rooms.find(r => r.floor === 0 && r.y > 1 && r.y + r.h < base.depth - 1 && r.x > 1 && r.x + r.w < base.width - 1);
  if (inner) assert.throws(() => run(`add a window on the north side of ${inner.label}`), /inside wall/);
});

test('multi-step request becomes one preview and one undo step', () => {
  const p = run(`move the ${living.label} to the north side, then make the kitchen bigger and add a plant in the ${living.label}`);
  assert.equal(p.changes.length, 3);
  assert.equal(p.edits.past.length, 1);
  assert.ok(roomAfter(p, kitchen.id)!.w > kitchen.w);
  assert.ok(planObjects(applyPlanEdits(base, p.edits)).some(o => o.kind === 'plant' && o.roomId === living.id));
});

test('resize with explicit feet and with percentages', () => {
  assert.equal(roomAfter(run('make the kitchen 10 x 12'), kitchen.id)?.w, 10);
  assert.ok(roomAfter(run('make the kitchen 20% smaller'), kitchen.id)!.w < kitchen.w);
});

test('add rooms with a side and floor', () => {
  const p = run('add a study room on the east side of the first floor');
  const added = applyPlanEdits(base, p.edits).rooms.find(r => !base.rooms.some(b => b.id === r.id))!;
  assert.equal(added.kind, 'study'); assert.equal(added.floor, 1);
});

test('rename, convert and remove rooms', () => {
  const bed = base.rooms.find(r => r.kind === 'bedroom')!;
  assert.equal(roomAfter(run(`rename ${bed.label} to Guest suite`), bed.id)?.label, 'Guest Suite');
  assert.equal(roomAfter(run(`convert ${bed.label} into a study`), bed.id)?.kind, 'study');
  assert.equal(roomAfter(run(`remove ${bed.label}`), bed.id), undefined);
});

test('bathroom attachment by words', () => {
  const bath = base.rooms.find(r => r.kind === 'bathroom')!, bed = base.rooms.find(r => r.kind === 'bedroom' && r.floor === bath.floor)!;
  assert.equal(roomAfter(run(`attach ${bath.label} to ${bed.label}`), bath.id)?.attachedTo, bed.id);
});

test('interior finishes: marble TV wall, tan granite, Athangudi tiles', () => {
  assert.equal(roomAfter(run('give the hall a marble tv wall'), living.id)?.interior?.tvWall, 'marble');
  assert.equal(roomAfter(run('tan granite in the kitchen'), kitchen.id)?.interior?.granite, 'tan');
  assert.equal(roomAfter(run('athangudi blue tiles for kitchen'), kitchen.id)?.interior?.dado, 'blue');
});

test('furniture: move the sofa, rotate it', () => {
  const sofa = planObjects(base).find(o => o.kind === 'sofa');
  if (!sofa) return;
  const moved = Object.values(run('move the sofa to the west side').edits.data.objects)[0]!; assert.ok(moved.x <= sofa.x + .3); assert.equal(moved.y, sofa.y);
  assert.ok(run('rotate the sofa 90').changes[0].includes('90°'));
});

test('ambiguous names become a clarifying question with clickable options', () => {
  const beds = base.rooms.filter(r => r.kind === 'bedroom');
  assert.ok(beds.length > 1);
  const r = parseLocal('remove the bedroom', base, 0)!;
  try { previewActions(base, emptyEdits(), actions(r), 'x', null, 9); assert.fail('should be ambiguous'); }
  catch (e) {
    assert.ok(e instanceof Ambiguous, String(e));
    const c = clarifyFrom(e, 'remove the bedroom'); assert.equal(c.type, 'clarify');
    if (c.type === 'clarify') { assert.ok(c.options.length >= 2); assert.ok(c.options[0].command.includes(beds[0].label)); }
  }
});

test('"facing north" is clarified, not guessed; main door is explained as unsupported', () => {
  assert.equal(parseLocal('change the room facing to north', base, 0)?.type, 'clarify');
  assert.equal(parseLocal('move the main door to the south', base, 0)?.type, 'unsupported');
});

test('unknown requests fall back to AI (null); impossible references fail with a plain message', () => {
  assert.equal(parseLocal('make the house feel more traditional and airy', base, 0), null);
  assert.throws(() => run('remove the gym'), /no room called|not parsed/);
});

test('command context is compact, valid and contains no customer details', () => {
  const ctx = buildCommandContext(base, null, 0);
  assert.ok(CommandContextSchema.safeParse(ctx).success);
  const json = JSON.stringify(ctx); assert.ok(json.length < 40000);
  assert.doesNotMatch(json, /customerName|phone|email|budget/i);
});

test('model output is validated: nulls stripped, unknown ops and bad values rejected', () => {
  const nulls = {kind: null, bathroom: null, bedroom: null, object: null, label: null, field: null, value: null, target: null, floor: null, w: null, h: null, dx: null, dy: null, scale: null, width: null, degrees: null};
  const ok = normaliseModelResult({type: 'actions', summary: 'Move', question: null, message: null, options: null, actions: [{...nulls, op: 'moveRoom', room: 'Kitchen', side: 'north'}]});
  assert.deepEqual(ok, {type: 'actions', summary: 'Move', actions: [{op: 'moveRoom', room: 'Kitchen', side: 'north'}]});
  assert.throws(() => normaliseModelResult({type: 'actions', summary: 'x', actions: [{op: 'runScript', code: 'rm -rf /'}]}));
  assert.throws(() => normaliseModelResult({type: 'actions', summary: 'x', actions: [{op: 'resizeRoom', room: 'Kitchen', w: 99999}]}));
  assert.ok(CommandResultSchema.safeParse({type: 'clarify', question: 'Which?', options: [{label: 'a', command: 'do a'}, {label: 'b', command: 'do b'}]}).success);
});

test('mocked provider: key stays server-side, strict schema is requested, answer is validated', async () => {
  let sent: {auth: string; body: any} | null = null;
  const reply = (payload: unknown) => (async (_url: string | URL | Request, init?: RequestInit) => {
    sent = {auth: String((init?.headers as Record<string, string>).Authorization), body: JSON.parse(String(init?.body))};
    return new Response(JSON.stringify({output: [{content: [{type: 'output_text', text: JSON.stringify(payload)}]}], usage: {input_tokens: 900, output_tokens: 60}}), {status: 200});
  }) as typeof fetch;
  const ctx = buildCommandContext(base, null, 0);
  const nulls = {kind: null, bathroom: null, bedroom: null, object: null, label: null, field: null, value: null, target: null, floor: null, w: null, h: null, dx: null, dy: null, scale: null, width: null, degrees: null};
  const r = await interpretCommand('pooja arai-ya vadakku pakkam maathunga', ctx, {apiKey: 'sk-test'}, reply({type: 'actions', summary: 'Move pooja north', question: null, message: null, options: null, actions: [{...nulls, op: 'moveRoom', room: 'Pooja', side: 'north'}]}));
  assert.equal(r.type, 'actions'); assert.deepEqual(r.usage, {input: 900, output: 60});
  assert.equal(sent!.auth, 'Bearer sk-test'); assert.equal(sent!.body.text.format.strict, true);
  assert.equal((await interpretCommand('x', ctx, {apiKey: 'k'}, reply({type: 'actions', summary: 's', actions: [{op: 'eval', code: 'alert(1)'}]}))).type, 'unsupported');
  assert.equal((await interpretCommand('make it face north', ctx, {apiKey: 'k'}, reply({type: 'clarify', summary: null, message: null, actions: null, question: 'Which?', options: [{label: 'Move', command: 'move it north'}, {label: 'Window', command: 'add a window on the north'}]}))).type, 'clarify');
  await assert.rejects(interpretCommand('x', ctx, {apiKey: 'k'}, (async () => new Response('nope', {status: 500})) as typeof fetch), /unavailable/);
});
