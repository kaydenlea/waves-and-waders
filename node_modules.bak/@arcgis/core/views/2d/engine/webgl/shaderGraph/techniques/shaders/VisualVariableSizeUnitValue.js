/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{_ as t}from"../../../../../../../chunks/tslib.es6.js";import{uniform as o,UniformGroup as i}from"../../GraphShaderModule.js";import{Float as s,ifElse as r}from"../../graph/glsl.js";import{isNan as e}from"./utils.js";class l extends i{getSize(t,o){return r(e(t),o,t.multiply(this.unitValueToPixelsRatio))}}t([o(s)],l.prototype,"unitValueToPixelsRatio",void 0);export{l as VisualVariableSizeUnitValue};
