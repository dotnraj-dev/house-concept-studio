import type {HomeFitout} from './fitout';
import type {TNSiteRules} from './tn-rules';
import type {SiteContext} from './site-context';
import type {PlanEdits} from './editor-model';
export const FEATURES = [
  'projects.view', 'projects.create', 'projects.edit', 'intake.ai', 'intake.voice',
  'plans.generate', 'plans.edit', 'plans.view3d', 'proposals.export',
  'assets.manage', 'settings.manage', 'services.edit', 'quotes.edit', 'renders.create',
] as const;
export type Feature = typeof FEATURES[number];
export const FEATURE_LABELS: Record<Feature, string> = {
  'projects.view': 'View customer projects',
  'projects.create': 'Create customer projects',
  'projects.edit': 'Edit requirements and notes',
  'intake.ai': 'Extract requirements from text',
  'intake.voice': 'Record and transcribe voice',
  'plans.generate': 'Generate 2D concepts',
  'plans.edit': 'Adjust plan proportions',
  'plans.view3d': 'View furnished 3D model',
  'proposals.export': 'Export customer proposal',
  'assets.manage': 'Upload and manage assets',
  'settings.manage': 'Change company settings',
  'services.edit': 'Place tanks and edit plumbing',
  'quotes.edit': 'Change quotation rates and extras',
  'renders.create': 'Export scenes and create presentation images',
};
export type User = { id: string; name: string; email: string; role: 'admin' | 'employee'; active: boolean; permissions: Feature[] };
export const SIZE_CATEGORIES = ['living','dining','kitchen','bedroom','bathroom','portico'] as const;
export type SizeCategory = typeof SIZE_CATEGORIES[number];
export type RoomTarget = { w: number; h: number };
export type Requirements = {
  customerName: string; customerPhone: string; location: string;
  plotWidth: number; plotDepth: number; roadSide: 'north'|'south'|'east'|'west';
  floors: number; bedrooms: number; bathrooms: number; parking: boolean;
  livingPriority: 'compact'|'balanced'|'spacious'; kitchenPriority: 'compact'|'balanced'|'spacious';
  toiletStyle: 'western'|'indian'|'both'; vastu: 'essential'|'preferred'|'none';
  pooja: boolean; utility: boolean; elderlyBedroom: boolean;
  budgetLakhs: number; notes: string;
  requestedSizes: Record<SizeCategory, RoomTarget>;
  design?: DesignBrief;
};
export const DEFAULT_REQUIREMENTS: Requirements = {
  customerName: '', customerPhone: '', location: '', plotWidth: 40, plotDepth: 60,
  roadSide: 'north', floors: 2, bedrooms: 3, bathrooms: 3, parking: true,
  livingPriority: 'balanced', kitchenPriority: 'balanced', toiletStyle: 'western',
  vastu: 'preferred', pooja: true, utility: false, elderlyBedroom: true,
  budgetLakhs: 60, notes: '',
  requestedSizes: {
    living:{w:0,h:0}, dining:{w:0,h:0}, kitchen:{w:0,h:0},
    bedroom:{w:0,h:0}, bathroom:{w:0,h:0}, portico:{w:0,h:0},
  },
};
export type Project = { id: string; title: string; requirements: Requirements; paragraph: string; transcript: string; selectedVariant: number; ratios: Ratios; status: string; createdAt: string; updatedAt: string; ownerId: string };
export type Ratios = { front: number; middle: number; livingShare: number; kitchenShare: number };
export const DEFAULT_RATIOS: Ratios = { front: .34, middle: .29, livingShare: .57, kitchenShare: .5 };
export type RoomKind = 'living'|'dining'|'kitchen'|'bedroom'|'bathroom'|'toilet'|'pooja'|'study'|'store'|'utility'|'balcony'|'sit-out'|'empty room'|'portico'|'lounge'|'terrace'|'stairs'|'passage'|'foyer';
export type Room = { featureWidth?:number; featureX?:number; attachedTo?:string; id: string; kind: RoomKind; label: string; floor: number; x: number; y: number; w: number; h: number };
export type Plan = { rooms: Room[]; valid: boolean; width: number; depth: number; plotWidth: number; plotDepth: number; offsetX: number; offsetY: number; roadSide: Requirements['roadSide']; toiletStyle: Requirements['toiletStyle']; pooja: boolean; warnings: string[]; variantName: string; site?: SiteAnalysis; design?: DesignBrief; checks?: DesignCheck[]; levels?: number; mainDoorFacing?: Direction; editor?:PlanEdits };
export type Asset = { id: string; name: string; category: string; width: number; depth: number; height: number; license: string; source: string; fileUrl: string; createdAt: string };
export type Settings = { companyName: string; costPerSqft: number; sideSetback: number; frontSetback: number; rearSetback: number; currency: string };
export const DEFAULT_SETTINGS: Settings = { companyName: 'House Concept Studio', costPerSqft: 0, sideSetback: 3, frontSetback: 5, rearSetback: 3, currency: 'INR' };

