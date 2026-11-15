import type {DesignBrief,Plan,Room} from './types';

export const WINDOW_DESIGNS={auto:'Match architectural style',casement:'White uPVC casement',sliding:'Charcoal sliding glass',timber:'Timber casement + safety grille',heritage:'Timber divided-light casement',louvred:'Privacy louvres'} as const;
export const DOOR_DESIGNS={panel:'Classic timber panels',flush:'Flush oak + brass inlay',slatted:'Vertical timber battens'} as const;
export const WARDROBE_DESIGNS={hinged:'Hinged oak wardrobe',sliding:'Sliding walnut wardrobe',mirror:'Wardrobe with mirror panel'} as const;
export type WindowDesign=keyof typeof WINDOW_DESIGNS;
export type DoorDesign=keyof typeof DOOR_DESIGNS;
export type WardrobeDesign=keyof typeof WARDROBE_DESIGNS;
export type RoomFitout={window:WindowDesign;door:DoorDesign;wardrobe:WardrobeDesign;loft:boolean;fan:boolean;ac:boolean;art:boolean};
export type HomeFitout=RoomFitout&{openKitchen:boolean;prayerMode:'room'|'shelves'|'cabinet';faith:'neutral'|'hindu'|'christian'|'muslim'|'custom';utilityMode:'integrated'|'laundry';rooms:Record<string,Partial<RoomFitout>>};
export const DEFAULT_FITOUT:HomeFitout={window:'auto',door:'flush',wardrobe:'hinged',loft:true,fan:true,ac:true,art:true,openKitchen:false,prayerMode:'room',faith:'neutral',utilityMode:'integrated',rooms:{}};
export function fitoutOf(design?:Pick<DesignBrief,'fitout'>):HomeFitout{return {...DEFAULT_FITOUT,...design?.fitout,rooms:design?.fitout?.rooms||{}};}
export function roomFitout(plan:Pick<Plan,'design'>,room:Pick<Room,'id'|'kind'>):RoomFitout{
 const d=fitoutOf(plan.design),wet=room.kind==='bathroom',habitable=['living','lounge','bedroom','dining','pooja','kitchen','utility'].includes(room.kind);
 return {...d,fan:d.fan&&!wet,ac:d.ac&&habitable,...d.rooms[room.id]};
}
export function windowDesignFor(plan:Pick<Plan,'design'>,room:Pick<Room,'id'|'kind'>):Exclude<WindowDesign,'auto'>{
 const value=roomFitout(plan,room).window;
 if(value!=='auto')return value;
 if(room.kind==='bathroom')return 'louvred';
 return /kerala|traditional|chettinad|heritage/.test(plan.design?.style||'')?'timber':'casement';
}
export const windowOpenableFraction=(style:WindowDesign)=>style==='sliding'?.45:style==='louvred'?.65:.85;


export function doorDesignFor(plan:Pick<Plan,'design'|'rooms'>,door:{main:boolean;rooms?:string[]}):DoorDesign{
 if(door.main)return fitoutOf(plan.design).door;
 const owners=plan.rooms.filter(r=>door.rooms?.includes(r.id)),room=owners.find(r=>r.kind==='bathroom')||owners.find(r=>!['passage','foyer'].includes(r.kind));
 return room?roomFitout(plan,room).door:fitoutOf(plan.design).door;
}
