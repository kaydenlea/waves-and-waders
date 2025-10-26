/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{ScreenSpacePass as o}from"../views/3d/webgl-engine/core/shaderLibrary/ScreenSpacePass.glsl.js";import{ReadDepth as e}from"../views/3d/webgl-engine/core/shaderLibrary/output/ReadDepth.glsl.js";import{Gamma as r}from"../views/3d/webgl-engine/core/shaderLibrary/shading/Gamma.glsl.js";import{FloatPassUniform as l}from"../views/3d/webgl-engine/core/shaderModules/FloatPassUniform.js";import{FloatsPassUniform as s}from"../views/3d/webgl-engine/core/shaderModules/FloatsPassUniform.js";import{glsl as t}from"../views/3d/webgl-engine/core/shaderModules/glsl.js";import{IntegerPassUniform as i}from"../views/3d/webgl-engine/core/shaderModules/IntegerPassUniform.js";import{Texture2DPassUniform as a}from"../views/3d/webgl-engine/core/shaderModules/Texture2DPassUniform.js";import{defaultExposure as d,lodFactorsPresets as m}from"../views/3d/webgl-engine/effects/bloom/BloomPresets.glsl.js";import{ToneMapping as n}from"../views/3d/webgl-engine/shaders/ToneMapping.glsl.js";import{NoParameters as u}from"../views/webgl/NoParameters.js";import{ShaderBuilder as c}from"../views/webgl/ShaderBuilder.js";class b extends u{constructor(o=d,e=m.sunny.far,r=m.sunny.near){super(),this.exposure=o,this.lodFactors=e,this.lodFactorsFront=r}}const g=new b;class w extends b{constructor(){super(...arguments),this.bloomLod=-1}}function v(){const d=new c,m=d.fragment;return d.include(o),m.include(r),m.include(e),m.include(n),m.uniforms.add(new a("colorTexture",(o=>o.color)),new a("emissionTexture",(o=>o.emission)),new a("bloomTexture0",(o=>o.bloomTexture0)),new a("bloomTexture1",(o=>o.bloomTexture1)),new a("bloomTexture2",(o=>o.bloomTexture2)),new a("bloomTexture3",(o=>o.bloomTexture3)),new a("bloomTexture4",(o=>o.bloomTexture4)),new l("exposure",(o=>o.exposure)),new i("bloomLod",(o=>o.bloomLod)),new s("lodFactors",(o=>o.lodFactors),5),new s("lodFactorsFront",(o=>o.lodFactorsFront),5)).main.add(t`vec4 color = texture(colorTexture, uv);
color = vec4(linearizeGamma(color.rgb), color.a);
vec4 lod0 = texture(bloomTexture0, uv);
lod0 = vec4(linearizeGamma(lod0.rgb), lod0.a);
vec4 lod1 = texture(bloomTexture1, uv);
lod1 = vec4(linearizeGamma(lod1.rgb), lod1.a);
vec4 lod2 = texture(bloomTexture2, uv);
lod2 = vec4(linearizeGamma(lod2.rgb), lod2.a);
vec4 lod3 = texture(bloomTexture3, uv);
lod3 = vec4(linearizeGamma(lod3.rgb), lod3.a);
vec4 lod4 = texture(bloomTexture4, uv);
lod4 = vec4(linearizeGamma(lod4.rgb), lod4.a);
vec4 blur = lodFactors[0] * lod0;
blur += lodFactors[1] * lod1;
blur += lodFactors[2] * lod2;
blur += lodFactors[3] * lod3;
blur += lodFactors[4] * lod4;
blur = bloomLod == 0 ? lodFactors[0] * lod0 : bloomLod == 1 ? lodFactors[1] * lod1 : bloomLod == 2 ? lodFactors[2] * lod2 : bloomLod == 3 ? lodFactors[3] * lod3 : bloomLod == 4 ? lodFactors[4] * lod4 : blur;
vec4 emission = texture(emissionTexture, uv);
emission = vec4(linearizeGamma(emission.rgb), emission.a);
emission += blur;
emission = vec4(tonemapACES(emission.rgb), emission.a);
fragColor = emission + color;
fragColor = delinearizeGamma(fragColor);`),d}const x=Object.freeze(Object.defineProperty({__proto__:null,BloomCompositionPassParameters:w,build:v,defaultCompositionParameters:g},Symbol.toStringTag,{value:"Module"}));export{w as B,x as a,v as b,g as d};
