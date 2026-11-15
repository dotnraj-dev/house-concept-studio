export const FACADE_STYLES=[
 {id:'tn-contemporary-slats',frame:'#fafaf7',trim:'#292f30',soffit:'#b49779',side:'#e7e8e3',light:'golden',window:'sliding',label:'Tamil Nadu · Contemporary slats',reference:'ext-01-contemporary-slats.png',wall:'#f3f4ef',accent:'#4d514d',timber:'#9c714c',metal:'#343d39',stone:'#797970',screen:'fins',gate:'wood-and-metal',railing:'steel',rounded:false,pitched:false,jaali:'star'},
 {id:'tn-jaali-stone',frame:'#fafbf7',trim:'#303b39',soffit:'#a88e73',side:'#e5e9e5',light:'day',window:'sliding',label:'Tamil Nadu · Jaali & stone',reference:'ext-02-jaali-stone.png',wall:'#f5f6f0',accent:'#c1a384',timber:'#8b6246',metal:'#424d48',stone:'#b79878',screen:'jaali',gate:'cnc',railing:'glass',rounded:false,pitched:false,jaali:'cross'},
 {id:'tn-curved-villa',frame:'#fafafa',trim:'#383a3b',soffit:'#c0b8a9',side:'#e4e5e4',light:'sunset',window:'sliding',label:'Tamil Nadu · Curved villa',reference:'ext-03-curved-villa.png',wall:'#f1f3f1',accent:'#8d908e',timber:'#ad8c62',metal:'#554e46',stone:'#b4ada0',screen:'fins',gate:'cnc',railing:'glass',rounded:true,pitched:false,jaali:'flower'},
 {id:'tn-tiled-bungalow',frame:'#faf8f0',trim:'#966e48',soffit:'#a88c68',side:'#eeeee5',light:'day',window:'heritage',label:'Tamil Nadu · Tiled bungalow',reference:'ext-04-tiled-bungalow.png',wall:'#f4f5eb',accent:'#c9bca6',timber:'#815534',metal:'#3a4039',stone:'#b5ac97',screen:'slats',gate:'vertical-bars',railing:'steel',rounded:true,pitched:true,jaali:'flower'},
 {id:'tn-narrow-g2',frame:'#f9f9f3',trim:'#28333a',soffit:'#af9476',side:'#e4e7e7',light:'dusk',window:'sliding',label:'Tamil Nadu · Narrow urban G+2',reference:'ext-05-narrow-g2.png',wall:'#f1f3f1',accent:'#4e514c',timber:'#9c714c',metal:'#303b37',stone:'#67685e',screen:'slats',gate:'wood-and-metal',railing:'glass',rounded:false,pitched:false,jaali:'star'},
] as const;
export type FacadeStyle=typeof FACADE_STYLES[number];
export type FacadeStyleId=FacadeStyle['id'];
export const facadeStyle=(id?:string)=>FACADE_STYLES.find(s=>s.id===id);
export function recipeFor(id:string,width:number,levels:number){
 const style=facadeStyle(id)||FACADE_STYLES[0];
 return {...style,projection:Math.max(.75,Math.min(1.5,width/22)),frameThickness:width<26?.48:.62,screenPitch:width<26?.34:.44,headroomHeight:Math.min(8.3,7+levels*.16),narrow:width<27,levels};
}
