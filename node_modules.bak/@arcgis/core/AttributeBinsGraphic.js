/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{_ as t}from"./chunks/tslib.es6.js";import r from"./Graphic.js";import s from"./core/Clonable.js";import{clone as o}from"./core/lang.js";import{property as e}from"./core/accessorSupport/decorators/property.js";import"./core/has.js";import"./core/Logger.js";import{subclass as c}from"./core/accessorSupport/decorators/subclass.js";var i;let a=class extends(s.ClonableMixin(r)){static{i=this}constructor(t){super(t),this.stackedAttributes=null}cloneShallow(){return new i({...super.cloneShallow(),stackedAttributes:this.stackedAttributes})}toJSON(){return{...super.toJSON(),stackedAttributes:o(this.stackedAttributes)}}};t([e()],a.prototype,"stackedAttributes",void 0),a=i=t([c("esri.AttributeBinsGraphic")],a);export{a as default};
