/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{a as e}from"../../../chunks/SimpleAtmosphere.glsl.js";import{SimpleAtmosphereGeometry as r}from"./SimpleAtmosphereTechniqueConfiguration.js";import{ReloadableShaderModule as o}from"../webgl-engine/core/shaderTechnique/ReloadableShaderModule.js";import{ShaderTechnique as i}from"../webgl-engine/core/shaderTechnique/ShaderTechnique.js";import{CompareFunction as n}from"../../webgl/enums.js";import{makePipelineState as s,defaultColorWrite as t,backFaceCullingParams as l,unpremultipliedAlphaToPremultipliedAlpha as m}from"../../webgl/renderState.js";class p extends i{constructor(r,i){super(r,i,new o(e,(()=>import("./SimpleAtmosphere.glsl.js"))))}initializePipeline(e){const o=e.geometry===r.Cylinder;return s({blending:m,culling:o?l:void 0,depthTest:{func:n.LEQUAL},colorWrite:t})}}export{p as SimpleAtmosphereTechnique};
