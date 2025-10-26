/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{_ as t}from"../../../../../../../chunks/tslib.es6.js";import{uniform as e,UniformGroup as r}from"../../GraphShaderModule.js";import{Vec4 as s,ifElse as i,clamp as a,Float as o}from"../../graph/glsl.js";import{isNan as n}from"./utils.js";class m extends r{getSize(t,e){const r=this.minMaxValueAndSize.xy,s=this.minMaxValueAndSize.zw;return i(n(t),e,(()=>{const e=t.subtract(r.x).divide(r.y.subtract(r.x)),i=a(e,new o(0),new o(1));return s.x.add(i.multiply(s.y.subtract(s.x)))}))}}t([e(s)],m.prototype,"minMaxValueAndSize",void 0);export{m as VisualVariableSizeMinMaxValue};
