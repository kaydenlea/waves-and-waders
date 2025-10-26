/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{_ as s}from"../../../../../../../../../chunks/tslib.es6.js";import{uniform as r,UniformGroup as e}from"../../../../GraphShaderModule.js";import{dot as o,Vec4 as t,Vec3 as a}from"../../../../graph/glsl.js";import{BaseRasterProcessorShader as i}from"./BaseRasterProcessorShader.js";class p extends e{}s([r(a)],p.prototype,"weights",void 0);class c extends i{constructor(){super(...arguments),this.type="GrayscaleShader"}_process(s){const r=this._getPixel(s),{weights:e}=this.grayscaleConfig,a=o(e,r.rgb);return new t(a,a,a,r.a)}}s([r(p)],c.prototype,"grayscaleConfig",void 0);export{c as GrayscaleShader};
