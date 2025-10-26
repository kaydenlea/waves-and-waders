/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{ForwardLinearDepth as e}from"../views/3d/webgl-engine/core/shaderLibrary/ForwardLinearDepth.glsl.js";import{Offset as o}from"../views/3d/webgl-engine/core/shaderLibrary/Offset.glsl.js";import{isColorOrColorEmission as r}from"../views/3d/webgl-engine/core/shaderLibrary/ShaderOutput.js";import{SliceDraw as i}from"../views/3d/webgl-engine/core/shaderLibrary/Slice.glsl.js";import{Transform as a}from"../views/3d/webgl-engine/core/shaderLibrary/Transform.glsl.js";import{InstancedDoublePrecision as l}from"../views/3d/webgl-engine/core/shaderLibrary/attributes/InstancedDoublePrecision.glsl.js";import{NormalAttribute as t}from"../views/3d/webgl-engine/core/shaderLibrary/attributes/NormalAttribute.glsl.js";import{SymbolColor as s}from"../views/3d/webgl-engine/core/shaderLibrary/attributes/SymbolColor.glsl.js";import{TextureCoordinateAttribute as n}from"../views/3d/webgl-engine/core/shaderLibrary/attributes/TextureCoordinateAttribute.glsl.js";import{VertexColor as d}from"../views/3d/webgl-engine/core/shaderLibrary/attributes/VertexColor.glsl.js";import{VerticalOffset as c}from"../views/3d/webgl-engine/core/shaderLibrary/attributes/VerticalOffset.glsl.js";import{DefaultMaterialAuxiliaryPasses as g}from"../views/3d/webgl-engine/core/shaderLibrary/default/DefaultMaterialAuxiliaryPasses.glsl.js";import{EvaluateAmbientOcclusion as m}from"../views/3d/webgl-engine/core/shaderLibrary/shading/EvaluateAmbientOcclusion.glsl.js";import{EvaluateSceneLighting as v,addAmbientBoostFactor as b,addLightingGlobalFactor as w}from"../views/3d/webgl-engine/core/shaderLibrary/shading/EvaluateSceneLighting.glsl.js";import{addMainLightDirection as p,addMainLightIntensity as h}from"../views/3d/webgl-engine/core/shaderLibrary/shading/MainLighting.glsl.js";import{PhysicallyBasedRendering as u}from"../views/3d/webgl-engine/core/shaderLibrary/shading/PhysicallyBasedRendering.glsl.js";import{PBRMode as f,PhysicallyBasedRenderingParameters as x}from"../views/3d/webgl-engine/core/shaderLibrary/shading/PhysicallyBasedRenderingParameters.glsl.js";import{ReadShadowMapPass as y,ReadShadowMapDraw as C}from"../views/3d/webgl-engine/core/shaderLibrary/shading/ReadShadowMap.glsl.js";import{terrainDepthTest as L}from"../views/3d/webgl-engine/core/shaderLibrary/shading/TerrainDepthTest.glsl.js";import{VisualVariables as j}from"../views/3d/webgl-engine/core/shaderLibrary/shading/VisualVariables.glsl.js";import{DiscardOrAdjustAlphaPass as O}from"../views/3d/webgl-engine/core/shaderLibrary/util/DiscardOrAdjustAlpha.glsl.js";import{MixExternalColor as M}from"../views/3d/webgl-engine/core/shaderLibrary/util/MixExternalColor.glsl.js";import{addProjViewLocalOrigin as P,addCameraPosition as S}from"../views/3d/webgl-engine/core/shaderLibrary/util/View.glsl.js";import{Float3PassUniform as A}from"../views/3d/webgl-engine/core/shaderModules/Float3PassUniform.js";import{Float4PassUniform as E}from"../views/3d/webgl-engine/core/shaderModules/Float4PassUniform.js";import{FloatPassUniform as D}from"../views/3d/webgl-engine/core/shaderModules/FloatPassUniform.js";import{If as F,glsl as $}from"../views/3d/webgl-engine/core/shaderModules/glsl.js";import{Texture2DPassUniform as N}from"../views/3d/webgl-engine/core/shaderModules/Texture2DPassUniform.js";import{VertexAttribute as I}from"../views/3d/webgl-engine/lib/VertexAttribute.js";import{outputColorHighlightOID as T}from"../views/3d/webgl-engine/shaders/OutputColorHighlightOID.glsl.js";import{ShaderBuilder as V}from"../views/webgl/ShaderBuilder.js";import{alphaCutoff as B}from"../webscene/support/AlphaCutoff.js";function R(R){const _=new V,{attributes:z,vertex:k,fragment:G,varyings:U}=_,{output:W,offsetBackfaces:H,instancedColor:q,pbrMode:J,snowCover:K,spherical:Q,hasBloom:X}=R,Y=J===f.Normal||J===f.Schematic;if(P(k,R),z.add(I.POSITION,"vec3"),U.add("vpos","vec3",{invariant:!0}),_.include(j,R),_.include(l,R),_.include(c,R),_.include(L,R),r(W)&&(S(_.vertex,R),_.include(t,R),_.include(a,R),H&&_.include(o),q&&_.attributes.add(I.INSTANCECOLOR,"vec4"),U.add("vNormalWorld","vec3"),U.add("localvpos","vec3",{invariant:!0}),_.include(n,R),_.include(e,R),_.include(s,R),_.include(d,R),k.uniforms.add(new E("externalColor",(e=>e.externalColor))),U.add("vcolorExt","vec4"),k.main.add($`
      forwardNormalizedVertexColor();
      vcolorExt = externalColor;
      ${F(q,"vcolorExt *= instanceColor * 0.003921568627451;")}
      vcolorExt *= vvColor();
      vcolorExt *= getSymbolColor();
      forwardColorMixMode();

      bool alphaCut = vcolorExt.a < ${$.float(B)};
      vpos = getVertexInLocalOriginSpace();
      localvpos = vpos - view[3].xyz;
      vpos = subtractOrigin(vpos);
      vNormalWorld = dpNormal(vvLocalNormal(normalModel()));
      vpos = addVerticalOffset(vpos, localOrigin);
      vec4 basePosition = transformPosition(proj, view, vpos);

      forwardViewPosDepth((view * vec4(vpos, 1.0)).xyz);
      forwardLinearDepth();
      forwardTextureCoordinates();

      gl_Position = alphaCut ? vec4(1e38, 1e38, 1e38, 1.0) :
      ${F(H,"offsetBackfacingClipPosition(basePosition, vpos, vNormalWorld, cameraPosition);","basePosition;")}
    `)),r(W)){const{hasColorTexture:e,hasColorTextureTransform:o,receiveShadows:r}=R;_.include(v,R),G.include(m,R),_.include(O,R),_.include(R.instancedDoublePrecision?y:C,R),G.include(i,R),_.include(T,R),S(G,R),p(G),b(G),w(G),G.uniforms.add(k.uniforms.get("localOrigin"),k.uniforms.get("view"),new A("ambient",(e=>e.ambient)),new A("diffuse",(e=>e.diffuse)),new D("opacity",(e=>e.opacity)),new D("layerOpacity",(e=>e.layerOpacity))),e&&G.uniforms.add(new N("tex",(e=>e.texture))),_.include(x,R),G.include(u,R),G.include(M),h(G),G.main.add($`
      discardBySlice(vpos);
      discardByTerrainDepth();
      vec4 texColor = ${e?`texture(tex, ${o?"colorUV":"vuv0"})`:" vec4(1.0)"};
      ${F(e,`${F(R.textureAlphaPremultiplied,"texColor.rgb /= texColor.a;")}\n        discardOrAdjustAlpha(texColor);`)}
      vec3 viewDirection = normalize(vpos - cameraPosition);
      applyPBRFactors();
      float ssao = evaluateAmbientOcclusionInverse();
      ssao *= getBakedOcclusion();

      float additionalAmbientScale = additionalDirectedAmbientLight(vpos + localOrigin);
      vec3 additionalLight = ssao * mainLightIntensity * additionalAmbientScale * ambientBoostFactor * lightingGlobalFactor;
      float shadow = ${r?"max(lightingGlobalFactor * (1.0 - additionalAmbientScale), readShadowMap(vpos, linearDepth))":Q?"lightingGlobalFactor * (1.0 - additionalAmbientScale)":"0.0"};
      vec3 matColor = max(ambient, diffuse);
      ${R.hasVertexColors?$`vec3 albedo = mixExternalColor(vColor.rgb * matColor, texColor.rgb, vcolorExt.rgb, int(colorMixMode));
             float opacity_ = layerOpacity * mixExternalOpacity(vColor.a * opacity, texColor.a, vcolorExt.a, int(colorMixMode));`:$`vec3 albedo = mixExternalColor(matColor, texColor.rgb, vcolorExt.rgb, int(colorMixMode));
             float opacity_ = layerOpacity * mixExternalOpacity(opacity, texColor.a, vcolorExt.a, int(colorMixMode));`}
      ${F(K,"albedo = mix(albedo, vec3(1), 0.9);")}
      ${$`vec3 shadingNormal = normalize(vNormalWorld);
             albedo *= 1.2;
             vec3 viewForward = vec3(view[0][2], view[1][2], view[2][2]);
             float alignmentLightView = clamp(dot(viewForward, -mainLightDirection), 0.0, 1.0);
             float transmittance = 1.0 - clamp(dot(viewForward, shadingNormal), 0.0, 1.0);
             float treeRadialFalloff = vColor.r;
             float backLightFactor = 0.5 * treeRadialFalloff * alignmentLightView * transmittance * (1.0 - shadow);
             additionalLight += backLightFactor * mainLightIntensity;`}
      ${F(Y,`vec3 normalGround = ${Q?"normalize(vpos + localOrigin)":"vec3(0.0, 0.0, 1.0)"};`)}
      ${Y?$`float additionalAmbientIrradiance = additionalAmbientIrradianceFactor * mainLightIntensity[2];
                 ${F(K,$`mrr = applySnowToMRR(mrr, 1.0)`)}
            vec4 emission = ${K||X?"vec4(0.0)":"getEmissions(albedo)"};
            vec3 shadedColor = evaluateSceneLightingPBR(shadingNormal, albedo, shadow, 1.0 - ssao, additionalLight, viewDirection, normalGround, mrr, emission, additionalAmbientIrradiance);`:$`vec3 shadedColor = evaluateSceneLighting(shadingNormal, albedo, shadow, 1.0 - ssao, additionalLight);`}
      vec4 finalColor = vec4(shadedColor, opacity_);
      outputColorHighlightOID(finalColor, vpos, albedo ${F(K,", 1.0")});`)}return _.include(g,R),_}const _=Object.freeze(Object.defineProperty({__proto__:null,build:R},Symbol.toStringTag,{value:"Module"}));export{_ as R,R as b};
