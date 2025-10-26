/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{_ as s}from"../../../../../../../../../chunks/tslib.es6.js";import{define as i,uniform as r}from"../../../../GraphShaderModule.js";import{Vec4 as t}from"../../../../graph/glsl.js";import{getSurfaceValues as o,hillshade as e,HillshadeConfig as l}from"../surface.js";import{BaseRasterProcessorShader as a}from"./BaseRasterProcessorShader.js";class h extends a{constructor(){super(...arguments),this.type="HillshadeShader",this.isMultidirectional=!1}_process(s){const{texture:i}=this.config,r=o(i,s,this.config.srcImageSize),l=e(r,this.hillshadeConfig,this.isMultidirectional);return new t(l.rgb.multiply(255),l.a)}}s([i],h.prototype,"isMultidirectional",void 0),s([r(l)],h.prototype,"hillshadeConfig",void 0);export{h as HillshadeShader};
