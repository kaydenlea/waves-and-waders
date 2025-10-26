/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{_ as o}from"../../chunks/tslib.es6.js";import r from"../../core/JSONSupport.js";import{property as e}from"../../core/accessorSupport/decorators/property.js";import"../../core/has.js";import"../../core/Logger.js";import"../../core/RandomLCG.js";import{subclass as t}from"../../core/accessorSupport/decorators/subclass.js";import{fromJSON as s}from"../../geometry/support/jsonUtils.js";import{geometryTypes as p}from"../../geometry/support/typeUtils.js";let m=class extends r{constructor(){super(...arguments),this.geometry=null,this.length=null}};o([e({types:p,json:{name:"Shape",read:s,write:!0}})],m.prototype,"geometry",void 0),o([e({json:{name:"Length",write:!0}})],m.prototype,"length",void 0),m=o([t("esri.rest.support.MeasureLengthFromImageResult")],m);export{m as default};
