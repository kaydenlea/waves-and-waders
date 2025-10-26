/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{ReloadableShaderModule as e}from"../../core/shaderTechnique/ReloadableShaderModule.js";import{ShaderTechnique as r}from"../../core/shaderTechnique/ShaderTechnique.js";import{a as i}from"../../../../../chunks/HighlightBlur.glsl.js";import{makePipelineState as o,defaultColorWrite as s}from"../../../../webgl/renderState.js";class l extends r{constructor(r,o){super(r,o,new e(i,(()=>import("../../shaders/HighlightBlur.glsl.js"))))}initializePipeline(){return o({colorWrite:s})}}export{l as HighlightBlurTechnique};
