/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{_ as r}from"../../chunks/tslib.es6.js";import e from"../../core/Clonable.js";import o from"../../core/JSONSupport.js";import{property as s}from"../../core/accessorSupport/decorators/property.js";import{subclass as t}from"../../core/accessorSupport/decorators/subclass.js";let p=class extends(e.ClonableMixin(o)){constructor(r){super(r),this.layerId=null,this.sublayerId=null}};r([s({type:String,json:{write:{isRequired:!0}},nonNullable:!0})],p.prototype,"layerId",void 0),r([s({type:Number,json:{write:!0}})],p.prototype,"sublayerId",void 0),p=r([t("esri.webscene.support.LayerReference")],p);const l=p;export{l as default};
