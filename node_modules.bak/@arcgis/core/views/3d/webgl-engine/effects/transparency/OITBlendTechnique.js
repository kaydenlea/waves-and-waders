/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{ReloadableShaderModule as e}from"../../core/shaderTechnique/ReloadableShaderModule.js";import{ShaderTechnique as r}from"../../core/shaderTechnique/ShaderTechnique.js";import{a as s}from"../../../../../chunks/OITBlend.glsl.js";import{ColorAttachment0 as o,ColorAttachment1 as i}from"../../../../webgl/enums.js";import{makePipelineState as n,defaultColorWrite as l,unpremultipliedAlphaToPremultipliedAlpha as t}from"../../../../webgl/renderState.js";class a extends r{constructor(r,o){super(r,o,new e(s,(()=>import("./OITBlend.glsl.js"))))}initializePipeline(e){return n({blending:t,colorWrite:l,drawBuffers:e.hasEmission?{buffers:[o,i]}:{buffers:[o]}})}}export{a as OITBlendTechnique};
