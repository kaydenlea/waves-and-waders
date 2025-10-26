/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{ReloadableShaderModule as e}from"../core/shaderTechnique/ReloadableShaderModule.js";import{ShaderTechnique as r,depthOnlyOutputBuffersOr as t}from"../core/shaderTechnique/ShaderTechnique.js";import{stencilBaseAllZerosParams as s,stencilWriteMaskOn as i}from"../lib/StencilUtils.js";import{b as o}from"../../../../chunks/PointRenderer.glsl.js";import{CompareFunction as l}from"../../../webgl/enums.js";import{makePipelineState as n,defaultColorWrite as c,defaultDepthWrite as u}from"../../../webgl/renderState.js";class d extends r{constructor(r,t){super(r,t,new e(o,(()=>import("./PointRenderer.glsl.js"))))}initializePipeline(e){return n({depthTest:{func:l.LESS},depthWrite:u,colorWrite:c,stencilWrite:e.hasOccludees?i:null,stencilTest:e.hasOccludees?s:null,drawBuffers:t(e.output)})}}export{d as PointRendererTechnique};
