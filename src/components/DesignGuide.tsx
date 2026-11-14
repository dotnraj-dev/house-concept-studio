import {useState} from 'react';
import {ArrowRight,ArrowLeft,Check,MessageSquareText,PencilLine} from 'lucide-react';
import {questions,answerValue,applyAnswer,type Qid} from '../guide';
import {regions} from '../regions';
import {designOf,type Requirements} from '../types';
import {VoiceInput} from './VoiceInput';
import './design-guide.css';
export function DesignGuide({req,onChange,editable,canPlan,canVoice,onPlan,onForm}:{req:Requirements;onChange:(r:Requirements)=>void;editable:boolean;canPlan:boolean;canVoice:boolean;onPlan:()=>void;onForm:()=>void}){
 const marks=designOf(req).guideAnswers||{},first=questions.findIndex(q=>!marks[q.id]);
 const [index,step]=useState(first<0?questions.length:first),[input,setInput]=useState(''),[error,setError]=useState(''),[voice,setVoice]=useState(false);
 const done=questions.filter(q=>marks[q.id]).length,q=questions[index];
 const answer=(id:Qid)=>marks[id]?.startsWith('review:')?marks[id].slice(7):answerValue(id,req);
 function go(i:number,edit=false){step(i);setInput(edit?answer(questions[i].id):'');setError('');setVoice(false);}
 function submit(value:string){if(!editable||!q)return;const res=applyAnswer(req,q.id,value);if(!res.value){setError(res.error||'Check your answer.');return;}onChange(res.value);const next=questions.findIndex((v,i)=>i>index&&!res.value!.design!.guideAnswers?.[v.id]);const pending=questions.findIndex(v=>!res.value!.design!.guideAnswers?.[v.id]);go(next>=0?next:pending>=0?pending:questions.length);}
 return <div className="design-guide"><div className="guide-progress"><span>Design interview</span><strong>{done} / {questions.length}</strong></div><progress max={questions.length} value={done} aria-label="Answers captured"/>
 <div className="guide-body">{questions.filter((v,i)=>marks[v.id]&&i!==index).map(v=><div className="guide-row" key={v.id}><span>{v.label}</span><div><strong>{answer(v.id)}</strong>{marks[v.id]?.startsWith('review:')&&<small>Request saved for review · plan currently uses {answerValue(v.id,req)}</small>}</div><button onClick={()=>go(questions.indexOf(v),true)} aria-label={'Edit '+v.label}><PencilLine size={15}/></button></div>)}
 {q?<section className="guide-question" key={q.id}><div className="guide-kicker"><MessageSquareText size={17}/> Studio assistant · {String(index+1).padStart(2,'0')}</div><h3>{q.ask}</h3><p>{q.hint}</p><fieldset disabled={!editable}><div className="guide-chips">{q.choices.map(c=><button key={c} onClick={()=>submit(c)}>{c}</button>)}</div>
 {q.id==='style'&&<select aria-label="Choose from all states" value="" onChange={e=>{if(e.target.value)submit(e.target.value);}}><option value="">Browse all 28 states…</option>{regions.map(r=><option key={r.id} value={r.id}>{r.state} · {r.name}</option>)}</select>}
 <form onSubmit={e=>{e.preventDefault();submit(input);}}><label htmlFor="guide-answer">Your answer</label><textarea id="guide-answer" value={input} maxLength={1750} onChange={e=>setInput(e.target.value)} placeholder={q.id==='extras'?'Describe anything we have not covered…':'Type in your own words…'} rows={2}/><div className="guide-actions">{canVoice&&<button type="button" className="text-link" onClick={()=>setVoice(!voice)}>{voice?'Hide recorder':'Dictate an answer'}</button>}<button className="button primary" disabled={!input.trim()}>Use answer <ArrowRight size={16}/></button></div></form>
 {voice&&<VoiceInput text={input} onText={setInput} onExtract={()=>submit(input)} enabled={canVoice&&editable} actionLabel="Use this answer"/>}
 {error&&<p role="alert">{error}</p>}
 {answerValue(q.id,req)&&<button className="guide-current" onClick={()=>submit(answer(q.id))}>Keep current: {answer(q.id)}</button>}</fieldset>
 </section>:<section className="guide-question"><div className="guide-kicker"><Check size={17}/> Brief ready for review</div><h3>Does this feel like their home?</h3><p>Edit any answer above. Requests marked for review stay in the brief until the designer resolves them in the form.</p><button className="button primary" disabled={!canPlan} onClick={onPlan}>Open furnished plan <ArrowRight size={16}/></button></section>}
 </div><div className="guide-foot">{index>0&&<button onClick={()=>go(index-1,true)}><ArrowLeft size={15}/> Previous</button>}<button onClick={onForm}>Open detailed form <ArrowRight size={15}/></button></div></div>;
}
