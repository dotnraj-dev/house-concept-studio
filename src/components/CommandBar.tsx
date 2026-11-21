import {useEffect, useMemo, useRef, useState} from 'react';
import {Check, CornerDownLeft, Mic, MicOff, Sparkles, X} from 'lucide-react';
import {Button, IconButton, Input, Kbd} from '../ui';
import {api} from '../api';
import type {Plan} from '../types';
import type {PlanEdits} from '../editor-model';
import type {TerraceOptions} from '../types';
import {parseLocal} from '../ai/local-commands';
import {Ambiguous, buildCommandContext, clarifyFrom, previewActions, type Preview, type ViewRequest} from '../ai/execute';
import type {CommandAction, CommandResult} from '../ai/command-schema';
import './command-bar.css';

type Speech = {lang: string; interimResults: boolean; continuous: boolean; start: () => void; stop: () => void; onresult: ((e: {results: ArrayLike<ArrayLike<{transcript: string}> & {isFinal: boolean}>}) => void) | null; onend: (() => void) | null; onerror: ((e: {error: string}) => void) | null};
type Pending = {preview: Preview; actions: CommandAction[]; summary: string; start: PlanEdits; source: string};
type Clarify = Extract<CommandResult, {type: 'clarify'}>;
const EXAMPLES = ['move the kitchen to the east side', 'add a window on the south side of the bedroom', 'pooja room-a north side-ku maathu', 'spiral stair outside on the side', 'put a 2000 litre tank on the headroom', 'make the first floor independent'];

