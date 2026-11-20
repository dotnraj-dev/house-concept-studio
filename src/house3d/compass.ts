/** Verified against layout-v2 edge normals, Vastu plan zones and climate.sunPosition:
 * plan x grows east, plan y grows south. Scene translation preserves +X east / -Z north.
 * Facing changes doors/elevations; it never rotates the geographical coordinate system.
 */
export function headingDegrees(x:number,z:number){return (Math.atan2(x,-z)*180/Math.PI+360)%360;}
export function facingLabel(degrees:number){return ['N','NE','E','SE','S','SW','W','NW'][Math.round(((degrees%360)+360)%360/45)%8];}
export const compassRotation=(heading:number)=>-heading;
