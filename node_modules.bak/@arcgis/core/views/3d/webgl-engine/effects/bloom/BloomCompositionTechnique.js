/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{ReloadableShaderModule as e}from"../../core/shaderTechnique/ReloadableShaderModule.js";import{ShaderTechnique as o}from"../../core/shaderTechnique/ShaderTechnique.js";import{a as r}from"../../../../../chunks/BloomComposition.glsl.js";import{makePipelineState as i,defaultColorWrite as s}from"../../../../webgl/renderState.js";class t extends o{constructor(o,i){super(o,i,new e(r,(()=>import("./BloomComposition.glsl.js"))))}initializePipeline(){return i({colorWrite:s})}}export{t as BloomCompositionTechnique};
