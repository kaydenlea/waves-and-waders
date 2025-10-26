/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{_ as o}from"../chunks/tslib.es6.js";import r from"../core/Clonable.js";import i from"../core/JSONSupport.js";import{property as s}from"../core/accessorSupport/decorators/property.js";import"../core/has.js";import"../core/Logger.js";import"../core/RandomLCG.js";import{subclass as t}from"../core/accessorSupport/decorators/subclass.js";import e from"./ips/Configuration.js";import p from"./ips/PositioningService.js";let c=class extends(r.ClonableMixin(i)){constructor(o){super(o),this.positioningService=null,this.configuration=null}};o([s({type:p,json:{write:{isRequired:!0}}})],c.prototype,"positioningService",void 0),o([s({type:e,json:{write:!0}})],c.prototype,"configuration",void 0),c=o([t("esri.webdoc.IPSInfo")],c);const n=c;export{n as default};
