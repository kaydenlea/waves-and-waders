/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{ReloadableShaderModule as e}from"../../core/shaderTechnique/ReloadableShaderModule.js";import{ShaderTechnique as r}from"../../core/shaderTechnique/ShaderTechnique.js";import{a as o}from"../../../../../chunks/HazeCompositing.glsl.js";import{CompareFunction as i,BlendFactor as s}from"../../../../webgl/enums.js";import{makePipelineState as t,defaultColorWrite as n,separateBlendingParams as l}from"../../../../webgl/renderState.js";class m extends r{constructor(r,i){super(r,i,new e(o,(()=>import("./HazeCompositing.glsl.js"))))}initializePipeline(){return t({blending:l(s.ONE,s.ZERO,s.ONE_MINUS_SRC_COLOR,s.ONE),depthTest:{func:i.ALWAYS},colorWrite:n})}}export{m as HazeCompositingTechnique};
