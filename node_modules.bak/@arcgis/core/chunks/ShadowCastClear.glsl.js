/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{ScreenSpacePass as e}from"../views/3d/webgl-engine/core/shaderLibrary/ScreenSpacePass.glsl.js";import{glsl as r}from"../views/3d/webgl-engine/core/shaderModules/glsl.js";import{ShadowCastAccumulateIndex as o}from"../views/3d/webgl-engine/shaders/ShadowCastAccumulateTechniqueConfiguration.js";import{ShaderBuilder as n}from"../views/webgl/ShaderBuilder.js";function s(s){const i=new n,{fragment:t}=i;i.include(e);const a=s.index===o.CONTEXT?"vec2":"float",l="value";return i.outputs.add(l,a),t.main.add(r`${l} = ${a}(0.0);`),i}const i=Object.freeze(Object.defineProperty({__proto__:null,build:s},Symbol.toStringTag,{value:"Module"}));export{i as S,s as b};
