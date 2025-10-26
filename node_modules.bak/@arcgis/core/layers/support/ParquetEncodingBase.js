/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{_ as r}from"../../chunks/tslib.es6.js";import o from"../../core/JSONSupport.js";import{property as s}from"../../core/accessorSupport/decorators/property.js";import"../../core/has.js";import"../../core/Logger.js";import"../../core/RandomLCG.js";import{subclass as e}from"../../core/accessorSupport/decorators/subclass.js";let t=class extends o{constructor(){super(...arguments),this.type=null}};r([s({type:["wkb","location"],readOnly:!0,json:{read:!1,write:!0}})],t.prototype,"type",void 0),t=r([e("esri.layers.support.ParquetEncodingBase")],t);export{t as ParquetEncodingBase};
