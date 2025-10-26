/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{clone as t}from"../../../../core/libs/gl-matrix-2/factories/vec3f64.js";import{IntersectorResult as r,isValidIntersectorResult as e}from"./IntersectorResult.js";import{IntersectorType as s}from"./IntersectorType.js";import{ObjectTarget as o}from"./ObjectTarget.js";class c extends r{constructor(){super(...arguments),this.intersector=s.HUD}}class i extends o{constructor(r,e){super(r.object,r.geometryId,r.primitiveIndex),this.center=t(e)}}function n(t){return e(t)&&t.intersector===s.HUD&&!!t.target&&"center"in t.target}export{c as HUDIntersectorResult,i as HUDTarget,n as isHUDIntersectorResult};
