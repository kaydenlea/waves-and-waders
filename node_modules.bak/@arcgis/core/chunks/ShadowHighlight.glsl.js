/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{n as e,t as i}from"./vec32.js";import{create as o}from"../core/libs/gl-matrix-2/factories/vec3f64.js";import{NormalFromDepth as r}from"../views/3d/webgl-engine/core/shaderLibrary/NormalFromDepth.glsl.js";import{ScreenSpacePass as t}from"../views/3d/webgl-engine/core/shaderLibrary/ScreenSpacePass.glsl.js";import{calculateUVZShadowFromDepthPass as a}from"../views/3d/webgl-engine/core/shaderLibrary/shading/calculateUVZShadowFromDepth.glsl.js";import{ShadowmapFiltering as l}from"../views/3d/webgl-engine/core/shaderLibrary/shading/ShadowmapFiltering.glsl.js";import{RgbaFloatEncoding as h}from"../views/3d/webgl-engine/core/shaderLibrary/util/RgbaFloatEncoding.glsl.js";import{Float3BindUniform as d}from"../views/3d/webgl-engine/core/shaderModules/Float3BindUniform.js";import{Float4PassUniform as g}from"../views/3d/webgl-engine/core/shaderModules/Float4PassUniform.js";import{FloatPassUniform as n}from"../views/3d/webgl-engine/core/shaderModules/FloatPassUniform.js";import{glsl as s}from"../views/3d/webgl-engine/core/shaderModules/glsl.js";import{Texture2DBindUniform as c}from"../views/3d/webgl-engine/core/shaderModules/Texture2DBindUniform.js";import{Texture2DShadowBindUniform as u}from"../views/3d/webgl-engine/core/shaderModules/Texture2DShadowBindUniform.js";import{Texture2DUintPassUniform as w}from"../views/3d/webgl-engine/core/shaderModules/Texture2DUintPassUniform.js";import{SnapshotSlot as m}from"../views/3d/webgl-engine/lib/ShadowMap.js";import{ShaderBuilder as p}from"../views/webgl/ShaderBuilder.js";const f=.025;function v(){const o=new p;o.include(a),o.include(l),o.include(t),o.include(r);const v=o.fragment;return v.include(h),v.uniforms.add(new u("shadowMapExcludingHighlight",(e=>e.shadowMap.getSnapshot(m.ExcludeHighlight))),new u("shadowMapHighlight",(e=>e.shadowMap.getSnapshot(m.Highlight))),new c("depthMap",(e=>e.depth?.attachment)),new w("highlightTexture",(e=>e.highlightTexture)),new g("uColor",(e=>e.shadowColor)),new n("opacity",(e=>e.shadowOpacity)),new n("occludedOpacity",(e=>e.occludedShadowOpacity)),new n("terminationFactor",(e=>e.opacityElevation*e.dayNightTerminator)),new d("lightingMainDirectionView",(({lighting:o,camera:r})=>e(b,i(b,o.mainLight.direction,r.viewInverseTransposeMatrix))))),v.main.add(s`
    ivec2 highlightTextureSize = textureSize(highlightTexture, 0);
    ivec2 highlightIUV = ivec2(uv * vec2(highlightTextureSize));
    uvec2 highlightInfo = texelFetch(highlightTexture, highlightIUV, 0).rg;

    fragColor = vec4(0.0);

    // Calculate bit mask to check if pixel is highlit unoccluded at any level
    uint ored = (highlightInfo.r << 0) | (highlightInfo.g << 8);

    bool visiblyHighlighted = ((ored & ~(ored >> 1)) & (1u+4u+16u+64u)) != 0u;
    if (visiblyHighlighted) {
      return;
    }

    vec4 currentPixelPos;
    vec3 uvzShadow = calculateUVZShadowAndPixelPosFromDepth(uv, textureSize(shadowMapHighlight,0), depthMap, currentPixelPos);
    if (uvzShadow.z < 0.0) {
      return;
    }

    float shadowHighlightFactor = readShadowMapUVZ(uvzShadow, shadowMapHighlight);
    if (shadowHighlightFactor == 0.0) {
      return;
    }

    float shadowExcludingHighlightFactor = readShadowMapUVZ(uvzShadow, shadowMapExcludingHighlight);

    vec3 normal = normalFromDepth(depthMap, currentPixelPos.xyz, gl_FragCoord.xy, uv);
    bool shaded = dot(normal, lightingMainDirectionView) < ${s.float(f)};

    float occludedFactor = max(shadowExcludingHighlightFactor, shaded ? 1.0 : 0.0);
    float fragOpacity = mix(opacity, occludedOpacity, occludedFactor);
    fragColor = vec4(uColor.rgb, uColor.a * fragOpacity * terminationFactor);
  `),o}const b=o(),x=Object.freeze(Object.defineProperty({__proto__:null,build:v},Symbol.toStringTag,{value:"Module"}));export{x as S,v as b};