export type Direction = 'north'|'east'|'south'|'west';
export const DIRECTIONS: Direction[] = ['north','east','south','west'];
export type Zone = Direction|'north-east'|'south-east'|'south-west'|'north-west'|'centre'|'any';
export const ZONES: Zone[] = ['any','north','north-east','east','south-east','south','south-west','west','north-west','centre'];
export type Point = { x:number; y:number };
export type PlotVertex = Point & { id:string; setback:number; road:boolean };
export type Rect = { x:number; y:number; w:number; h:number };
export type DesignCheck = { id:string; title:string; detail:string; status:'pass'|'warning'|'conflict'; target?:string };
export type SiteAnalysis = { polygon:PlotVertex[]; area:number; footprint:Rect; issues:string[]; rectangular:boolean };
export type RoomRequest = { id:string; kind:RoomKind; label:string; floor:number; mode:'auto'|'preferred'|'exact'; w:number; h:number; zone:Zone; facing:Direction|'any'; priority:'required'|'preferred'; toiletStyle:'western'|'indian' };
export type VastuRule = { id:string; target:string; zone:Zone; facing:Direction|'any'; priority:'required'|'preferred'; note:string };
export type LevelProgram = { floor:number; name:string; bedrooms:number; bathrooms:number; kitchen:boolean; living:boolean; rental:boolean; future:boolean };
export type ServiceNode = { id:string; type:'tank'|'sump'|'septic'|'borewell'|'pump'|'sewer'|'rainwater'; label:string; x:number; y:number; level:number; capacity:number; side:Direction; locked:boolean };
export type QuoteExtra = { id:string; label:string; quantity:number; rate:number; included:boolean; category:'interior'|'construction'|'service' };
export type DesignBrief = {
  editor?:PlanEdits;
  fitout?:HomeFitout; tnRules?:TNSiteRules; siteContext?:SiteContext; guideAnswers?:Record<string,string>;
  version:2; customerEmail:string; language:string; household:string; authority:string;
  plotMode:'rectangle'|'polygon'; vertices:PlotVertex[]; surveyImage?:string; measurement:'surveyed'|'approximate';
  setbacks:{ north:number; east:number; south:number; west:number }; customSetbacks:boolean;
  houseFacing:Direction; mainDoorFacing:Direction; twoDoors:boolean; outerFacing:Direction; shoeRack:boolean;
  bathroomAccess?:'attached'|'mixed'|'common';
  furnished:boolean; style:string; wallFinish:string; floorFinish:string; roof:'flat'|'kerala'|'terracotta';
  vastuMode:'strict'|'semi'|'none'; vastuRules:VastuRule[]; roomRequests:RoomRequest[];
  levels:LevelProgram[]; services:ServiceNode[]; pipeSide:Direction; maintenanceWidth:number; sewerAvailable:boolean;
  quoteRate:number; quoteOverride:boolean; quoteTax:number; quoteDiscount:number; quoteExtras:QuoteExtra[];
  includeInteriors:boolean; balconyFactor:number; porticoFactor:number; quoteValidity:number;
};
export const DEFAULT_DESIGN: DesignBrief = {
  version:2,customerEmail:'',language:'Tamil / English',household:'',authority:'',plotMode:'rectangle',vertices:[],measurement:'approximate',
  setbacks:{north:5,east:3,south:3,west:3},customSetbacks:false,houseFacing:'north',mainDoorFacing:'north',
  bathroomAccess:'attached',twoDoors:false,outerFacing:'north',shoeRack:true,furnished:true,style:'tn-contemporary',wallFinish:'plaster',floorFinish:'tile',roof:'flat',
  vastuMode:'semi',vastuRules:[],roomRequests:[],levels:[],services:[],pipeSide:'east',maintenanceWidth:2.5,sewerAvailable:true,
  quoteRate:0,quoteOverride:false,quoteTax:0,quoteDiscount:0,quoteExtras:[],includeInteriors:false,balconyFactor:1,porticoFactor:.5,quoteValidity:30,
};
export function designOf(req:Requirements):DesignBrief {
  const d=req.design;
  return {...DEFAULT_DESIGN,...d,setbacks:{...DEFAULT_DESIGN.setbacks,...d?.setbacks},
    mainDoorFacing:d?.mainDoorFacing||req.roadSide,houseFacing:d?.houseFacing||req.roadSide,outerFacing:d?.outerFacing||req.roadSide,
    vastuMode:d?.vastuMode||(req.vastu==='none'?'none':req.vastu==='essential'?'strict':'semi')};
}
export function normalizeRequirements(input:Partial<Requirements>):Requirements {
  const value={...DEFAULT_REQUIREMENTS,...input,requestedSizes:{...DEFAULT_REQUIREMENTS.requestedSizes,...input.requestedSizes}};
  return {...value,design:designOf(value)};
}
export const levelName=(floor:number)=>floor===0?'Ground floor':`Floor ${floor}`;
export const floorSummary=(count:number)=>count===1?'Ground':`G + ${count-1}`;
