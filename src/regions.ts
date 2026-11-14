import records from './data/regional-styles.json';
import type {DesignBrief} from './types';
const palettes={"clay":["#eddcc8","#885132","#9c4a32",0.43,1.25,"tile"],"woven":["#dfcfad","#69533a","#66564a",0.6,1.4,"woodfloor"],"earth":["#e9d2b7","#96583c","#a26242",0.32,1.05,"stone"],"coast":["#dcaa87","#edf0de","#9e4931",0.45,1.5,"tile"],"wood":["#eddcc3","#63412b","#914b36",0.44,1.4,"woodfloor"],"lime":["#f2e9d5","#ad8968","#afa38e",0,0.55,"stone"],"slate":["#d7d2c4","#645344","#535f63",0.59,1.3,"woodfloor"],"malabar":["#f1e8d5","#62452f","#974630",0.51,2.15,"woodfloor"],"sand":["#e8c8a0","#a57952","#ae8965",0,0.7,"stone"],"modern":["#f0eee6","#776855","#797e76",0,0.5,"tile"]} as const;
export const regions=records;
const legacy:Record<string,string>={'kerala-traditional':'malabar','kerala-contemporary':'malabar',chettinad:'clay','tn-contemporary':'modern'};
export const regionFor=(id:string)=>records.find(r=>r.id===id);
export function palette(id:string|undefined){const family=regionFor(id||'')?.family||(Object.hasOwn(legacy,id||'')?legacy[id!]:undefined)||'modern';const [wall,trim,roof,pitch,eave,floor]=palettes[family as keyof typeof palettes];return {wall,trim,roof,pitch,eave,floor};}
export function chooseStyle(id:string):Partial<DesignBrief>{const p=palette(id);return {style:id,roof:p.pitch>0?(p.eave>2?'kerala':'terracotta'):'flat',floorFinish:p.floor,wallFinish:'plaster'};}
export const styleOptions=[...records.map(r=>({id:r.id,label:r.state+' · '+r.name})),{id:'tn-contemporary',label:'Tamil Nadu contemporary'},{id:'chettinad',label:'Chettinad-inspired'},{id:'kerala-traditional',label:'Kerala traditional-inspired'},{id:'kerala-contemporary',label:'Kerala contemporary'},{id:'custom',label:'Custom mix'}];
