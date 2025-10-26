/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{isValidIntersectorResult as e}from"../webgl-engine/lib/IntersectorResult.js";import{Graphic3DTarget as r}from"../webgl-engine/lib/IntersectorTarget.js";import{IntersectorType as t}from"../webgl-engine/lib/IntersectorType.js";function n(r){return e(r)&&r.intersector===t.TERRAIN&&!!r.target}class o extends r{constructor(e,r,t){super(e,r),this.triangleNr=t}}function i(r){return e(r)&&r.intersector===t.OVERLAY&&!!r.target}export{o as OverlayTarget,i as isOverlayIntersectorResult,n as isTerrainIntersectorResult};
