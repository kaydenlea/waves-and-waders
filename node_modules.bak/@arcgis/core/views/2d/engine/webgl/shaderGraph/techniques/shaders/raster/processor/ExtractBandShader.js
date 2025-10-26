/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{_ as t}from"../../../../../../../../../chunks/tslib.es6.js";import{uniform as r,UniformGroup as s}from"../../../../GraphShaderModule.js";import{Vec4 as e,Mat3 as o}from"../../../../graph/glsl.js";import{BaseRasterProcessorShader as a}from"./BaseRasterProcessorShader.js";class n extends s{}t([r(o)],n.prototype,"bandIndexMat3",void 0);class d extends a{constructor(){super(...arguments),this.type="ExtractBandShader"}_process(t){const r=this._getPixel(t),s=this.extractBandConfig.bandIndexMat3.multiply(r.rgb);return new e(s,r.a)}}t([r(n)],d.prototype,"extractBandConfig",void 0);export{d as ExtractBandShader};
