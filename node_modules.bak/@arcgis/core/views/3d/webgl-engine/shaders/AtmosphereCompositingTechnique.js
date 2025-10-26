/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{ReloadableShaderModule as e}from"../core/shaderTechnique/ReloadableShaderModule.js";import{ShaderTechnique as r}from"../core/shaderTechnique/ShaderTechnique.js";import{a as o}from"../../../../chunks/AtmosphereCompositing.glsl.js";import{CompareFunction as s,BlendFactor as i}from"../../../webgl/enums.js";import{makePipelineState as t,defaultColorWrite as n,simpleBlendingParams as m}from"../../../webgl/renderState.js";class l extends r{constructor(r,s){super(r,s,new e(o,(()=>import("./AtmosphereCompositing.glsl.js"))))}initializePipeline(){return t({blending:m(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA),depthTest:{func:s.ALWAYS},colorWrite:n})}}export{l as AtmosphereCompositingTechnique};
