import {DEFAULT_REQUIREMENTS,DEFAULT_DESIGN,normalizeRequirements,type Requirements} from './types';

/** Fictional, keyless starting project for a fresh staging database. */
export const SHOWCASE_REQUIREMENTS:Requirements=normalizeRequirements({
  ...DEFAULT_REQUIREMENTS,customerName:'Sample household',location:'Tamil Nadu — illustrative site',
  plotWidth:45,plotDepth:65,roadSide:'north',floors:2,bedrooms:3,bathrooms:3,
  livingPriority:'spacious',kitchenPriority:'spacious',budgetLakhs:0,vastu:'none',
  notes:'Illustrative furnished G+1 home. Parents bedroom downstairs, two bedrooms and a family lounge upstairs. Review dimensions and requirements before using it for a customer.',
  design:{...DEFAULT_DESIGN,houseFacing:'north',mainDoorFacing:'north',outerFacing:'north',vastuMode:'none',
    levels:[
      {floor:0,name:'Ground floor',bedrooms:1,bathrooms:1,living:true,kitchen:true,rental:false,future:false},
      {floor:1,name:'First floor',bedrooms:2,bathrooms:2,living:true,kitchen:false,rental:false,future:false},
    ],services:[],roomRequests:[],vastuRules:[],quoteExtras:[]},
});
