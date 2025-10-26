/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{ReloadableShaderModule as e}from"../core/shaderTechnique/ReloadableShaderModule.js";import{ShaderTechnique as r}from"../core/shaderTechnique/ShaderTechnique.js";import{a as i}from"../../../../chunks/Viewshed.glsl.js";import{makePipelineState as o,unpremultipliedAlphaToPremultipliedAlpha as s,defaultColorWrite as t}from"../../../webgl/renderState.js";class l extends r{constructor(r,o){super(r,o,new e(i,(()=>import("./Viewshed.glsl.js"))))}initializePipeline(){return o({colorWrite:t,blending:s})}}export{l as ViewshedTechnique};
