/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{_ as r}from"../../../chunks/tslib.es6.js";import o from"../../../core/Accessor.js";import{property as s}from"../../../core/accessorSupport/decorators/property.js";import"../../../core/has.js";import"../../../core/Logger.js";import"../../../core/RandomLCG.js";import{subclass as e}from"../../../core/accessorSupport/decorators/subclass.js";var t;let i=t=class extends o{constructor(r){super(r),this.isInverse=!1,this.wkt=null,this.wkid=null}getInverse(){return new t({isInverse:!this.isInverse,wkid:this.wkid,wkt:this.wkt})}};r([s()],i.prototype,"isInverse",void 0),r([s()],i.prototype,"wkt",void 0),r([s()],i.prototype,"wkid",void 0),i=t=r([e("esri.geometry.operators.support.GeographicTransformationStep")],i);export{i as default};
