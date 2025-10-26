/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{ONES as e}from"../core/libs/gl-matrix-2/factories/vec4f64.js";import{ForwardLinearDepth as r}from"../views/3d/webgl-engine/core/shaderLibrary/ForwardLinearDepth.glsl.js";import{Offset as o}from"../views/3d/webgl-engine/core/shaderLibrary/Offset.glsl.js";import{isColorOrColorEmission as i}from"../views/3d/webgl-engine/core/shaderLibrary/ShaderOutput.js";import{SliceDraw as a}from"../views/3d/webgl-engine/core/shaderLibrary/Slice.glsl.js";import{Transform as l}from"../views/3d/webgl-engine/core/shaderLibrary/Transform.glsl.js";import{InstancedDoublePrecision as s}from"../views/3d/webgl-engine/core/shaderLibrary/attributes/InstancedDoublePrecision.glsl.js";import{NormalAttribute as n,NormalType as t}from"../views/3d/webgl-engine/core/shaderLibrary/attributes/NormalAttribute.glsl.js";import{SymbolColor as d}from"../views/3d/webgl-engine/core/shaderLibrary/attributes/SymbolColor.glsl.js";import{TextureCoordinateAttribute as c}from"../views/3d/webgl-engine/core/shaderLibrary/attributes/TextureCoordinateAttribute.glsl.js";import{VertexColor as m}from"../views/3d/webgl-engine/core/shaderLibrary/attributes/VertexColor.glsl.js";import{VertexNormal as g}from"../views/3d/webgl-engine/core/shaderLibrary/attributes/VertexNormal.glsl.js";import{VerticalOffset as v}from"../views/3d/webgl-engine/core/shaderLibrary/attributes/VerticalOffset.glsl.js";import{DefaultMaterialAuxiliaryPasses as b}from"../views/3d/webgl-engine/core/shaderLibrary/default/DefaultMaterialAuxiliaryPasses.glsl.js";import{ComputeNormalTexture as u}from"../views/3d/webgl-engine/core/shaderLibrary/shading/ComputeNormalTexture.glsl.js";import{EvaluateAmbientOcclusion as w}from"../views/3d/webgl-engine/core/shaderLibrary/shading/EvaluateAmbientOcclusion.glsl.js";import{EvaluateSceneLighting as p,addAmbientBoostFactor as h,addLightingGlobalFactor as f}from"../views/3d/webgl-engine/core/shaderLibrary/shading/EvaluateSceneLighting.glsl.js";import{addMainLightIntensity as x}from"../views/3d/webgl-engine/core/shaderLibrary/shading/MainLighting.glsl.js";import{Normals as y}from"../views/3d/webgl-engine/core/shaderLibrary/shading/Normals.glsl.js";import{PhysicallyBasedRendering as C}from"../views/3d/webgl-engine/core/shaderLibrary/shading/PhysicallyBasedRendering.glsl.js";import{PhysicallyBasedRenderingParameters as L,PBRMode as j}from"../views/3d/webgl-engine/core/shaderLibrary/shading/PhysicallyBasedRenderingParameters.glsl.js";import{ReadShadowMapPass as P,ReadShadowMapDraw as S}from"../views/3d/webgl-engine/core/shaderLibrary/shading/ReadShadowMap.glsl.js";import{terrainDepthTest as O}from"../views/3d/webgl-engine/core/shaderLibrary/shading/TerrainDepthTest.glsl.js";import{colorTextureUV as T,normalTextureUV as N,emissiveTextureUV as M,occlusionTextureUV as V,metallicRoughnessTextureUV as A}from"../views/3d/webgl-engine/core/shaderLibrary/shading/TextureTransformUV.glsl.js";import{VisualVariables as $}from"../views/3d/webgl-engine/core/shaderLibrary/shading/VisualVariables.glsl.js";import{DiscardOrAdjustAlphaPass as D}from"../views/3d/webgl-engine/core/shaderLibrary/util/DiscardOrAdjustAlpha.glsl.js";import{MixExternalColor as E}from"../views/3d/webgl-engine/core/shaderLibrary/util/MixExternalColor.glsl.js";import{addProjViewLocalOrigin as I,addCameraPosition as B}from"../views/3d/webgl-engine/core/shaderLibrary/util/View.glsl.js";import{Float3PassUniform as U}from"../views/3d/webgl-engine/core/shaderModules/Float3PassUniform.js";import{Float4PassUniform as F}from"../views/3d/webgl-engine/core/shaderModules/Float4PassUniform.js";import{FloatPassUniform as _}from"../views/3d/webgl-engine/core/shaderModules/FloatPassUniform.js";import{If as R,glsl as z}from"../views/3d/webgl-engine/core/shaderModules/glsl.js";import{Texture2DPassUniform as G}from"../views/3d/webgl-engine/core/shaderModules/Texture2DPassUniform.js";import{SnowCover as W}from"../views/3d/webgl-engine/effects/weather/SnowCover.glsl.js";import{VertexAttribute as k}from"../views/3d/webgl-engine/lib/VertexAttribute.js";import{outputColorHighlightOID as H}from"../views/3d/webgl-engine/shaders/OutputColorHighlightOID.glsl.js";import{ShaderBuilder as q}from"../views/webgl/ShaderBuilder.js";import{alphaCutoff as J}from"../webscene/support/AlphaCutoff.js";function K(K){const Q=new q,{attributes:X,vertex:Y,fragment:Z,varyings:ee}=Q,{output:re,normalType:oe,offsetBackfaces:ie,instancedColor:ae,spherical:le,receiveShadows:se,snowCover:ne,pbrMode:te,textureAlphaPremultiplied:de,instancedDoublePrecision:ce,hasVertexColors:me,hasVertexTangents:ge,hasColorTexture:ve,hasNormalTexture:be,hasNormalTextureTransform:ue,hasColorTextureTransform:we,hasBloom:pe}=K;if(I(Y,K),X.add(k.POSITION,"vec3"),ee.add("vpos","vec3",{invariant:!0}),Q.include($,K),Q.include(s,K),Q.include(v,K),Q.include(T,K),!i(re))return Q.include(b,K),Q;Q.include(N,K),Q.include(M,K),Q.include(V,K),Q.include(A,K),B(Y,K),Q.include(n,K),Q.include(l,K);const he=oe===t.Attribute||oe===t.Compressed;return he&&ie&&Q.include(o),Q.include(u,K),Q.include(g,K),ae&&Q.attributes.add(k.INSTANCECOLOR,"vec4"),ee.add("vPositionLocal","vec3"),Q.include(c,K),Q.include(r,K),Q.include(d,K),Q.include(m,K),Y.uniforms.add(new F("externalColor",(r=>"ignore"===r.colorMixMode?e:r.externalColor))),ee.add("vcolorExt","vec4"),Q.include(O,K),Y.main.add(z`
    forwardNormalizedVertexColor();
    vcolorExt = externalColor;
    ${R(ae,"vcolorExt *= instanceColor * 0.003921568627451;")}
    vcolorExt *= vvColor();
    vcolorExt *= getSymbolColor();
    forwardColorMixMode();

    vpos = getVertexInLocalOriginSpace();
    vPositionLocal = vpos - view[3].xyz;
    vpos = subtractOrigin(vpos);
    ${R(he,"vNormalWorld = dpNormal(vvLocalNormal(normalModel()));")}
    vpos = addVerticalOffset(vpos, localOrigin);
    ${R(ge,"vTangent = dpTransformVertexTangent(tangent);")}
    gl_Position = transformPosition(proj, view, vpos);
    ${R(he&&ie,"gl_Position = offsetBackfacingClipPosition(gl_Position, vpos, vNormalWorld, cameraPosition);")}

    forwardViewPosDepth((view * vec4(vpos, 1.0)).xyz);
    forwardLinearDepth();
    forwardTextureCoordinates();
    forwardColorUV();
    forwardNormalUV();
    forwardEmissiveUV();
    forwardOcclusionUV();
    forwardMetallicRoughnessUV();

    if (vcolorExt.a < ${z.float(J)}) {
      gl_Position = vec4(1e38, 1e38, 1e38, 1.0);
    }
  `),Q.include(p,K),Z.include(w,K),Q.include(D,K),Q.include(ce?P:S,K),Z.include(a,K),Q.include(H,K),B(Z,K),Z.uniforms.add(Y.uniforms.get("localOrigin"),new U("ambient",(e=>e.ambient)),new U("diffuse",(e=>e.diffuse)),new _("opacity",(e=>e.opacity)),new _("layerOpacity",(e=>e.layerOpacity))),ve&&Z.uniforms.add(new G("tex",(e=>e.texture))),Q.include(L,K),Z.include(C,K),Z.include(E),Q.include(y,K),Z.include(W,K),h(Z),f(Z),x(Z),Z.main.add(z`
    discardBySlice(vpos);
    discardByTerrainDepth();
    ${ve?z`
            vec4 texColor = texture(tex, ${we?"colorUV":"vuv0"});
            ${R(de,"texColor.rgb /= texColor.a;")}
            discardOrAdjustAlpha(texColor);`:z`vec4 texColor = vec4(1.0);`}
    shadingParams.viewDirection = normalize(vpos - cameraPosition);
    ${oe===t.ScreenDerivative?z`vec3 normal = screenDerivativeNormal(vPositionLocal);`:z`shadingParams.normalView = vNormalWorld;
                vec3 normal = shadingNormal(shadingParams);`}
    applyPBRFactors();
    float ssao = evaluateAmbientOcclusionInverse() * getBakedOcclusion();

    vec3 posWorld = vpos + localOrigin;

      float additionalAmbientScale = additionalDirectedAmbientLight(posWorld);
      float shadow = ${se?"max(lightingGlobalFactor * (1.0 - additionalAmbientScale), readShadowMap(vpos, linearDepth))":R(le,"lightingGlobalFactor * (1.0 - additionalAmbientScale)","0.0")};

    vec3 matColor = max(ambient, diffuse);
    vec3 albedo = mixExternalColor(${R(me,"vColor.rgb *")} matColor, texColor.rgb, vcolorExt.rgb, int(colorMixMode));
    float opacity_ = layerOpacity * mixExternalOpacity(${R(me,"vColor.a * ")} opacity, texColor.a, vcolorExt.a, int(colorMixMode));
    ${be?`mat3 tangentSpace = computeTangentSpace(${ge?"normal":"normal, vpos, vuv0"});\n            vec3 shadingNormal = computeTextureNormal(tangentSpace, ${ue?"normalUV":"vuv0"});`:"vec3 shadingNormal = normal;"}
    vec3 normalGround = ${le?"normalize(posWorld);":"vec3(0.0, 0.0, 1.0);"}

    ${R(ne,z`
          float snow = getSnow(normal, normalGround);
          albedo = mix(albedo, vec3(1), snow);
          shadingNormal = mix(shadingNormal, normal, snow);
          ssao = mix(ssao, 1.0, snow);`)}

    vec3 additionalLight = ssao * mainLightIntensity * additionalAmbientScale * ambientBoostFactor * lightingGlobalFactor;

    ${te===j.Normal||te===j.Schematic?z`
            float additionalAmbientIrradiance = additionalAmbientIrradianceFactor * mainLightIntensity[2];
            vec4 emission = ${pe?"vec4(0.0)":"getEmissions(albedo)"};
            ${R(ne,"mrr = applySnowToMRR(mrr, snow);\n                 emission = snowCoverForEmissions(emission, snow);")}
            vec3 shadedColor = evaluateSceneLightingPBR(shadingNormal, albedo, shadow, 1.0 - ssao, additionalLight, shadingParams.viewDirection, normalGround, mrr, emission, additionalAmbientIrradiance);`:z`vec3 shadedColor = evaluateSceneLighting(shadingNormal, albedo, shadow, 1.0 - ssao, additionalLight);`}
    vec4 finalColor = vec4(shadedColor, opacity_);
    outputColorHighlightOID(finalColor, vpos, albedo ${R(ne,", snow")});
  `),Q}const Q=Object.freeze(Object.defineProperty({__proto__:null,build:K},Symbol.toStringTag,{value:"Module"}));export{Q as D,K as b};
