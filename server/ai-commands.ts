// Server half of the AI command bar: sends the sentence plus compact plan facts to the configured provider
// with a strict JSON schema, then validates the answer with zod. The API key never leaves the server and
// the model can only return the fixed action list; nothing it writes is executed.
import {COMMAND_JSON_SCHEMA, normaliseModelResult, type CommandContext, type CommandResult} from '../src/ai/command-schema';

export const COMMAND_INSTRUCTIONS = `You turn a house designer's request into edits for a Tamil Nadu house plan.
Units are feet. Plan x grows east, plan y grows south; north is y=0. Floors: 0 = ground, 1 = first floor.
Requests may mix Tamil and English (e.g. "maathu" = move/change, "-ku" = to, "vadakku" = north, "therku" = south, "kizhakku" = east, "merku" = west, "jannal" = window).
Answer with type "actions" and a short summary when the request is clear. Use room ids or exact room labels from the context in room/bathroom/bedroom fields, and object ids or labels in the object field. Use "selected" for "this"/"it"/"there" when a selection exists.
Allowed ops: addRoom(kind, floor?, side?, w?, h?, label?), removeRoom(room), moveRoom(room, side? | dx/dy?, floor?), resizeRoom(room, w?, h? | scale?), renameRoom(room, label), changeKind(room, kind), attachBathroom(bathroom, bedroom), detachBathroom(bathroom), addWindow(room, side, width?), removeWindow(room, side?), resizeWindow(room, side?, width), addObject(kind, room, side?), moveObject(object, room?, side?), removeObject(object), rotateObject(object, degrees), setInterior(room, field, value), view(target, floor?).
Sides are north/south/east/west (or center for placement). Interior fields: ceiling(auto|on|off), tvWall(fluted|marble|louvre), headboard(linen|teal|charcoal|timber), granite(galaxy|tan|white|green), dado(ivory|sage|terracotta|blue), dadoBorder(on|off), mandir(timber|marble), poojaDoors(jaali|standard).
If the request could mean different things (for example "make the room face north" could mean moving it, adding a window, or turning furniture), answer type "clarify" with a question and 2-4 options whose command is a complete, unambiguous request.
If it needs something not in the op list (doors, stairs, walls, facade materials, budgets), answer type "unsupported" with one plain sentence on what is not possible yet and the closest thing that is.
Never invent rooms or objects that are not in the context unless the request is to add them. Set every unused field to null.`;

export type ProviderLike = {apiKey: string; textModel?: string};
export type InterpretResult = CommandResult & {usage?: {input: number; output: number}};

export async function interpretCommand(text: string, context: CommandContext, provider: ProviderLike, fetchImpl: typeof fetch = fetch): Promise<InterpretResult> {
  const response = await fetchImpl('https://api.openai.com/v1/responses', {
    method: 'POST', headers: {Authorization: `Bearer ${provider.apiKey}`, 'Content-Type': 'application/json'}, signal: AbortSignal.timeout(60000),
    body: JSON.stringify({
      model: provider.textModel || 'gpt-6.1-sol', max_output_tokens: 2000, reasoning: {effort: 'low'}, instructions: COMMAND_INSTRUCTIONS,
      input: `Plan context (JSON): ${JSON.stringify(context)}\n\nRequest: ${text}`,
      text: {format: {type: 'json_schema', name: 'house_edit_commands', strict: true, schema: COMMAND_JSON_SCHEMA}},
    }),
  });
  if (!response.ok) throw Object.assign(new Error('AI service is unavailable.'), {statusCode: 502, upstream: response.status});
  const output = await response.json() as {output?: {content?: {type: string; text?: string}[]}[]; usage?: {input_tokens?: number; output_tokens?: number}};
  const content = output.output?.flatMap(item => item.content || []).find(part => part.type === 'output_text')?.text;
  if (!content) throw Object.assign(new Error('AI returned no structured result.'), {statusCode: 502});
  let parsed: CommandResult;
  try { parsed = normaliseModelResult(JSON.parse(content)); }
  catch { return {type: 'unsupported', message: 'The AI answer could not be understood safely, so nothing was changed. Try a shorter, more specific request.'}; }
  return {...parsed, usage: {input: output.usage?.input_tokens || 0, output: output.usage?.output_tokens || 0}};
}
