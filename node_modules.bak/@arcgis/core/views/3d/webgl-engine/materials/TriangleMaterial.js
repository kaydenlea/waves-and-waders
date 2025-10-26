/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{fromValues as t}from"../../../../core/libs/gl-matrix-2/factories/vec3f64.js";import{Material as i}from"../lib/Material.js";import{intersectTriangleGeometry as p}from"../lib/RayIntersections.js";class r extends i{constructor(){super(...arguments),this._pp0=t(0,0,1),this._pp1=t(0,0,0)}intersect(t,i,r,s,e,o){return p(t,r,s,e,void 0,o)}intersectDraped(t,i,r,s){return this._pp0[0]=this._pp1[0]=r[0],this._pp0[1]=this._pp1[1]=r[1],p(t,i,this._pp0,this._pp1,void 0,s)}}export{r as TriangleMaterial};
