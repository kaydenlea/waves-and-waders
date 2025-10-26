/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{_ as o}from"../chunks/tslib.es6.js";import r from"../Color.js";import s from"../core/Clonable.js";import e from"../core/JSONSupport.js";import{property as t}from"../core/accessorSupport/decorators/property.js";import{Integer as p}from"../core/accessorSupport/ensureType.js";import"../core/has.js";import"../core/RandomLCG.js";import{subclass as c}from"../core/accessorSupport/decorators/subclass.js";let i=class extends(s.ClonableMixin(e)){constructor(o){super(o),this.color=null}};o([t({type:r,json:{type:[p],write:!0}})],i.prototype,"color",void 0),i=o([c("esri.effects.FocusAreaOutline")],i);const m=i;export{m as default};
