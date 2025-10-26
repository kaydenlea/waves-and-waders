/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{_ as r}from"../chunks/tslib.es6.js";import e from"../core/JSONSupport.js";import{property as t}from"../core/accessorSupport/decorators/property.js";import"../core/has.js";import"../core/Logger.js";import"../core/RandomLCG.js";import{subclass as o}from"../core/accessorSupport/decorators/subclass.js";var s;let i=class extends e{static{s=this}constructor(r){super(r),this.type="virtual",this.directShadowsEnabled=!1}clone(){return new s(this.cloneConstructProperties())}cloneConstructProperties(){return{directShadowsEnabled:this.directShadowsEnabled}}};r([t({readOnly:!0,type:["virtual"],json:{write:{isRequired:!0}}})],i.prototype,"type",void 0),r([t({type:Boolean,json:{default:!1,name:"directShadows",write:!0}})],i.prototype,"directShadowsEnabled",void 0),i=s=r([o("esri.webscene.VirtualLighting")],i);const c=i;export{c as default};
