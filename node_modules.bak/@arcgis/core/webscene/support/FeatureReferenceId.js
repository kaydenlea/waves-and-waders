/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{_ as o}from"../../chunks/tslib.es6.js";import e from"../../core/Clonable.js";import{JSONMap as r}from"../../core/jsonMap.js";import s from"../../core/JSONSupport.js";import{property as t}from"../../core/accessorSupport/decorators/property.js";import{subclass as p}from"../../core/accessorSupport/decorators/subclass.js";const c=new r({globalId:"global-id",objectId:"object-id"},{ignoreUnknown:!0});let a=class extends(e.ClonableMixin(s)){constructor(o){super(o),this.type=null}};o([t({type:c.apiValues,readOnly:!0,json:{type:c.jsonValues,read:!1,write:!0}})],a.prototype,"type",void 0),a=o([p("esri.webscene.support.FeatureReferenceId")],a);const n=a;export{n as default};
