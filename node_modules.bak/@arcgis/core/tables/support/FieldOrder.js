/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{_ as o}from"../../chunks/tslib.es6.js";import r from"../../core/Clonable.js";import s from"../../core/JSONSupport.js";import{property as e}from"../../core/accessorSupport/decorators/property.js";import"../../core/has.js";import"../../core/Logger.js";import"../../core/RandomLCG.js";import{subclass as t}from"../../core/accessorSupport/decorators/subclass.js";let p=class extends(r.ClonableMixin(s)){constructor(o){super(o),this.field=null,this.order=null}};o([e({type:String,json:{write:!0}})],p.prototype,"field",void 0),o([e({type:["asc","desc"],json:{write:!0}})],p.prototype,"order",void 0),p=o([t("esri.tables.support.FieldOrder")],p);const i=p;export{i as default};