export function CommandBar({plan, edits, floor, selection, editable, onApply, onTerrace, onView, onHighlight}: {
  plan: Plan; edits: PlanEdits; floor: number; selection: string | null; editable: boolean;
  onApply: (next: PlanEdits) => void; onTerrace: (patch: Partial<TerraceOptions>) => void; onView: (view: ViewRequest) => void; onHighlight: (roomId: string) => void;
}) {
  const [text, setText] = useState(''), [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [listening, setListening] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null), [question, setQuestion] = useState<Clarify | null>(null);
  const [message, setMessage] = useState(''), [aiReady, setAiReady] = useState(false), [history, setHistory] = useState<string[]>([]), [recall, setRecall] = useState(-1);
  const speech = useRef<Speech | null>(null), root = useRef<HTMLDivElement>(null);
  const field = () => root.current?.querySelector<HTMLInputElement>('.command-input input');
  const speechCtor = useMemo(() => typeof window === 'undefined' ? undefined : ((window as unknown as Record<string, unknown>).SpeechRecognition || (window as unknown as Record<string, unknown>).webkitSpeechRecognition) as (new () => Speech) | undefined, []);
  const estimate = useMemo(() => open ? Math.round((JSON.stringify(buildCommandContext(plan, selection, floor)).length + 3200) / 4 / 100) / 10 : 0, [open, plan, selection, floor]);

  useEffect(() => { api<{openai?: {configured: boolean}}>('/integrations/status').then(s => setAiReady(!!s.openai?.configured)).catch(() => setAiReady(false)); }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null, typing = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey) { e.preventDefault(); setOpen(true); field()?.focus(); }
    };
    addEventListener('keydown', key); return () => removeEventListener('keydown', key);
  }, []);
  useEffect(() => () => speech.current?.stop(), []);

  const reset = () => { setPending(null); setQuestion(null); };
  const show = (result: CommandResult, source: string, original: string) => {
    if (result.type === 'unsupported') { setMessage(result.message); return; }
    if (result.type === 'clarify') { setQuestion(result); return; }
    if (result.actions.every(a => a.op === 'view')) { result.actions.forEach(a => onView(a as ViewRequest)); setMessage(result.actions.length === 1 ? 'Done.' : `Done: ${result.actions.length} steps.`); setText(''); return; }
    if (!editable) { setMessage('Your account can view this project but not edit it.'); return; }
    try {
      const preview = previewActions(plan, edits, result.actions, result.summary, selection, floor);
      setPending({preview, actions: result.actions, summary: result.summary, start: edits, source});
      if (preview.touched[0]) onHighlight(preview.touched[0]);
    } catch (e) {
      if (e instanceof Ambiguous) { const c = clarifyFrom(e, original); if (c.type === 'clarify') setQuestion(c); else setMessage(e.message); }
      else setMessage((e as Error).message);
    }
  };

  async function submit(value = text) {
    const sentence = value.trim(); if (sentence.length < 2 || busy) return;
    reset(); setMessage(''); setHistory(h => [sentence, ...h.filter(x => x !== sentence)].slice(0, 8)); setRecall(-1);
    const local = parseLocal(sentence, plan, floor);
    if (local) { show(local, 'Understood on this device · free', sentence); return; }
    if (!aiReady) { setMessage('I could not understand that without AI. Try a direct request such as “move the kitchen to the east side”, or ask an admin to add an AI key in Settings.'); return; }
    setBusy(true);
    try {
      const r = await api<CommandResult & {usage?: {input: number; output: number}}>('/commands', {method: 'POST', body: JSON.stringify({text: sentence, context: buildCommandContext(plan, selection, floor)})});
      show(r, r.usage ? `AI · ${((r.usage.input + r.usage.output) / 1000).toFixed(1)}k tokens` : 'AI', sentence);
    } catch (e) { setMessage((e as Error).message); }
    finally { setBusy(false); }
  }

  function apply() {
    if (!pending) return;
    let next = pending.preview;
    if (edits !== pending.start) {
      try { next = previewActions(plan, edits, pending.actions, pending.summary, selection, floor); }
      catch (e) { setMessage(`The plan changed since this preview: ${(e as Error).message}`); setPending(null); return; }
    }
    if (next.edits !== edits) onApply(next.edits);
    if (next.terrace) onTerrace(next.terrace);
    next.views.forEach(onView);
    const planned = next.edits !== edits, settings = !!next.terrace;
    setMessage(`Applied ${next.changes.length} change${next.changes.length === 1 ? '' : 's'}.${planned ? ' Undo reverses the plan edits in one step.' : ''}${settings ? ' Stair and tank settings are also in the Inspector; ask again to change them back.' : ''}`); setPending(null); setText('');
  }

  function listen() {
    if (listening) { speech.current?.stop(); return; }
    if (!speechCtor) { setMessage('Voice typing is not available in this browser. Use Chrome, Edge or Safari, or type the request.'); return; }
    const s = new speechCtor(); speech.current = s; s.lang = 'en-IN'; s.interimResults = true; s.continuous = false;
    s.onresult = e => { const said = Array.from(e.results).map(r => r[0].transcript).join(' '); setText(said); if (e.results[e.results.length - 1].isFinal) void submit(said); };
    s.onend = () => setListening(false);
    s.onerror = e => { setListening(false); if (e.error !== 'aborted' && e.error !== 'no-speech') setMessage(`Microphone: ${e.error}`); };
    setOpen(true); setListening(true); setMessage(''); s.start();
  }

  const expanded = open || !!pending || !!question || !!message;
  return <div ref={root} className={'command-bar' + (expanded ? ' expanded' : '')} role="search" aria-label="Edit the house by typing or speaking"
    onBlur={e => { if (!root.current?.contains(e.relatedTarget as Node) && !text && !pending && !question && !message) setOpen(false); }}>
    {(pending || question || message) && <div className="command-result" aria-live="polite">
      {pending && <>
        <div className="command-result-head"><strong>{pending.summary}</strong><span className="command-source">{pending.source}</span></div>
        <ol className="command-changes">{pending.preview.changes.map((c, i) => <li key={i}><Check size={14} aria-hidden/>{c}</li>)}</ol>
        {pending.preview.newIssues.length > 0 && <ul className="command-issues" aria-label="New plan issues">{pending.preview.newIssues.slice(0, 4).map((c, i) => <li key={i}>{c}</li>)}</ul>}
        <div className="command-actions"><Button variant="primary" size="sm" onClick={apply}>Apply</Button><Button variant="ghost" size="sm" onClick={() => setPending(null)}>Cancel</Button></div>
      </>}
      {question && <>
        <div className="command-result-head"><strong>{question.question}</strong></div>
        <div className="command-options">{question.options.map(o => <Button key={o.label} size="sm" variant="secondary" onClick={() => { setText(o.command); void submit(o.command); }}>{o.label}</Button>)}</div>
      </>}
      {message && !pending && !question && <p className="command-message">{message}</p>}
      <IconButton className="command-close" label="Dismiss" size="sm" onClick={() => { reset(); setMessage(''); }}><X size={14}/></IconButton>
    </div>}
    {open && !text && !pending && !question && !message && <div className="command-examples" aria-label="Examples">{EXAMPLES.map(x => <button type="button" key={x} onClick={() => { setText(x); field()?.focus(); }}>{x}</button>)}</div>}
    <form className="command-input" onSubmit={e => { e.preventDefault(); void submit(); }}>
      <Sparkles size={16} aria-hidden className="command-icon"/>
      <Input value={text} placeholder={listening ? 'Listening…' : 'Ask or type a change, e.g. “move the pooja room to the north”'} aria-label="Command"
        maxLength={500} onFocus={() => setOpen(true)} onChange={e => setText(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Escape') { reset(); setMessage(''); setText(''); field()?.blur(); setOpen(false); }
          if (e.key === 'ArrowUp' && history.length) { e.preventDefault(); const i = Math.min(history.length - 1, recall + 1); setRecall(i); setText(history[i]); }
          if (e.key === 'ArrowDown' && recall >= 0) { e.preventDefault(); const i = recall - 1; setRecall(i); setText(i >= 0 ? history[i] : ''); }
        }}/>
      {expanded && <span className="command-cost" title="Simple commands run on this device for free. Harder sentences use the AI key configured in Settings.">{aiReady ? `Free, or AI ≈ ${estimate}k tokens` : 'Free · on device'}</span>}
      <IconButton type="button" label={listening ? 'Stop listening' : 'Speak a command'} size="sm" className={listening ? 'listening' : ''} onClick={listen}>{listening ? <MicOff size={16}/> : <Mic size={16}/>}</IconButton>
      <IconButton type="submit" label="Run command" size="sm" variant="primary" disabled={busy || text.trim().length < 2}><CornerDownLeft size={16}/></IconButton>
      {!expanded && <Kbd>/</Kbd>}
    </form>
  </div>;
}
