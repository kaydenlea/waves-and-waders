/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{_ as o}from"../../chunks/tslib.es6.js";import r from"../../core/Accessor.js";import{property as e}from"../../core/accessorSupport/decorators/property.js";import"../../core/has.js";import"../../core/Logger.js";import"../../core/RandomLCG.js";import{subclass as s}from"../../core/accessorSupport/decorators/subclass.js";let t=class extends r{constructor(o){super(o),this.decoderError=null,this.resultsCount=0,this.results=[],this.updatedKnowledgeGraph=null}};o([e()],t.prototype,"decoderError",void 0),o([e()],t.prototype,"resultsCount",void 0),o([e()],t.prototype,"results",void 0),o([e()],t.prototype,"updatedKnowledgeGraph",void 0),t=o([s("esri.rest.knowledgeGraph.GraphDataModelOperationResult")],t);const p=t;export{p as default};
