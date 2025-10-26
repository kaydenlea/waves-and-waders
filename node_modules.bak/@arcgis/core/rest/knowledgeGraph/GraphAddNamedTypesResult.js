/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{_ as t}from"../../chunks/tslib.es6.js";import{property as s}from"../../core/accessorSupport/decorators/property.js";import"../../core/has.js";import"../../core/Logger.js";import"../../core/RandomLCG.js";import{subclass as o}from"../../core/accessorSupport/decorators/subclass.js";import e from"./GraphDataModelOperationResult.js";let r=class extends e{constructor(t){super(t),this.entityAddResultsCount=0,this.relationshipAddResultsCount=0,this.entityAddResults=[],this.relationshipAddResults=[]}};t([s()],r.prototype,"entityAddResultsCount",void 0),t([s()],r.prototype,"relationshipAddResultsCount",void 0),t([s()],r.prototype,"entityAddResults",void 0),t([s()],r.prototype,"relationshipAddResults",void 0),r=t([o("esri.rest.knowledgeGraph.GraphAddNamedTypesResult")],r);const p=r;export{p as default};
