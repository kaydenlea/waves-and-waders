/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{_ as o}from"../../chunks/tslib.es6.js";import{clone as r}from"../../core/lang.js";import{property as t}from"../../core/accessorSupport/decorators/property.js";import"../../core/has.js";import"../../core/Logger.js";import{subclass as s}from"../../core/accessorSupport/decorators/subclass.js";import p from"./AlgorithmicColorRamp.js";import e from"./ColorRamp.js";var m;let a=m=class extends e{constructor(o){super(o),this.colorRamps=null,this.type="multipart"}clone(){return new m({colorRamps:r(this.colorRamps)})}};o([t({type:[p],json:{write:!0}})],a.prototype,"colorRamps",void 0),o([t({type:["multipart"]})],a.prototype,"type",void 0),a=m=o([s("esri.rest.support.MultipartColorRamp")],a);export{a as default};
