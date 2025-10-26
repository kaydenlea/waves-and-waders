/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{_ as o}from"../../chunks/tslib.es6.js";import r from"../../core/JSONSupport.js";import{property as s}from"../../core/accessorSupport/decorators/property.js";import"../../core/has.js";import"../../core/Logger.js";import"../../core/RandomLCG.js";import{subclass as e}from"../../core/accessorSupport/decorators/subclass.js";import t from"./ImageInspectionInfo.js";let p=class extends r{constructor(){super(...arguments),this.images=null}};o([s({type:[t],json:{write:!0}})],p.prototype,"images",void 0),p=o([e("esri.rest.support.FindImagesResult")],p);export{p as default};
