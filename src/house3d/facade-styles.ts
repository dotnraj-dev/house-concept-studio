export const FACADE_STYLES=[
 {id:'tn-contemporary-slats',label:'Tamil Nadu · Contemporary slats',reference:'ext-01-contemporary-slats.png',wall:'#eee9df',accent:'#4d514d',timber:'#9c714c',metal:'#343d39',stone:'#797970',screen:'fins',gate:'wood-and-metal',railing:'steel',rounded:false,pitched:false,jaali:'star'},
 {id:'tn-jaali-stone',label:'Tamil Nadu · Jaali & stone',reference:'ext-02-jaali-stone.png',wall:'#f3efe5',accent:'#c1a384',timber:'#8b6246',metal:'#424d48',stone:'#b79878',screen:'jaali',gate:'cnc',railing:'glass',rounded:false,pitched:false,jaali:'cross'},
 {id:'tn-curved-villa',label:'Tamil Nadu · Curved villa',reference:'ext-03-curved-villa.png',wall:'#f0eeea',accent:'#817971',timber:'#ad8c62',metal:'#554e46',stone:'#b4ada0',screen:'fins',gate:'cnc',railing:'glass',rounded:true,pitched:false,jaali:'flower'},
 {id:'tn-tiled-bungalow',label:'Tamil Nadu · Tiled bungalow',reference:'ext-04-tiled-bungalow.png',wall:'#f3ecdd',accent:'#c9bca6',timber:'#815534',metal:'#3a4039',stone:'#b5ac97',screen:'slats',gate:'vertical-bars',railing:'steel',rounded:true,pitched:true,jaali:'flower'},
 {id:'tn-narrow-g2',label:'Tamil Nadu · Narrow urban G+2',reference:'ext-05-narrow-g2.png',wall:'#ece9e0',accent:'#4e514c',timber:'#9c714c',metal:'#303b37',stone:'#67685e',screen:'slats',gate:'wood-and-metal',railing:'glass',rounded:false,pitched:false,jaali:'star'},
] as const;
export type FacadeStyle=typeof FACADE_STYLES[number];
export type FacadeStyleId=FacadeStyle['id'];
export const facadeStyle=(id?:string)=>FACADE_STYLES.find(s=>s.id===id);
export function recipeFor(id:string,width:number,levels:number){
 const style=facadeStyle(id)||FACADE_STYLES[0];
 return {...style,projection:Math.max(.75,Math.min(1.5,width/22)),frameThickness:width<26?.48:.62,screenPitch:width<26?.34:.44,headroomHeight:Math.min(8.3,7+levels*.16),narrow:width<27,levels};
}
