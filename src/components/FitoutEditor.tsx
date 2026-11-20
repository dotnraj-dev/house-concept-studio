import { Button, Input, Select, Checkbox } from '../ui';
import {useState} from 'react';
import {DOOR_DESIGNS,WARDROBE_DESIGNS,WINDOW_DESIGNS,fitoutOf,type HomeFitout,type RoomFitout} from '../fitout';
import {levelName,type DesignBrief,type Plan} from '../types';

const toggles=[['loft','Closed loft / slab storage'],['fan','Ceiling fan'],['ac','Split AC'],['art','Framed wall art']] as const;
export function FitoutEditor({plan,design,onChange}:{plan:Plan;design:DesignBrief;onChange:(patch:Partial<DesignBrief>)=>void}){
 const fit=fitoutOf(design),[roomId,setRoomId]=useState(''),room=plan.rooms.find(r=>r.id===roomId),override=fit.rooms[roomId]||{};
 const update=(patch:Partial<HomeFitout>)=>onChange({fitout:{...fit,...patch}});
 const perRoom=(patch:Partial<RoomFitout>)=>update({rooms:{...fit.rooms,[roomId]:{...override,...patch}}});
 const choices=[['window','Window design',WINDOW_DESIGNS],['door','Door design',DOOR_DESIGNS],['wardrobe','Bedroom wardrobe',WARDROBE_DESIGNS]] as const;
 return <section className="fitout-editor">
  <div className="subsection-heading"><h3>Windows, joinery & room details</h3><span>Editable across the house and per room</span></div>
  <div className="form-grid">{choices.map(([key,label,values])=><label key={key}>{label}<Select aria-label={label} value={fit[key]} onChange={e=>update({[key]:e.target.value})}>{Object.entries(values).map(([value,text])=><option key={value} value={value}>{text}</option>)}</Select></label>)}
   <label>Kitchen connection<Select aria-label="Kitchen connection" value={fit.openKitchen?'open':'closed'} onChange={e=>update({openKitchen:e.target.value==='open'})}><option value="closed">Separate kitchen</option><option value="open">Open kitchen to dining</option></Select></label>
   <label>Prayer provision<Select aria-label="Prayer provision" value={fit.prayerMode} onChange={e=>update({prayerMode:e.target.value as HomeFitout['prayerMode']})}><option value="room">Dedicated prayer room</option><option value="shelves">Wall-mounted prayer shelves in living</option><option value="cabinet">Full-height prayer cabinet in living</option></Select></label>
   <label>Prayer furnishings<Select aria-label="Prayer furnishings" value={fit.faith} onChange={e=>update({faith:e.target.value as HomeFitout['faith']})}><option value="neutral">Neutral shelves; no religious symbols</option><option value="hindu">Hindu · brass lamps and shelves</option><option value="christian">Christian · cross and book shelf</option><option value="muslim">Muslim · book stand and storage</option><option value="custom">Customer-defined · neutral until specified</option></Select></label>
   <label>Washing provision<Select aria-label="Washing provision" value={fit.utilityMode} onChange={e=>update({utilityMode:e.target.value as HomeFitout['utilityMode']})}><option value="integrated">Integrated; no separate basin room</option><option value="laundry">Dedicated laundry, when requested</option></Select></label>
  </div>
  <div className="toggle-grid">{toggles.map(([key,label])=><label className="check-tile" key={key}><Checkbox checked={fit[key]} onChange={e=>update({[key]:e.target.checked})}/>{label}</label>)}</div>
  <p className="hint">Prayer furniture appears only when prayer provision is selected under Rooms. AC defaults to habitable rooms; bathrooms use privacy ventilation. Storage is fitted to solid walls, leaving windows and entrances clear. If space is too tight, the fit is flagged for revision.</p>
  <div className="subsection-heading"><h3>Individual room choices</h3></div>
  <label>Room to furnish<Select aria-label="Room to furnish" value={roomId} onChange={e=>setRoomId(e.target.value)}><option value="">Choose a room…</option>{plan.rooms.filter(r=>!['passage','stairs','terrace','portico','foyer'].includes(r.kind)).map(r=><option key={r.id} value={r.id}>{levelName(r.floor)} · {r.label}</option>)}</Select></label>
  {room&&<div className="room-request"><strong>{room.label}</strong><div className="form-grid">{choices.filter(([key])=>key!=='wardrobe'||room.kind==='bedroom').map(([key,label,values])=><label key={key}>{label+' · '+room.label}<Select aria-label={label+" · "+room.label} value={override[key]||''} onChange={e=>{const next={...override};if(e.target.value)Object.assign(next,{[key]:e.target.value});else delete next[key];update({rooms:{...fit.rooms,[roomId]:next}});}}><option value="">Use house choice</option>{Object.entries(values).map(([value,text])=><option key={value} value={value}>{text}</option>)}</Select></label>)}</div>
   <div className="form-grid">{toggles.map(([key,label])=><label key={key}>{label+' · '+room.label}<Select aria-label={label+" · "+room.label} value={override[key]===undefined?'inherit':override[key]?'yes':'no'} onChange={e=>{if(e.target.value==='inherit'){const next={...override};delete next[key];update({rooms:{...fit.rooms,[roomId]:next}});}else perRoom({[key]:e.target.value==='yes'});}}><option value="inherit">Use room default</option><option value="yes">Include</option><option value="no">Hide</option></Select></label>)}</div>
   <Button type="button" className="text-link" onClick={()=>{const rooms={...fit.rooms};delete rooms[roomId];update({rooms});}}>Reset this room to house choices</Button>
  </div>}
 </section>;
}

