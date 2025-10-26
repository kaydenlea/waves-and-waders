/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{ScreenSpacePass as e}from"../views/3d/webgl-engine/core/shaderLibrary/ScreenSpacePass.glsl.js";import{glsl as r}from"../views/3d/webgl-engine/core/shaderModules/glsl.js";import{IntegerPassUniform as o}from"../views/3d/webgl-engine/core/shaderModules/IntegerPassUniform.js";import{Texture2DPassUniform as s}from"../views/3d/webgl-engine/core/shaderModules/Texture2DPassUniform.js";import{FocusAreaEffect as t}from"../views/3d/webgl-engine/effects/focusArea/FocusAreaEffect.js";import{NoParameters as a}from"../views/webgl/NoParameters.js";import{ShaderBuilder as c}from"../views/webgl/ShaderBuilder.js";class l extends a{constructor(){super(...arguments),this.effect=t.BRIGHT}}function f(){const a=new c;return a.include(e),a.outputs.add("fragColor","vec4",0),a.fragment.uniforms.add(new s("colorTexture",(e=>e.color)),new s("focusArea",(e=>e.focusArea)),new o("focusAreaEffectMode",(e=>e.effect))).main.add(r`
      float mask = texture( focusArea, uv, 0.0 ).r;
      vec4 color = texture( colorTexture, uv, 0.0 );
      vec4 colorDeSaturate = vec4(color.r * 0.25 + color.g * 0.5 + color.b * 0.25);
      if (focusAreaEffectMode == ${r.int(t.BRIGHT)}) {
        fragColor = mask > 0.0 ? color : 0.55 * colorDeSaturate + 0.45;
      } else {
        fragColor = mask > 0.0 ? color : 0.33 * mix(color, colorDeSaturate, 0.);
      }
  `),a}const i=Object.freeze(Object.defineProperty({__proto__:null,FocusAreaColorPassParameters:l,build:f},Symbol.toStringTag,{value:"Module"}));export{l as F,i as a,f as b};
