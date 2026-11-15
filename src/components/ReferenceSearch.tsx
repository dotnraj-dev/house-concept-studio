import {useEffect,useRef,useState} from 'react';
import {api} from '../api';
import type {ReferenceResults} from '../../server/pixabay';
export function ReferenceSearch(){
 const [query,setQuery]=useState('Indian living room'),[result,setResult]=useState<ReferenceResults|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),version=useRef(0);
 useEffect(()=>{if(!result)return;const timer=setTimeout(()=>{setResult(null);setError('These previews expired. Search again for fresh references.');},Math.max(0,Date.parse(result.expiresAt)-Date.now()));return()=>clearTimeout(timer);},[result]);
 async function search(q=query){const current=++version.current;setBusy(true);setError('');try{const data=await api<ReferenceResults>('/references/search?q='+encodeURIComponent(q));if(current===version.current)setResult(data);}catch(e){setError((e as Error).message);}finally{if(current===version.current)setBusy(false);}}
 return <section className="card design-references"><span className="eyebrow">DESIGN REFERENCE LIBRARY</span><h2>Look closer at the details</h2><p>Explore materials, joinery, kitchens and bathrooms before choosing a direction for the house.</p>
 <form onSubmit={e=>{e.preventDefault();void search();}} className="reference-search"><input aria-label="Search design reference photos" value={query} onChange={e=>setQuery(e.target.value)} minLength={2} maxLength={100} required placeholder="e.g. Kerala courtyard house"/><button className="button primary" disabled={busy}>{busy?'Searching…':'Search photos'}</button></form>
 <div className="reference-chips">{['Kerala house','Tamil Nadu courtyard','living room TV unit','kitchen countertop','bathroom shower'].map(q=><button disabled={busy} key={q} onClick={()=>{setQuery(q);void search(q);}}>{q}</button>)}</div>
 {error&&<p role="alert">{error}</p>}
 {result&&<><div className="reference-grid">{result.photos.map(p=><a href={p.source} key={p.id} target="_blank" rel="noreferrer"><img src={p.preview} alt={p.tags} loading="lazy" referrerPolicy="no-referrer"/><strong>{p.tags}</strong><span>Photo by {p.author}</span></a>)}</div>{!result.photos.length&&<p>No matching photos. Try a broader phrase.</p>}<p className="hint">Images from <a href="https://pixabay.com/" target="_blank" rel="noreferrer">Pixabay</a> · temporary search previews · {result.cached?'Cached results':'New search'}. Stock photos may include other regions; verify the building and location. Searching photos does not automatically change or train the 3D model.</p></>}
 </section>;
}

