// Shared contract for the AI command bar. The model (or the free local parser) may only answer with this
// structure; the browser executes the actions through the same editor functions as the 2D tools.
// Nothing the model writes is ever run as code.
import {z} from 'zod';
import {INTERIOR_OPTIONS} from '../interior-options';

export const DIRECTIONS = ['north', 'south', 'east', 'west'] as const;
export const PLACES = [...DIRECTIONS, 'center'] as const;
export const ROOM_KINDS = ['living', 'dining', 'kitchen', 'bedroom', 'bathroom', 'toilet', 'pooja', 'study', 'store', 'utility', 'balcony', 'sit-out', 'empty room', 'lounge', 'foyer'] as const;
export const OBJECT_KINDS = ['chair', 'sofa', 'table', 'stool', 'plant', 'lamp', 'painting'] as const;
export const VIEW_TARGETS = ['2d', '3d', 'present', 'walk', 'front', 'floor', 'undo', 'redo'] as const;
export const INTERIOR_FIELDS = Object.keys(INTERIOR_OPTIONS) as [keyof typeof INTERIOR_OPTIONS, ...(keyof typeof INTERIOR_OPTIONS)[]];
export const OPS = ['addRoom', 'removeRoom', 'moveRoom', 'resizeRoom', 'renameRoom', 'changeKind', 'attachBathroom', 'detachBathroom', 'addWindow', 'removeWindow', 'resizeWindow', 'addObject', 'moveObject', 'removeObject', 'rotateObject', 'setInterior', 'view'] as const;

const ref = z.string().trim().min(1).max(80);
const feet = z.number().finite().min(2).max(80);
const dir = z.enum(DIRECTIONS);
const floor = z.number().int().min(0).max(9);

export const ActionSchema = z.discriminatedUnion('op', [
  z.object({op: z.literal('addRoom'), kind: z.enum(ROOM_KINDS), floor: floor.optional(), side: z.enum(PLACES).optional(), w: feet.optional(), h: feet.optional(), label: z.string().trim().min(1).max(60).optional()}),
  z.object({op: z.literal('removeRoom'), room: ref}),
  z.object({op: z.literal('moveRoom'), room: ref, side: dir.optional(), dx: z.number().finite().min(-80).max(80).optional(), dy: z.number().finite().min(-80).max(80).optional(), floor: floor.optional()}),
  z.object({op: z.literal('resizeRoom'), room: ref, w: feet.optional(), h: feet.optional(), scale: z.number().finite().min(.5).max(2).optional()}),
  z.object({op: z.literal('renameRoom'), room: ref, label: z.string().trim().min(1).max(60)}),
  z.object({op: z.literal('changeKind'), room: ref, kind: z.enum(ROOM_KINDS)}),
  z.object({op: z.literal('attachBathroom'), bathroom: ref, bedroom: ref}),
  z.object({op: z.literal('detachBathroom'), bathroom: ref}),
  z.object({op: z.literal('addWindow'), room: ref, side: dir, width: z.number().finite().min(1.5).max(12).optional()}),
  z.object({op: z.literal('removeWindow'), room: ref, side: dir.optional()}),
  z.object({op: z.literal('resizeWindow'), room: ref, side: dir.optional(), width: z.number().finite().min(1.5).max(12)}),
  z.object({op: z.literal('addObject'), kind: z.enum(OBJECT_KINDS), room: ref, side: z.enum(PLACES).optional()}),
  z.object({op: z.literal('moveObject'), object: ref, room: ref.optional(), side: z.enum(PLACES).optional()}),
  z.object({op: z.literal('removeObject'), object: ref}),
  z.object({op: z.literal('rotateObject'), object: ref, degrees: z.number().finite().min(-360).max(360)}),
  z.object({op: z.literal('setInterior'), room: ref, field: z.enum(INTERIOR_FIELDS), value: z.string().trim().min(1).max(30)}),
  z.object({op: z.literal('view'), target: z.enum(VIEW_TARGETS), floor: floor.optional()}),
]);
export type CommandAction = z.infer<typeof ActionSchema>;

