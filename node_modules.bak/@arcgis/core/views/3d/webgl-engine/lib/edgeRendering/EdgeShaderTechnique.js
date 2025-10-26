/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{ReloadableShaderModule as e}from"../../core/shaderTechnique/ReloadableShaderModule.js";import{ShaderTechnique as r}from"../../core/shaderTechnique/ShaderTechnique.js";import{vertexAttributeLocations as s}from"./bufferLayouts.js";import{E as o}from"../../../../../chunks/EdgeShader.glsl.js";import{CompareFunction as t,BlendOperation as i,BlendFactor as d}from"../../../../webgl/enums.js";import{makePipelineState as n,defaultColorWrite as a,separateBlendingParams as l}from"../../../../webgl/renderState.js";class m extends r{constructor(r,t){super(r,t,new e(o,(()=>import("../../shaders/sources/edgeRenderer/EdgeShader.glsl.js"))),s)}initializePipeline(){return n({blending:l(d.ONE,d.ONE,d.ZERO,d.ONE,i.ADD,i.MAX),depthTest:{func:t.LEQUAL},colorWrite:a})}}export{m as EdgeShaderTechnique};
