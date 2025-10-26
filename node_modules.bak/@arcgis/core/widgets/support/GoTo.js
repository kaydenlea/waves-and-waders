/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{_ as o}from"../../chunks/tslib.es6.js";import{assertIsSome as r}from"../../core/maybe.js";import{property as s}from"../../core/accessorSupport/decorators/property.js";import"../../core/has.js";import"../../core/Logger.js";import"../../core/RandomLCG.js";import{subclass as t}from"../../core/accessorSupport/decorators/subclass.js";import{goTo as e}from"./goToUtils.js";const i=i=>{let p=class extends i{constructor(...o){super(...o),this.goToOverride=null,this.view=null}callGoTo(o){const{view:s}=this;return r(s),this.goToOverride?this.goToOverride(s,o):e(s,o.target,o.options)}};return o([s()],p.prototype,"goToOverride",void 0),o([s()],p.prototype,"view",void 0),p=o([t("esri.widgets.support.GoTo")],p),p};export{i as default};
