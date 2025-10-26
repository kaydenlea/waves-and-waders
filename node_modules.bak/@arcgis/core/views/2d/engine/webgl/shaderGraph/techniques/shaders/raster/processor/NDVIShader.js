/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{_ as t}from"../../../../../../../../../chunks/tslib.es6.js";import{uniform as s,define as r,UniformGroup as e}from"../../../../GraphShaderModule.js";import{Vec4 as o,floor as a,Mat3 as i}from"../../../../graph/glsl.js";import{BaseRasterProcessorShader as d}from"./BaseRasterProcessorShader.js";import{invertValue as p}from"./math.js";class n extends e{}t([s(i)],n.prototype,"bandIndexMat3",void 0);class l extends d{constructor(){super(...arguments),this.type="NDVIShader",this.scaled=!0}_process(t){const s=this._getPixel(t),{r,g:e}=this.ndviConfig.bandIndexMat3.multiply(s.rgb),i=r.subtract(e),d=r.add(e),n=i.multiply(p(d));if(!this.scaled)return new o(n,n,n,s.a);const l=a(n.multiply(100).add(100.5));return new o(l,l,l,s.a)}}t([r],l.prototype,"scaled",void 0),t([s(n)],l.prototype,"ndviConfig",void 0);export{l as NDVIShader};
