/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{C as e}from"../../../chunks/CloudsComposition.glsl.js";import{ReloadableShaderModule as o}from"../webgl-engine/core/shaderTechnique/ReloadableShaderModule.js";import{ShaderTechnique as r}from"../webgl-engine/core/shaderTechnique/ShaderTechnique.js";import{CompareFunction as i,BlendFactor as s}from"../../webgl/enums.js";import{makePipelineState as n,defaultColorWrite as t,separateBlendingParams as l}from"../../webgl/renderState.js";class m extends r{constructor(r,i){super(r,i,new o(e,(()=>import("./CloudsComposition.glsl.js"))))}initializePipeline(){return n({blending:l(s.ONE,s.ZERO,s.SRC_ALPHA,s.ONE),depthTest:{func:i.LEQUAL},colorWrite:t})}}export{m as CloudsCompositionTechnique};
