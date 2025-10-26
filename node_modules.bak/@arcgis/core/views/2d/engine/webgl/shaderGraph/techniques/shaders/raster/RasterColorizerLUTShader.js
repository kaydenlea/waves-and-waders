/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{_ as r}from"../../../../../../../../chunks/tslib.es6.js";import{uniform as o}from"../../../GraphShaderModule.js";import{Float as s}from"../../../graph/glsl.js";import{BaseRasterColorizerShader as t}from"./BaseRasterColorizerShader.js";import{lookupColor as e,ColormapConfig as i}from"./lut.js";class p extends t{constructor(){super(...arguments),this.type="RasterColorizerLUTShader"}_colorize(r){const o=this._getPixel(r);return e(o,new s(1),this.colormapConfig,!1)}}r([o(i)],p.prototype,"colormapConfig",void 0);export{p as RasterColorizerLUTShader};
