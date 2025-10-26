/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{_ as r}from"../../../chunks/tslib.es6.js";import s from"../../../core/Accessor.js";import{property as o}from"../../../core/accessorSupport/decorators/property.js";import"../../../core/has.js";import"../../../core/Logger.js";import"../../../core/RandomLCG.js";import{subclass as e}from"../../../core/accessorSupport/decorators/subclass.js";import t from"./GeographicTransformationStep.js";var p;let c=p=class extends s{constructor(r){super(r),this.steps=[]}getInverse(){const r=new p;for(let s=this.steps.length-1;s>=0;s--){const o=this.steps[s];r.steps.push(o.getInverse())}return r}};r([o({type:[t],nonNullable:!0})],c.prototype,"steps",void 0),c=p=r([e("esri.geometry.operators.support.GeographicTransformation")],c);export{c as default};
