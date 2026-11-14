import {z} from 'zod';
const number=(max=10000)=>z.number().finite().min(0).max(max);
const direction=z.enum(['north','east','south','west']);
const zone=z.enum(['any','north','north-east','east','south-east','south','south-west','west','north-west','centre']);
const kind=z.enum(['living','dining','kitchen','bedroom','bathroom','portico','utility','pooja','lounge','terrace','stairs','passage','foyer']);
const size=z.object({w:number(1000),h:number(1000)});
export const designSchema=z.object({
 guideAnswers:z.record(z.string().max(40),z.string().max(1800)).refine(r=>Object.keys(r).length<=30).optional(),
 siteContext:z.object({latitude:z.number().finite().min(-90).max(90),longitude:z.number().finite().min(-180).max(180),edges:z.array(z.object({edge:z.string().max(40),use:z.enum(['house','building','trees','open','road']),gap:number(500),width:number(500).positive(),depth:number(500).positive(),height:number(500).positive(),along:number(1)})).max(200)}).optional(),
 version:z.literal(2),customerEmail:z.string().max(200),language:z.string().max(80),household:z.string().max(3000),authority:z.string().max(200),
 plotMode:z.enum(['rectangle','polygon']),vertices:z.array(z.object({id:z.string().max(40),x:z.number().finite().min(-10000).max(10000),y:z.number().finite().min(-10000).max(10000),setback:number(1000),road:z.boolean()})).max(200),
 surveyImage:z.string().max(1500000).refine(v=>!v||/^data:image\/(png|jpeg|webp);base64,/.test(v)).optional(),measurement:z.enum(['surveyed','approximate']),setbacks:z.object({north:number(1000),east:number(1000),south:number(1000),west:number(1000)}),customSetbacks:z.boolean(),
 houseFacing:direction,mainDoorFacing:direction,twoDoors:z.boolean(),outerFacing:direction,shoeRack:z.boolean(),furnished:z.boolean(),style:z.string().max(100),wallFinish:z.enum(['plaster','timber','stone']),floorFinish:z.enum(['tile','woodfloor','stone']),roof:z.enum(['flat','kerala','terracotta']),
 vastuMode:z.enum(['strict','semi','none']),vastuRules:z.array(z.object({id:z.string().max(100),target:z.string().max(100),zone,facing:z.union([direction,z.literal('any')]),priority:z.enum(['required','preferred']),note:z.string().max(1000)})).max(150),
 roomRequests:z.array(z.object({id:z.string().max(100),kind,label:z.string().max(120),floor:z.number().int().min(0).max(99),mode:z.enum(['auto','preferred','exact']),w:number(1000),h:number(1000),zone,facing:z.union([direction,z.literal('any')]),priority:z.enum(['required','preferred']),toiletStyle:z.enum(['western','indian'])})).max(500),
 levels:z.array(z.object({floor:z.number().int().min(0).max(99),name:z.string().max(100),bedrooms:z.number().int().min(0).max(100),bathrooms:z.number().int().min(0).max(100),kitchen:z.boolean(),living:z.boolean(),rental:z.boolean(),future:z.boolean()})).max(100),
 services:z.array(z.object({id:z.string().max(100),type:z.enum(['tank','sump','septic','borewell','pump','sewer','rainwater']),label:z.string().max(100),x:z.number().finite().min(-10000).max(10000),y:z.number().finite().min(-10000).max(10000),level:z.number().int().min(0).max(100),capacity:number(10000000),side:direction,locked:z.boolean()})).max(100),
 pipeSide:direction,maintenanceWidth:number(100),sewerAvailable:z.boolean(),quoteRate:number(100000),quoteOverride:z.boolean(),quoteTax:number(100),quoteDiscount:number(1000000000),
 quoteExtras:z.array(z.object({id:z.string().max(100),label:z.string().max(200),quantity:number(10000000),rate:number(100000000),included:z.boolean(),category:z.enum(['interior','construction','service'])})).max(300),
 includeInteriors:z.boolean(),balconyFactor:number(1),porticoFactor:number(1),quoteValidity:z.number().int().min(1).max(365)
});
export const requirementsSchema=z.object({
 customerName:z.string().max(160),customerPhone:z.string().max(40),location:z.string().max(200),plotWidth:number(10000),plotDepth:number(10000),
 roadSide:direction,floors:z.number().int().min(1).max(100),bedrooms:z.number().int().min(1).max(100),bathrooms:z.number().int().min(1).max(100),parking:z.boolean(),
 livingPriority:z.enum(['compact','balanced','spacious']),kitchenPriority:z.enum(['compact','balanced','spacious']),toiletStyle:z.enum(['western','indian','both']),vastu:z.enum(['essential','preferred','none']),
 pooja:z.boolean(),utility:z.boolean(),elderlyBedroom:z.boolean(),budgetLakhs:number(100000),notes:z.string().max(10000),
 requestedSizes:z.object({living:size,dining:size,kitchen:size,bedroom:size,bathroom:size,portico:size}),design:designSchema.optional()
});

