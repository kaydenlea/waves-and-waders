/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{ScreenSpacePass as e}from"../views/3d/webgl-engine/core/shaderLibrary/ScreenSpacePass.glsl.js";import{calculateUVZShadowFromDepthPass as a}from"../views/3d/webgl-engine/core/shaderLibrary/shading/calculateUVZShadowFromDepth.glsl.js";import{ReadShadowMapPass as o}from"../views/3d/webgl-engine/core/shaderLibrary/shading/ReadShadowMap.glsl.js";import{glsl as s}from"../views/3d/webgl-engine/core/shaderModules/glsl.js";import{Texture2DBindUniform as d}from"../views/3d/webgl-engine/core/shaderModules/Texture2DBindUniform.js";import{Texture2DShadowBindUniform as r}from"../views/3d/webgl-engine/core/shaderModules/Texture2DShadowBindUniform.js";import{ReadShadowMapConfiguration as t}from"../views/3d/webgl-engine/shaders/ReadShadowMapConfiguration.js";import{ShadowCastAccumulateIndex as n}from"../views/3d/webgl-engine/shaders/ShadowCastAccumulateTechniqueConfiguration.js";import{ShaderBuilder as i}from"../views/webgl/ShaderBuilder.js";const l=255,w=1/l;function u(t){const l=new i,{fragment:u}=l;l.include(e),l.include(a),l.include(o,h),u.uniforms.add(new r("shadowMap",(e=>e.shadowMap.depthTexture)),new d("depthMap",(e=>e.depth?.attachment))),u.constants.add("sampleValue","float",w);const p=t.index===n.CONTEXT?"vec2":"float";return l.outputs.add("sampleCount",p),u.main.add(s`
    sampleCount = ${p}(0.0);

    vec3 uvzShadow = calculateUVZShadowFromDepth(uv, textureSize(shadowMap,0), depthMap);
    if (uvzShadow.z < 0.0) {
      return;
    }

    // The shadow map sampler returns a value between 0 and 1, we take the midpoint as we count discrete samples
    bool shadow = readShadowMapUVZ(uvzShadow, shadowMap) > 0.5;

    if (shadow) {
      sampleCount = ${p}(sampleValue); // Add 1 to the sample count
    }
  `),l}const h=new t,p=Object.freeze(Object.defineProperty({__proto__:null,ShadowCastMaxSamples:l,build:u},Symbol.toStringTag,{value:"Module"}));export{l as S,p as a,u as b};
