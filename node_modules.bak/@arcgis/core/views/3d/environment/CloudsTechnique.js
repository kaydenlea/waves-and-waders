/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{CloudsTextureChannels as e}from"./Clouds.js";import{a as r}from"../../../chunks/Clouds.glsl.js";import{ReloadableShaderModule as o}from"../webgl-engine/core/shaderTechnique/ReloadableShaderModule.js";import{ShaderTechnique as s}from"../webgl-engine/core/shaderTechnique/ShaderTechnique.js";import{CompareFunction as i,BlendOperation as n,BlendFactor as l}from"../../webgl/enums.js";import{makePipelineState as t,defaultColorWrite as m,simpleBlendingParams as u}from"../../webgl/renderState.js";class d extends s{constructor(e,s){super(e,s,new o(r,(()=>import("./Clouds.glsl.js"))))}initializePipeline(r){return t({blending:u(l.CONSTANT_COLOR,l.ONE_MINUS_CONSTANT_COLOR,n.ADD,r.writeTextureChannels===e.RG?[1,1,0,0]:[0,0,1,1]),depthTest:{func:i.LEQUAL},colorWrite:m})}}export{d as CloudsTechnique};
