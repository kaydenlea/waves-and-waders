/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{_ as r}from"../../chunks/tslib.es6.js";import o from"../../core/JSONSupport.js";import{property as e}from"../../core/accessorSupport/decorators/property.js";import"../../core/has.js";import"../../core/Logger.js";import"../../core/RandomLCG.js";import{subclass as s}from"../../core/accessorSupport/decorators/subclass.js";let t=class extends o{constructor(r){super(r),this.value=null,this.behavior=null}};r([e({type:String,json:{write:!0}})],t.prototype,"value",void 0),r([e({type:String,json:{write:!0}})],t.prototype,"behavior",void 0),t=r([s("esri.rest.knowledgeGraph.SourceTypeValueBehavior")],t);export{t as default};
