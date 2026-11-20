import {styleOptions,chooseStyle} from '../regions';
import type {DesignBrief} from '../types';
/** Shared controls: the detailed form and Inspector edit the same existing brief fields. */
export function StyleControls({design:d,onChange}:{design:DesignBrief;onChange:(patch:Partial<DesignBrief>)=>void}){
 return <><div className="form-grid"><label>Architectural style<select value={d.style} onChange={e=>onChange(chooseStyle(e.target.value))}>{styleOptions.map(o=><option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
 <label>Roof expression<select value={d.roof} onChange={e=>onChange({roof:e.target.value as DesignBrief['roof']})}><option value="flat">Flat terrace</option><option value="kerala">Kerala-inspired pitched roof</option><option value="terracotta">Terracotta pitched roof</option></select></label>
 <label>Wall finish<select value={d.wallFinish} onChange={e=>onChange({wallFinish:e.target.value})}>{['plaster','timber','stone'].map(x=><option key={x}>{x}</option>)}</select></label>
 <label>Dry-room floor finish<select value={d.floorFinish} onChange={e=>onChange({floorFinish:e.target.value})}>{['tile','woodfloor','stone'].map(x=><option key={x}>{x}</option>)}</select></label></div>
 <label className="check-tile"><input type="checkbox" checked={d.furnished} onChange={e=>onChange({furnished:e.target.checked})}/> Show furniture and decor; fixed kitchen and bathroom fittings remain in both views</label></>;
}
