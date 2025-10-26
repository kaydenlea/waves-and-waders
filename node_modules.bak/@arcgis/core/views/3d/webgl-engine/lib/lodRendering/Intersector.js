/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{isValidIntersectorResult as r}from"../IntersectorResult.js";import{Graphic3DTarget as t}from"../IntersectorTarget.js";import{IntersectorType as e}from"../IntersectorType.js";class s extends t{constructor(r,t,e,s,i){super(r,t),this.layerViewUid=r,this.graphicUid=t,this.triangleNr=e,this.baseBoundingSphere=s,this.numLodLevels=i}}function i(t){return r(t)&&t.intersector===e.LOD&&!!t.target}export{s as LodTarget,i as isLodIntersectorResult};