export const OptionSchema = z.object({label: z.string().trim().min(1).max(80), command: z.string().trim().min(2).max(300)});
export const CommandResultSchema = z.discriminatedUnion('type', [
  z.object({type: z.literal('actions'), summary: z.string().trim().min(1).max(300), actions: z.array(ActionSchema).min(1).max(12)}),
  z.object({type: z.literal('clarify'), question: z.string().trim().min(1).max(300), options: z.array(OptionSchema).min(2).max(5)}),
  z.object({type: z.literal('unsupported'), message: z.string().trim().min(1).max(400)}),
]);
export type CommandResult = z.infer<typeof CommandResultSchema>;

/** Compact project facts sent with each request: ids, names, sizes and wall sides only (no customer details). */
export const CommandContextSchema = z.object({
  selection: z.string().max(80).nullable(),
  floor: floor,
  levels: z.number().int().min(1).max(10),
  footprint: z.object({width: z.number(), depth: z.number()}),
  vastu: z.string().max(30).optional(),
  rooms: z.array(z.object({id: z.string().max(80), label: z.string().max(80), kind: z.string().max(30), floor, x: z.number(), y: z.number(), w: z.number(), h: z.number(), attachedTo: z.string().max(80).optional()})).max(120),
  windows: z.array(z.object({id: z.string().max(120), room: z.string().max(80), side: dir, width: z.number()})).max(300),
  objects: z.array(z.object({id: z.string().max(120), label: z.string().max(80), room: z.string().max(80)})).max(300),
});
export type CommandContext = z.infer<typeof CommandContextSchema>;
export const CommandRequestSchema = z.object({text: z.string().trim().min(2).max(500), context: CommandContextSchema});

// Strict JSON schema for the provider's structured output. Strict mode needs every property present,
// so optional fields are nullable here and stripped by normaliseModelResult() before zod validation.
const nullable = (type: string | Record<string, unknown>) => (typeof type === 'string' ? {type: [type, 'null']} : {anyOf: [type, {type: 'null'}]});
const actionJson = {
  type: 'object', additionalProperties: false,
  properties: {
    op: {type: 'string', enum: OPS}, kind: nullable('string'), room: nullable('string'), bathroom: nullable('string'), bedroom: nullable('string'),
    object: nullable('string'), side: nullable('string'), label: nullable('string'), field: nullable('string'), value: nullable('string'), target: nullable('string'),
    floor: nullable('integer'), w: nullable('number'), h: nullable('number'), dx: nullable('number'), dy: nullable('number'), scale: nullable('number'), width: nullable('number'), degrees: nullable('number'),
  },
  required: ['op', 'kind', 'room', 'bathroom', 'bedroom', 'object', 'side', 'label', 'field', 'value', 'target', 'floor', 'w', 'h', 'dx', 'dy', 'scale', 'width', 'degrees'],
};
export const COMMAND_JSON_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    type: {type: 'string', enum: ['actions', 'clarify', 'unsupported']},
    summary: nullable('string'), question: nullable('string'), message: nullable('string'),
    options: nullable({type: 'array', items: {type: 'object', additionalProperties: false, properties: {label: {type: 'string'}, command: {type: 'string'}}, required: ['label', 'command']}}),
    actions: nullable({type: 'array', items: actionJson}),
  },
  required: ['type', 'summary', 'question', 'message', 'options', 'actions'],
};

const strip = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(strip);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== null).map(([k, v]) => [k, strip(v)]));
  return value;
};
/** Drops null placeholders, keeps only the fields of the chosen result type, then validates with zod. */
export function normaliseModelResult(raw: unknown): CommandResult {
  const value = strip(raw) as Record<string, unknown>;
  const pick = value?.type === 'actions' ? {type: 'actions', summary: value.summary || 'Proposed changes', actions: value.actions}
    : value?.type === 'clarify' ? {type: 'clarify', question: value.question, options: value.options}
      : {type: 'unsupported', message: value?.message || 'That request is not supported yet.'};
  return CommandResultSchema.parse(pick);
}
