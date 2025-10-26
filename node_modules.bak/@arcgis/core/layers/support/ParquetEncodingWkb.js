/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{_ as o}from"../../chunks/tslib.es6.js";import r from"../../core/JSONSupport.js";import{property as t}from"../../core/accessorSupport/decorators/property.js";import"../../core/has.js";import"../../core/Logger.js";import"../../core/RandomLCG.js";import{subclass as e}from"../../core/accessorSupport/decorators/subclass.js";let s=class extends r{constructor(o){super(o),this.type="wkb",this.primaryFieldName=null}};o([t({type:["wkb"],readOnly:!0,json:{write:!0}})],s.prototype,"type",void 0),o([t({json:{write:!0}})],s.prototype,"multiscale",void 0),o([t({json:{write:!0}})],s.prototype,"orientation",void 0),o([t({json:{write:!0}})],s.prototype,"primaryFieldName",void 0),s=o([e("esri.layers.support.ParquetEncodingWkb")],s);const p=s;export{p as default};
