/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{gauss as e}from"../core/mathUtils.js";import{ScreenSpacePass as r}from"../views/3d/webgl-engine/core/shaderLibrary/ScreenSpacePass.glsl.js";import{Gamma as o}from"../views/3d/webgl-engine/core/shaderLibrary/shading/Gamma.glsl.js";import{FloatPassUniform as t}from"../views/3d/webgl-engine/core/shaderModules/FloatPassUniform.js";import{glsl as i}from"../views/3d/webgl-engine/core/shaderModules/glsl.js";import{Texture2DPassUniform as s}from"../views/3d/webgl-engine/core/shaderModules/Texture2DPassUniform.js";import{blurRadiusPresets as l}from"../views/3d/webgl-engine/effects/bloom/BloomPresets.glsl.js";import{NoParameters as a}from"../views/webgl/NoParameters.js";import{ShaderBuilder as n}from"../views/webgl/ShaderBuilder.js";var c;!function(e){e[e.Horizontal=0]="Horizontal",e[e.Vertical=1]="Vertical",e[e.COUNT=2]="COUNT"}(c||(c={}));class u extends a{constructor(){super(...arguments),this.blurRadius=l.sunny}}function m(l){const a=new n,u=a.fragment;a.include(r),u.include(o),u.uniforms.add(new s("colorTexture",(e=>e.color)),new t("blurRadius",(e=>e.blurRadius)));let m="";const d=15;for(let e=0;e<d;e++){m+=`locations1D[${e}] = ${(e/(d-1)*2-1).toFixed(3).toString()};`}const f=2;let v="";for(let r=0;r<d;r++){v+=`locations1DWeights[${r}] = ${e(r-Math.floor(d/2),f).toFixed(7).toString()};`}const g=l.bloomStage===c.Horizontal;return u.code.add(i`
    float locations1D[${i.int(d)}];
    float locations1DWeights[${i.int(d)}];

    vec4 blurUniformSamples(sampler2D toBlur) {
      vec4 res = vec4(0.0);
      vec2 size = vec2(textureSize(toBlur, 0));
      vec2 aspectCorrection = vec2(1.0, size.x / size.y);
      vec2 uvInPixel = uv * size;

      ${m}
      ${v}
      vec2 pixelCenterShift = 0.5 / size;

      for(int i=0;i < ${i.int(d)}; i++) {
        float uv1D = locations1D[i] + ${g?"pixelCenterShift.x":"pixelCenterShift.y"};
        vec2 uvOffset = ${g?"vec2(uv1D, 0.0)":"vec2(0.0, uv1D)"};

        vec2 uvDistorted = uv + uvOffset * blurRadius * aspectCorrection;
        vec4 sampleColor = texture(toBlur, uvDistorted);
        res += vec4(linearizeGamma(sampleColor.rgb), sampleColor.a)  * locations1DWeights[i];
      }
      res.a = clamp(res.a, 0.0, 1.0);
      return delinearizeGamma(res);
    }
  `).main.add(i`fragColor = blurUniformSamples(colorTexture);`),a}const d=Object.freeze(Object.defineProperty({__proto__:null,BloomBlurPassParameters:u,get BlurDirection(){return c},build:m},Symbol.toStringTag,{value:"Module"}));export{u as B,c as a,d as b,m as c};
