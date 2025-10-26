/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{_ as o}from"../../../../../../../../../chunks/tslib.es6.js";import{uniform as r}from"../../../../GraphShaderModule.js";import{Float as s,Vec4 as t}from"../../../../graph/glsl.js";import{lookupColor as e,ColormapConfig as p}from"../lut.js";import{BaseRasterProcessorShader as i}from"./BaseRasterProcessorShader.js";class m extends i{constructor(){super(...arguments),this.type="ColormapToRGBShader"}_process(o){const r=this._getPixel(o),p=e(r,new s(1),this.colormapConfig,!1);return new t(p.xyz.multiply(255),p.a)}}o([r(p)],m.prototype,"colormapConfig",void 0);export{m as ColormapToRGBShader};
