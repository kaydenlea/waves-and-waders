/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{_ as o}from"../../chunks/tslib.es6.js";import r from"../../core/Clonable.js";import e from"../../core/JSONSupport.js";import{property as s}from"../../core/accessorSupport/decorators/property.js";import{ensureType as t}from"../../core/accessorSupport/ensureType.js";import"../../core/has.js";import"../../core/RandomLCG.js";import{enumeration as p}from"../../core/accessorSupport/decorators/enumeration.js";import{subclass as i}from"../../core/accessorSupport/decorators/subclass.js";import{unitsDict as c}from"./DateBinUtils.js";let m=class extends(r.ClonableMixin(e)){constructor(o){super(o),this.value=null,this.unit=null}};o([s({type:Number,json:{name:"number",write:!0}})],m.prototype,"value",void 0),o([p(c)],m.prototype,"unit",void 0),m=o([i("esri.rest.support.DateBinTimeInterval")],m);const a=m;m.from=t(m);export{a as default};
