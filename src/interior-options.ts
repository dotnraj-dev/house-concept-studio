import type {Room, RoomKind} from './types';

/** Per-room interior kit choices (P3 pass 2). Stored on the room override so they survive regeneration, undo and redo. */
export const INTERIOR_OPTIONS = {
  ceiling: {auto: 'Automatic (living, dining, master bedroom)', on: 'Gypsum false ceiling with cove light', off: 'Plain ceiling'},
  tvWall: {fluted: 'Fluted timber', marble: 'Backlit marble', louvre: 'Timber louvres with shelf'},
  headboard: {linen: 'Linen beige', teal: 'Teal velvet', charcoal: 'Charcoal fabric', timber: 'Timber slats'},
  granite: {galaxy: 'Black galaxy', tan: 'Tan brown', white: 'Kashmir white', green: 'Tropical green'},
  dado: {ivory: 'Ivory gloss', sage: 'Sage green', terracotta: 'Terracotta', blue: 'Athangudi blue'},
  dadoBorder: {on: 'Decorative border', off: 'No border'},
  mandir: {timber: 'Carved teak mandir', marble: 'White marble mandir'},
  poojaDoors: {jaali: 'Bell-and-jaali double doors', standard: 'Standard room door'},
} as const;

export type InteriorField = keyof typeof INTERIOR_OPTIONS;
export type RoomInterior = {[K in InteriorField]?: keyof (typeof INTERIOR_OPTIONS)[K]};
export const DEFAULT_INTERIOR: Required<RoomInterior> = {ceiling: 'auto', tvWall: 'fluted', headboard: 'linen', granite: 'galaxy', dado: 'ivory', dadoBorder: 'on', mandir: 'timber', poojaDoors: 'jaali'};

export const INTERIOR_LABELS: Record<InteriorField, string> = {ceiling: 'Ceiling', tvWall: 'TV feature wall', headboard: 'Headboard', granite: 'Counter granite', dado: 'Dado tiles', dadoBorder: 'Tile border', mandir: 'Mandir', poojaDoors: 'Pooja doors'};

/** Which choices make sense for a room type (Inspector shows only these). */
export function interiorFieldsFor(kind: RoomKind): InteriorField[] {
  const ceiling: InteriorField[] = ['living', 'lounge', 'dining', 'bedroom', 'study', 'foyer'].includes(kind) ? ['ceiling'] : [];
  if (kind === 'living' || kind === 'lounge') return [...ceiling, 'tvWall'];
  if (kind === 'bedroom') return [...ceiling, 'headboard'];
  if (kind === 'kitchen') return ['granite', 'dado', 'dadoBorder'];
  if (kind === 'pooja') return ['mandir', 'poojaDoors'];
  return ceiling;
}

export const interiorOf = (room: Pick<Room, 'interior'>): Required<RoomInterior> => ({...DEFAULT_INTERIOR, ...room.interior});

/** Throws on unknown fields or values; returns a clean copy. */
export function validInterior(patch: RoomInterior): RoomInterior {
  const out: Record<string, string> = {};
  for (const [field, value] of Object.entries(patch)) {
    const options = INTERIOR_OPTIONS[field as InteriorField] as Record<string, string> | undefined;
    if (!options) throw Error(`Unknown interior option: ${field}.`);
    if (typeof value !== 'string' || !Object.hasOwn(options, value)) throw Error(`Choose a valid ${INTERIOR_LABELS[field as InteriorField].toLowerCase()}.`);
    out[field] = value;
  }
  return out as RoomInterior;
}

export const GRANITE_COLORS: Record<NonNullable<RoomInterior['granite']>, string> = {galaxy: '#1b1c1f', tan: '#5a3f33', white: '#d9d5cc', green: '#24372e'};
export const DADO_COLORS: Record<NonNullable<RoomInterior['dado']>, string> = {ivory: '#efe8d6', sage: '#a9b9a0', terracotta: '#c07a55', blue: '#5b7f9e'};
export const HEADBOARD_COLORS: Record<NonNullable<RoomInterior['headboard']>, string> = {linen: '#c9b8a2', teal: '#2f5f63', charcoal: '#45464a', timber: '#9a6f49'};
