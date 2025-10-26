/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{_ as r}from"../../chunks/tslib.es6.js";import o from"../../core/Clonable.js";import t from"../../core/JSONSupport.js";import{property as e}from"../../core/accessorSupport/decorators/property.js";import"../../core/has.js";import"../../core/Logger.js";import"../../core/RandomLCG.js";import{subclass as s}from"../../core/accessorSupport/decorators/subclass.js";let p=class extends(o.ClonableMixin(t)){constructor(r){super(r),this.expression=null,this.title=null,this.returnType=null}};r([e({type:String,json:{write:!0}})],p.prototype,"expression",void 0),r([e({type:String,json:{write:!0}})],p.prototype,"title",void 0),r([e({type:String,json:{write:!0}})],p.prototype,"returnType",void 0),p=r([s("esri.layers.support.ExpressionInfo")],p);export{p as default};
