/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{_ as r}from"../../../../chunks/tslib.es6.js";import t from"../../../../core/JSONSupport.js";import{property as o}from"../../../../core/accessorSupport/decorators/property.js";import"../../../../core/has.js";import"../../../../core/Logger.js";import"../../../../core/RandomLCG.js";import{subclass as s}from"../../../../core/accessorSupport/decorators/subclass.js";let e=class extends t{constructor(r){super(r),this.circuits=null,this.circuitNames=null}};r([o({type:[Object],json:{type:[Object],write:!0}})],e.prototype,"circuits",void 0),r([o({type:[String],json:{write:!0}})],e.prototype,"circuitNames",void 0),e=r([s("esri.rest.networks.circuits.support.QueryCircuitsResult")],e);export{e as default};
