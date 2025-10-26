/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{clone as s}from"../lang.js";import{OriginId as e}from"./PropertyOrigin.js";class t{constructor(){this._values=new Map,this.multipleOriginsSupported=!1}clone(e){const r=new t;return this._values.forEach(((t,i)=>{e&&e.has(i)||r.set(i,s(t))})),r}get(s){return this._values.get(s)}originOf(){return e.USER}keys(){return[...this._values.keys()]}set(s,e){this._values.set(s,e)}delete(s){this._values.delete(s)}has(s){return this._values.has(s)}isAtOrigin(s,e){return this.has(s)}isBelowOrigin(s,e){return!this.has(s)}forEach(s){this._values.forEach(s)}}export{t as Store};
