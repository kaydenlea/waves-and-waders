/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{a as e}from"../../../../chunks/TextureOnly.glsl.js";import{ReloadableShaderModule as r}from"../core/shaderTechnique/ReloadableShaderModule.js";import{ShaderTechnique as o}from"../core/shaderTechnique/ShaderTechnique.js";import{makePipelineState as i,defaultColorWrite as l,unpremultipliedAlphaToPremultipliedAlpha as s}from"../../../webgl/renderState.js";class t extends o{constructor(o,i){super(o,i,new r(e,(()=>import("../core/shaderLibrary/util/TextureOnly.glsl.js"))))}initializePipeline(e){return e.hasAlpha?i({blending:s,colorWrite:l}):i({colorWrite:l})}}export{t as TextureTechnique};
