/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{ReloadableShaderModule as e}from"../../core/shaderTechnique/ReloadableShaderModule.js";import{ShaderTechnique as r}from"../../core/shaderTechnique/ShaderTechnique.js";import{H as i}from"../../../../../chunks/HighlightApply.glsl.js";import{makePipelineState as o,defaultColorWrite as s,unpremultipliedAlphaToPremultipliedAlpha as l}from"../../../../webgl/renderState.js";class t extends r{constructor(r,o){super(r,o,new e(i,(()=>import("../../shaders/HighlightApply.glsl.js"))))}initializePipeline(){return o({blending:l,colorWrite:s})}}export{t as HighlightApplyTechnique};
