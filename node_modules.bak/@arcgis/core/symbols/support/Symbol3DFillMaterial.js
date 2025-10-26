/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{_ as o}from"../../chunks/tslib.es6.js";import"../../core/Logger.js";import"../../core/has.js";import"../../core/RandomLCG.js";import"../../core/Error.js";import{enumeration as r}from"../../core/accessorSupport/decorators/enumeration.js";import{subclass as e}from"../../core/accessorSupport/decorators/subclass.js";import{Symbol3DMaterial as s}from"./Symbol3DMaterial.js";var t;let l=t=class extends s{constructor(o){super(o),this.colorMixMode=null}clone(){const o={color:this.color?.clone()??null,colorMixMode:this.colorMixMode,emissive:this.emissive?.clone()??null};return new t(o)}};o([r({multiply:"multiply",replace:"replace",tint:"tint"})],l.prototype,"colorMixMode",void 0),l=t=o([e("esri.symbols.support.Symbol3DFillMaterial")],l);export{l as Symbol3DFillMaterial};
