/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{_ as r}from"../../chunks/tslib.es6.js";import{property as e}from"../../core/accessorSupport/decorators/property.js";import"../../core/has.js";import"../../core/Logger.js";import"../../core/RandomLCG.js";import{subclass as o}from"../../core/accessorSupport/decorators/subclass.js";const t=t=>{let s=class extends t{constructor(){super(...arguments),this.layer=null}get availableFields(){return[]}highlight(){throw new Error("Not implemented")}queryFeatures(){throw new Error("Not implemented")}queryFeatureCount(){throw new Error("Not implemented")}createQuery(){throw new Error("Not implemented")}queryExtent(){throw new Error("Not implemented")}};return r([e()],s.prototype,"layer",void 0),r([e()],s.prototype,"availableFields",null),s=r([o("esri.views.layers.PointCloudLayerView")],s),s};export{t as default};
