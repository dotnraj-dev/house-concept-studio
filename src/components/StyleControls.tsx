import { Input, Select, Combobox, Checkbox } from '../ui';
import {styleOptions,chooseStyle,regions} from '../regions';
import {FACADE_STYLES} from '../house3d/facade-styles';
import type {DesignBrief} from '../types';
/** Shared controls: the detailed form and Inspector edit the same existing brief fields. */
export function StyleControls({design:d,onChange}:{design:DesignBrief;onChange:(patch:Partial<DesignBrief>)=>void}){
 return <><div className="form-grid"><label>Architectural style<Combobox value={d.style} onChange={e=>onChange(chooseStyle(e.target.value))}><optgroup label="Exterior recipes">{styleOptions.slice(0,FACADE_STYLES.length).map(o=><option key={o.id} value={o.id}>{o.label}</option>)}</optgroup><optgroup label="Regional references">{styleOptions.slice(FACADE_STYLES.length,FACADE_STYLES.length+regions.length).map(o=><option key={o.id} value={o.id}>{o.label}</option>)}</optgroup><optgroup label="Other styles">{styleOptions.slice(FACADE_STYLES.length+regions.length).map(o=><option key={o.id} value={o.id}>{o.label}</option>)}</optgroup></Combobox></label>
 <label>Roof expression<Select value={d.roof} onChange={e=>onChange({roof:e.target.value as DesignBrief['roof']})}><option value="flat">Flat terrace</option><option value="kerala">Kerala-inspired pitched roof</option><option value="terracotta">Terracotta pitched roof</option></Select></label>
 <label>Wall finish<Select value={d.wallFinish} onChange={e=>onChange({wallFinish:e.target.value})}>{['plaster','timber','stone'].map(x=><option key={x}>{x}</option>)}</Select></label>
 <label>Dry-room floor finish<Select value={d.floorFinish} onChange={e=>onChange({floorFinish:e.target.value})}>{['tile','woodfloor','stone'].map(x=><option key={x}>{x}</option>)}</Select></label></div>
 <label className="check-tile"><Checkbox checked={d.furnished} onChange={e=>onChange({furnished:e.target.checked})}/> Show furniture and decor; fixed kitchen and bathroom fittings remain in both views</label></>;
}
