/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{ReloadableShaderModule as e}from"../../core/shaderTechnique/ReloadableShaderModule.js";import{ShaderTechnique as r}from"../../core/shaderTechnique/ShaderTechnique.js";import{a as i}from"../../../../../chunks/Magnifier.glsl.js";import{makePipelineState as s,defaultColorWrite as o,premultipliedAlpha as t}from"../../../../webgl/renderState.js";class l extends r{constructor(r,s){super(r,s,new e(i,(()=>import("../../shaders/Magnifier.glsl.js"))))}initializePipeline(){return s({blending:t,depthTest:null,depthWrite:null,colorWrite:o})}}export{l as MagnifierTechnique};
