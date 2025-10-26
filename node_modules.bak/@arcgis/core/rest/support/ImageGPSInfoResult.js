/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{_ as o}from"../../chunks/tslib.es6.js";import r from"../../core/JSONSupport.js";import{property as s}from"../../core/accessorSupport/decorators/property.js";import"../../core/has.js";import"../../core/Logger.js";import"../../core/RandomLCG.js";import{subclass as e}from"../../core/accessorSupport/decorators/subclass.js";import t from"./CameraInfo.js";import p from"./ImageGPSInfo.js";let m=class extends r{constructor(){super(...arguments),this.images=null,this.cameras=null}};o([s({type:[p],json:{write:!0}})],m.prototype,"images",void 0),o([s({type:[t],json:{write:!0}})],m.prototype,"cameras",void 0),m=o([e("esri.rest.support.ImageGPSInfoResult")],m);export{m as default};
