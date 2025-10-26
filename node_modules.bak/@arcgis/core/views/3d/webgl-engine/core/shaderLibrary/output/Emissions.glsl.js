/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{isColorOrColorEmission as s}from"../ShaderOutput.js";import{VertexTextureCoordinates as e}from"../attributes/VertexTextureCoordinates.glsl.js";import{Float3DrawUniform as o}from"../../shaderModules/Float3DrawUniform.js";import{Float3PassUniform as r}from"../../shaderModules/Float3PassUniform.js";import{FloatDrawUniform as i}from"../../shaderModules/FloatDrawUniform.js";import{FloatPassUniform as m}from"../../shaderModules/FloatPassUniform.js";import{If as t,glsl as n}from"../../shaderModules/glsl.js";import{Texture2DDrawUniform as a}from"../../shaderModules/Texture2DDrawUniform.js";import{Texture2DPassUniform as l}from"../../shaderModules/Texture2DPassUniform.js";import{GLEmissiveTexturePassParameters as u}from"../../../lib/GLTextureMaterial.js";import{BindType as d}from"../../../../../webgl/BindType.js";var f;!function(s){s[s.None=0]="None",s[s.SymbolColor=1]="SymbolColor",s[s.EmissiveColor=2]="EmissiveColor",s[s.Texture=3]="Texture",s[s.COUNT=4]="COUNT"}(f||(f={}));class v extends u{}function c(u,v){if(!s(v.output))return;const{emissionSource:c,hasEmissiveTextureTransform:p,bindType:x}=v,C=c===f.Texture;C&&(u.include(e,v),u.fragment.uniforms.add(x===d.Pass?new l("texEmission",(s=>s.textureEmissive)):new a("texEmission",(s=>s.textureEmissive))));const g=c===f.EmissiveColor||C;g&&u.fragment.uniforms.add(x===d.Pass?new r("emissiveBaseColor",(s=>s.emissiveBaseColor)):new o("emissiveBaseColor",(s=>s.emissiveBaseColor)));const h=c!==f.None;h&&u.fragment.uniforms.add(x===d.Pass?new m("emissiveStrength",(s=>s.emissiveStrength)):new i("emissiveStrength",(s=>s.emissiveStrength)));const T=c===f.SymbolColor;u.fragment.code.add(n`
    vec4 getEmissions(vec3 symbolColor) {
      vec4 emissions = ${g?"vec4(emissiveBaseColor, 1.0)":T?"vec4(symbolColor, 1.0)":"vec4(0.0)"};
      ${t(C,`emissions *= textureLookup(texEmission, ${p?"emissiveUV":"vuv0"});\n         emissions.w = emissions.rgb == vec3(0.0) ? 0.0: emissions.w;`)}
      ${t(h,"emissions.rgb *= emissiveStrength;")}
      return emissions;
    }
  `)}export{f as EmissionSource,c as Emissions,v as EmissionsParameters};
