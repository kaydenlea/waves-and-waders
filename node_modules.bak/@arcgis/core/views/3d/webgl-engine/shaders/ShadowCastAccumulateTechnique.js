/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{ReloadableShaderModule as e}from"../core/shaderTechnique/ReloadableShaderModule.js";import{ShaderTechnique as r}from"../core/shaderTechnique/ShaderTechnique.js";import{a as t}from"../../../../chunks/ShadowCastAccumulate.glsl.js";import{ShadowCastAccumulateIndex as i}from"./ShadowCastAccumulateTechniqueConfiguration.js";import{PrimitiveType as o}from"../../../webgl/enums.js";import{makePipelineState as s,add as a}from"../../../webgl/renderState.js";class n extends r{constructor(r,i){super(r,i,new e(t,(()=>import("./ShadowCastAccumulate.glsl.js")))),this.primitiveType=o.TRIANGLE_STRIP}initializePipeline(e){const r={r:e.index===i.PRIMARY,g:e.index===i.CONTEXT,b:!1,a:!1};return s({blending:a,colorWrite:r,depthTest:null,depthWrite:null})}}export{n as ShadowCastAccumulateTechnique};
