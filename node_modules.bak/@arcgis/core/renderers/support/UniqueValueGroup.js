/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{_ as r}from"../../chunks/tslib.es6.js";import o from"../../core/Clonable.js";import s from"../../core/JSONSupport.js";import{property as e}from"../../core/accessorSupport/decorators/property.js";import"../../core/has.js";import"../../core/Logger.js";import"../../core/RandomLCG.js";import{subclass as t}from"../../core/accessorSupport/decorators/subclass.js";import p from"./UniqueValueClass.js";let i=class extends(o.ClonableMixin(s)){constructor(r){super(r),this.heading=null,this.classes=null}};r([e({type:String,json:{write:!0}})],i.prototype,"heading",void 0),r([e({type:[p],json:{write:{isRequired:!0}}})],i.prototype,"classes",void 0),i=r([t("esri.renderers.support.UniqueValueGroup")],i);export{i as default};
