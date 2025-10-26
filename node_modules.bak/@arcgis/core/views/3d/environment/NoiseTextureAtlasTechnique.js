/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{a as e}from"../../../chunks/NoiseTextureAtlas.glsl.js";import{NoiseTextureRenderMode as r}from"./NoiseTextureAtlasConfiguration.js";import{ReloadableShaderModule as o}from"../webgl-engine/core/shaderTechnique/ReloadableShaderModule.js";import{ShaderTechnique as s}from"../webgl-engine/core/shaderTechnique/ShaderTechnique.js";import{CompareFunction as i,BlendFactor as t}from"../../webgl/enums.js";import{makePipelineState as l,defaultColorWrite as n,copySource as a,separateBlendingParams as m}from"../../webgl/renderState.js";class u extends s{constructor(r,s){super(r,s,new o(e,(()=>import("./NoiseTextureAtlas.glsl.js"))))}initializePipeline(e){return l({blending:e.mode===r.Full?a:m(t.ZERO,t.ONE,t.ONE,t.ZERO),depthTest:{func:i.ALWAYS},colorWrite:n})}}export{u as NoiseTextureAtlasTechnique};
