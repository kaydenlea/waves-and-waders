/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{_ as e}from"../../chunks/tslib.es6.js";import t from"../../core/Clonable.js";import{property as o}from"../../core/accessorSupport/decorators/property.js";import"../../core/has.js";import"../../core/Logger.js";import"../../core/RandomLCG.js";import{subclass as r}from"../../core/accessorSupport/decorators/subclass.js";import s from"./AttributeTableElement.js";let p=class extends(t.ClonableMixin(s)){constructor(e){super(e),this.displayType="auto",this.type="attachment"}clone(){return super.clone()}};e([o({type:["auto"],json:{write:!0}})],p.prototype,"displayType",void 0),e([o({type:["attachment"],readOnly:!0,json:{read:!1,write:{enabled:!0,isRequired:!0}}})],p.prototype,"type",void 0),p=e([r("esri.tables.elements.AttributeTableAttachmentElement")],p);const a=p;export{a as default};
