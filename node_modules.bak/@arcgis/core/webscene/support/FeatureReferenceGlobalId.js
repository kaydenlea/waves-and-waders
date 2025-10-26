/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{_ as e}from"../../chunks/tslib.es6.js";import{enumeration as r}from"../../core/accessorSupport/decorators/enumeration.js";import{property as o}from"../../core/accessorSupport/decorators/property.js";import{subclass as s}from"../../core/accessorSupport/decorators/subclass.js";import t from"./FeatureReferenceId.js";let p=class extends t{constructor(e){super(e),this.type="global-id",this.value=null}};e([r({globalId:"global-id"}),o({type:["global-id"],json:{read:!1,write:{isRequired:!0}},nonNullable:!0})],p.prototype,"type",void 0),e([o({type:String,json:{read:!0,write:{isRequired:!0}}})],p.prototype,"value",void 0),p=e([s("esri.webscene.support.FeatureReferenceGlobalId")],p);const a=p;export{a as default};
