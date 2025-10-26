/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{_ as o}from"../../chunks/tslib.es6.js";import{JSONMap as r}from"../../core/jsonMap.js";import e from"../../core/JSONSupport.js";import{property as s}from"../../core/accessorSupport/decorators/property.js";import"../../core/has.js";import"../../core/Logger.js";import"../../core/RandomLCG.js";import{enumeration as t}from"../../core/accessorSupport/decorators/enumeration.js";import{subclass as p}from"../../core/accessorSupport/decorators/subclass.js";const i=new r({inherited:"inherited",codedValue:"coded-value",range:"range"});let c=class extends e{constructor(o){super(o),this.name=null,this.type=null}};o([s({type:String,json:{write:!0}})],c.prototype,"name",void 0),o([t(i),s({json:{write:{isRequired:!0}}})],c.prototype,"type",void 0),c=o([p("esri.layers.support.Domain")],c);export{c as default};
