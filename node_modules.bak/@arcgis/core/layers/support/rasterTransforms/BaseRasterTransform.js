/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{_ as r}from"../../../chunks/tslib.es6.js";import e from"../../../core/JSONSupport.js";import{property as o}from"../../../core/accessorSupport/decorators/property.js";import"../../../core/has.js";import"../../../core/Logger.js";import"../../../core/RandomLCG.js";import{subclass as s}from"../../../core/accessorSupport/decorators/subclass.js";let t=class extends e{get affectsPixelSize(){return!1}forwardTransform(r){return r}inverseTransform(r){return r}};r([o()],t.prototype,"affectsPixelSize",null),r([o({json:{write:!0}})],t.prototype,"spatialReference",void 0),t=r([s("esri.layers.support.rasterTransforms.BaseRasterTransform")],t);export{t as default};
