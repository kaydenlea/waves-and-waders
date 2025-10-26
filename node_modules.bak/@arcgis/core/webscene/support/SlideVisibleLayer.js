/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{_ as r}from"../../chunks/tslib.es6.js";import o from"../../core/Clonable.js";import s from"../../core/JSONSupport.js";import{property as e}from"../../core/accessorSupport/decorators/property.js";import{Integer as t}from"../../core/accessorSupport/ensureType.js";import"../../core/has.js";import"../../core/RandomLCG.js";import{subclass as p}from"../../core/accessorSupport/decorators/subclass.js";let i=class extends(o.ClonableMixin(s)){constructor(r){super(r),this.id="",this.sublayerIds=null}};r([e({type:String,json:{write:!0}})],i.prototype,"id",void 0),r([e({type:[t],json:{name:"subLayerIds",write:!0}})],i.prototype,"sublayerIds",void 0),i=r([p("esri.webscene.support.SlideVisibleLayer")],i);export{i as SlideVisibleLayer};
