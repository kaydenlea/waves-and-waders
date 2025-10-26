/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{ReloadableShaderModule as e}from"../core/shaderTechnique/ReloadableShaderModule.js";import{ShaderTechnique as r}from"../core/shaderTechnique/ShaderTechnique.js";import{ShadowCastAccumulateIndex as i}from"./ShadowCastAccumulateTechniqueConfiguration.js";import{S as o}from"../../../../chunks/ShadowCastClear.glsl.js";import{PrimitiveType as t}from"../../../webgl/enums.js";import{makePipelineState as s}from"../../../webgl/renderState.js";class l extends r{constructor(r,i){super(r,i,new e(o,(()=>import("./ShadowCastClear.glsl.js")))),this.primitiveType=t.TRIANGLE_STRIP}initializePipeline(e){const r={r:e.index===i.PRIMARY,g:e.index===i.CONTEXT,b:!1,a:!1};return s({blending:null,colorWrite:r,depthTest:null,depthWrite:null})}}export{l as ShadowCastClearTechnique};
