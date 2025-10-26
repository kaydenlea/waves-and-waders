/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{_ as o}from"../../chunks/tslib.es6.js";import r from"../../core/Clonable.js";import s from"../../core/JSONSupport.js";import{property as e}from"../../core/accessorSupport/decorators/property.js";import"../../core/has.js";import"../../core/Logger.js";import"../../core/RandomLCG.js";import{subclass as t}from"../../core/accessorSupport/decorators/subclass.js";let p=class extends(r.ClonableMixin(s)){constructor(){super(...arguments),this.text=""}};o([e({type:String,json:{write:{isRequired:!0}}})],p.prototype,"text",void 0),p=o([t("esri.webscene.support.Title")],p);const c=p;export{c as default};
