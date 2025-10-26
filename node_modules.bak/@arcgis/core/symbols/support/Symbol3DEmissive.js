/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{_ as r}from"../../chunks/tslib.es6.js";import o from"../../core/JSONSupport.js";import{property as s}from"../../core/accessorSupport/decorators/property.js";import"../../core/has.js";import"../../core/Logger.js";import"../../core/RandomLCG.js";import{subclass as t}from"../../core/accessorSupport/decorators/subclass.js";var e;let c=e=class extends o{constructor(){super(...arguments),this.strength=null,this.source="emissive"}clone(){const r={strength:this.strength,source:this.source};return new e(r)}};r([s({json:{write:!1}})],c.prototype,"strength",void 0),r([s({json:{write:!1}})],c.prototype,"source",void 0),c=e=r([t("esri.symbols.support.Symbol3DEmissive")],c);export{c as Symbol3DEmissive};
