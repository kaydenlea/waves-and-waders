/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{_ as t}from"../../../../chunks/tslib.es6.js";import{property as r}from"../../../../core/accessorSupport/decorators/property.js";import"../../../../core/has.js";import"../../../../core/Logger.js";import"../../../../core/RandomLCG.js";import{subclass as e}from"../../../../core/accessorSupport/decorators/subclass.js";import{TemplatePartBase as o}from"./TemplatePartBase.js";import{fromJSON as s}from"../../../../geometry/support/jsonUtils.js";import{geometryTypes as p}from"../../../../geometry/support/typeUtils.js";let m=class extends o{constructor(t){super(t),this.geometry=null,this.type="preset"}assertIsSupportedPart(){}};t([r({types:p,json:{read:s}})],m.prototype,"geometry",void 0),t([r()],m.prototype,"type",void 0),m=t([e("esri.editing.sharedTemplates.templateDefinitions.parts.PresetTemplatePart")],m);const a=m;export{a as default};
