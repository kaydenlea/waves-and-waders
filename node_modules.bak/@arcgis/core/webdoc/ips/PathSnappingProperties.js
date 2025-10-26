/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{_ as o}from"../../chunks/tslib.es6.js";import e from"../../core/Clonable.js";import r from"../../core/JSONSupport.js";import{property as t}from"../../core/accessorSupport/decorators/property.js";import"../../core/has.js";import"../../core/Logger.js";import"../../core/RandomLCG.js";import{subclass as s}from"../../core/accessorSupport/decorators/subclass.js";let p=class extends(e.ClonableMixin(r)){constructor(o){super(o),this.enabled=!0,this.distance=5,this.units="meter"}};o([t({type:Boolean,nonNullable:!0,json:{write:!0}})],p.prototype,"enabled",void 0),o([t({type:Number,nonNullable:!0,json:{write:!0}})],p.prototype,"distance",void 0),o([t({type:["feet","meter"],nonNullable:!0,json:{write:!0}})],p.prototype,"units",void 0),p=o([s("esri.webdoc.ips.PathSnappingProperties")],p);const i=p;export{i as default};
