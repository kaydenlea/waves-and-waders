/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{create as e}from"../core/libs/gl-matrix-2/factories/vec2f64.js";import{clone as o,fromValues as r,create as t}from"../core/libs/gl-matrix-2/factories/vec4f64.js";import{ScreenSpacePass as s}from"../views/3d/webgl-engine/core/shaderLibrary/ScreenSpacePass.glsl.js";import{BlendColorsPremultiplied as a,premultiplyAlpha as l}from"../views/3d/webgl-engine/core/shaderLibrary/util/BlendColorsPremultiplied.glsl.js";import{CameraSpace as n}from"../views/3d/webgl-engine/core/shaderLibrary/util/CameraSpace.glsl.js";import{Float2PassUniform as i}from"../views/3d/webgl-engine/core/shaderModules/Float2PassUniform.js";import{Float4PassUniform as d}from"../views/3d/webgl-engine/core/shaderModules/Float4PassUniform.js";import{FloatPassUniform as h}from"../views/3d/webgl-engine/core/shaderModules/FloatPassUniform.js";import{If as m,glsl as c}from"../views/3d/webgl-engine/core/shaderModules/glsl.js";import{Texture2DPassUniform as u}from"../views/3d/webgl-engine/core/shaderModules/Texture2DPassUniform.js";import{S as g}from"./ShadowCastAccumulate.glsl.js";import{ShadowCastVisualization as w}from"../views/3d/webgl-engine/shaders/ShadowCastVisualizeTechniqueConfiguration.js";import{NoParameters as p}from"../views/webgl/NoParameters.js";import{ShaderBuilder as f}from"../views/webgl/ShaderBuilder.js";class b extends p{constructor(r){super(),this._data=r,this.sampleScale=e(),this.opacityFromElevation=1,this.gradientColor=o(v),this.thresholdColor=o(y),this.bandedGradientColor=o(j),this.bandSize=.1,this.threshold=.5}get shadowCastMap(){return this._data.shadowCastTexture}}const S=.7,C=50/255,v=r(0,0,1,S),y=r(1,0,0,S),j=r(C,C,C,S);function $(e){const o=new f,r=o.fragment;o.include(n),o.include(s);const{visualization:t}=e;r.constants.add("inverseSampleValue","float",g),r.uniforms.add(new u("shadowCastMap",(e=>e.shadowCastMap)),new i("sampleScale",(e=>e.sampleScale)),new h("opacityFromElevation",(e=>e.opacityFromElevation)));const p=t===w.Threshold,b=t===w.ThresholdAndGradient,S=t===w.BandedGradient;switch(b&&r.include(a),t){case w.Gradient:r.uniforms.add(new d("uColor",(e=>l(P,e.gradientColor))));break;case w.BandedGradient:r.uniforms.add(new d("uColor",(e=>l(P,e.bandedGradientColor))),new h("bandSize",(e=>e.bandSize)));break;case w.ThresholdAndGradient:r.uniforms.add(new d("uColor",(e=>l(P,e.thresholdColor))),new d("gradientColor",(e=>l(P,e.gradientColor))),new h("threshold",(e=>e.threshold)));break;case w.Threshold:r.uniforms.add(new d("uColor",(e=>l(P,e.thresholdColor))),new h("threshold",(e=>e.threshold)))}const{type:C,selector:v,thresholdStrengthSelector:y}=b?{type:"vec2",selector:"rg",thresholdStrengthSelector:"strength.x"}:{type:"float",selector:"r",thresholdStrengthSelector:"strength"};return r.main.add(c`
    ${C} numSamples = texture(shadowCastMap, uv).${v} * inverseSampleValue;

    fragColor = vec4(0.0);

    // early out if we do not have any samples in one or more channels
    if (dot(numSamples, ${C}(1)) < 1.0) {
      return;
    }

    // sampleScale is the number of total samples taken, so this brings strength to a 0-1 range.
    // note that sampleScale is always a vec2 even if we have only the primary channel.
    ${C} strength = numSamples * sampleScale.${v};

    // in threshold mode, step the strength to 0 if we are at or below the threshold, 1 otherwise.
    ${m(p||b,c`
      ${y} = 1.0 - step(${y}, threshold);
    `)}

    // bail out if we are below the threshold
    ${m(p,c`if (${y} == 0.0) { return; }`)}

    ${m(S,c`strength = ceil(strength / bandSize) * bandSize;`)}

    ${C} attenuation = opacityFromElevation * strength;

    // in ThresholdAndGradient mode we blend the threshold color on top of the gradient color
    fragColor = ${m(b,c`blendColorsPremultiplied(uColor * attenuation.r, gradientColor * attenuation.g)`,c`uColor * attenuation`)};
  `),o}const P=t(),M=Object.freeze(Object.defineProperty({__proto__:null,ShadowCastVisualizePassParameters:b,build:$},Symbol.toStringTag,{value:"Module"}));export{b as S,M as a,$ as b};
