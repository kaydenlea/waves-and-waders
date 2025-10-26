/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{_ as r}from"../../chunks/tslib.es6.js";import o from"../../core/JSONSupport.js";import{property as e}from"../../core/accessorSupport/decorators/property.js";import"../../core/has.js";import"../../core/Logger.js";import"../../core/RandomLCG.js";import{subclass as s}from"../../core/accessorSupport/decorators/subclass.js";let t=class extends o{constructor(r){super(r),this.layerId=""}static fromLayer(r){return new this({layerId:"building-component"===r.type?r.layer.id:r.id,sublayerId:"building-component"===r.type?r.id:void 0})}};r([e({type:String,json:{write:{isRequired:!0}}})],t.prototype,"layerId",void 0),r([e({type:Number,json:{write:!0}})],t.prototype,"sublayerId",void 0),t=r([s("esri.analysis.support.SliceAnalysisExcludedLayer")],t);export{t as SliceAnalysisExcludedLayer};
