/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{earth as e,mars as o,moon as r}from"../geometry/support/Ellipsoid.js";import{OverlayContent as a}from"../views/3d/terrain/OverlayContent.js";import{ComponentData as i,ComponentDataType as l}from"../views/3d/webgl-engine/collections/Component/Material/shader/ComponentData.glsl.js";import{VertexDiscardMode as t}from"../views/3d/webgl-engine/collections/Component/Material/shader/VertexDiscardMode.js";import{ForwardLinearDepth as n}from"../views/3d/webgl-engine/core/shaderLibrary/ForwardLinearDepth.glsl.js";import{ShaderOutput as d,isColorOrColorEmission as s}from"../views/3d/webgl-engine/core/shaderLibrary/ShaderOutput.js";import{SlicePass as g}from"../views/3d/webgl-engine/core/shaderLibrary/Slice.glsl.js";import{TextureCoordinateAttribute as m}from"../views/3d/webgl-engine/core/shaderLibrary/attributes/TextureCoordinateAttribute.glsl.js";import{VertexColor as c}from"../views/3d/webgl-engine/core/shaderLibrary/attributes/VertexColor.glsl.js";import{VertexNormal as v}from"../views/3d/webgl-engine/core/shaderLibrary/attributes/VertexNormal.glsl.js";import{VertexPosition as u}from"../views/3d/webgl-engine/core/shaderLibrary/attributes/VertexPosition.glsl.js";import{OutputDepth as h}from"../views/3d/webgl-engine/core/shaderLibrary/output/OutputDepth.glsl.js";import{OutputHighlight as w}from"../views/3d/webgl-engine/core/shaderLibrary/output/OutputHighlight.glsl.js";import{OutputHighlightOverlay as b}from"../views/3d/webgl-engine/core/shaderLibrary/output/OutputHighlightOverlay.js";import{computeFragmentNormals as p}from"../views/3d/webgl-engine/core/shaderLibrary/shading/ComputeFragmentNormals.glsl.js";import{ComputeMaterialColor as f}from"../views/3d/webgl-engine/core/shaderLibrary/shading/ComputeMaterialColor.glsl.js";import{ComputeNormalTexture as C}from"../views/3d/webgl-engine/core/shaderLibrary/shading/ComputeNormalTexture.glsl.js";import{EvaluateSceneLighting as y,addLightingGlobalFactor as x}from"../views/3d/webgl-engine/core/shaderLibrary/shading/EvaluateSceneLighting.glsl.js";import{addMainLightIntensity as L,addMainLightDirection as j}from"../views/3d/webgl-engine/core/shaderLibrary/shading/MainLighting.glsl.js";import{PBRMode as N,PhysicallyBasedRenderingParameters as O}from"../views/3d/webgl-engine/core/shaderLibrary/shading/PhysicallyBasedRenderingParameters.glsl.js";import{ReadBaseColorTexture as S}from"../views/3d/webgl-engine/core/shaderLibrary/shading/ReadBaseColorTexture.glsl.js";import{ReadShadowMapPass as $}from"../views/3d/webgl-engine/core/shaderLibrary/shading/ReadShadowMap.glsl.js";import{terrainDepthTest as T}from"../views/3d/webgl-engine/core/shaderLibrary/shading/TerrainDepthTest.glsl.js";import{OverlayIM as M,getIMColorTexture as A}from"../views/3d/webgl-engine/core/shaderLibrary/terrain/Overlay.glsl.js";import{DiscardOrAdjustAlphaDraw as D}from"../views/3d/webgl-engine/core/shaderLibrary/util/DiscardOrAdjustAlpha.glsl.js";import{EllipsoidMode as W}from"../views/3d/webgl-engine/core/shaderLibrary/util/EllipsoidMode.js";import{If as P,glsl as B}from"../views/3d/webgl-engine/core/shaderModules/glsl.js";import{Texture2DBindUniform as F}from"../views/3d/webgl-engine/core/shaderModules/Texture2DBindUniform.js";import{Texture2DPassUniform as R}from"../views/3d/webgl-engine/core/shaderModules/Texture2DPassUniform.js";import{SnowCover as z}from"../views/3d/webgl-engine/effects/weather/SnowCover.glsl.js";import{outputColorHighlightOID as E}from"../views/3d/webgl-engine/shaders/OutputColorHighlightOID.glsl.js";import{ShaderBuilder as H}from"../views/webgl/ShaderBuilder.js";import{alphaCutoff as I}from"../webscene/support/AlphaCutoff.js";function V(V){const _=new H,{vertex:G,fragment:k}=_;_.include(u,V),_.include(v,V),_.include(c,V),_.include(m,V),_.include(n,V),_.include(i,V),_.include(D,V),k.include(g,V),_.include(S,V),_.include(T,V);const{output:U,pbrMode:q,hasNormalTexture:J,snowCover:K,receiveShadows:Q,shadeNormals:X,spherical:Y,ellipsoidMode:Z,overlayEnabled:ee,componentData:oe,vertexDiscardMode:re,hasBloom:ae,renderOccluded:ie}=V,le=q===N.Normal||q===N.Schematic;le&&(_.include(O,V),J&&_.include(C,V));const te=U===d.Shadow||U===d.ShadowHighlight||U===d.ShadowExcludeHighlight,ne=te&&oe===l.Varying;if(ee){_.include(y,V),_.include(M,V);const a=Z===W.Earth,i=Z===W.Earth,l=a?e.radius:i?o.radius:r.radius;G.code.add(`\n      ${P(Y,`const float invRadius = ${B.float(1/l)};`)}\n      vec2 projectOverlay(vec3 pos) { return pos.xy ${P(Y,"/ (1.0 + invRadius * pos.z);")}; }`)}const de=ee&&s(U)&&q===N.WaterOnIntegratedMesh;de&&(_.varyings.add("tbnTangent","vec3"),_.varyings.add("tbnBiTangent","vec3"),_.varyings.add("groundNormal","vec3"));const se=re===t.None,ge=re===t.Opaque,me=1-1/255;if(G.main.add(B`
    bool castShadows;
    vec4 externalColor = forwardExternalColor(castShadows);
    ${P(ne,"if(!castShadows) { gl_Position = vec4(vec3(1e38), 1.0); return; }")}

    ${P(!se,`{ if (externalColor.a ${ge?">":"<="} ${B.float(me)}) { gl_Position = vec4(vec3(1e38), 1.0); return; } }`)}

    ${P(U===d.ObjectAndLayerIdColor,"externalColor.a = 1.0;")}

    forwardPosition(readElevationOffset());
    forwardViewPosDepth(vPosition_view);
    forwardNormal();
    forwardTextureCoordinates();
    forwardVertexColor();
    forwardLinearDepth();
    forwardObjectAndLayerIdColor();
    ${P(de,Y?B`
            groundNormal = normalize(positionWorld());
            tbnTangent = normalize(cross(vec3(0.0, 0.0, 1.0), groundNormal));
            tbnBiTangent = normalize(cross(groundNormal, tbnTangent));`:B`
            groundNormal = vec3(0.0, 0.0, 1.0);
            tbnTangent = vec3(1.0, 0.0, 0.0);
            tbnBiTangent = vec3(0.0, 1.0, 0.0);`)}
    ${P(ee,"setOverlayVTC(projectOverlay(position));")}

    if (externalColor.a < ${B.float(I)}) {
      // Discard this vertex
      gl_Position = vec4(1e38, 1e38, 1e38, 1.0);
      return;
    }
  `),s(U))return _.include(f,V),_.include(p,V),_.include(y,V),_.include(E,V),k.include(z,V),Q&&_.include($,V),k.code.add(B`
      float evaluateShadow() {
        return ${Q?"readShadowMap(vPositionWorldCameraRelative, linearDepth)":"0.0"};
      }`),ee&&k.uniforms.add(new R("ovColorTex",((e,o)=>A(e,o)))),k.main.add(B`
      discardBySlice(vPositionWorldCameraRelative);
      discardByTerrainDepth();

      vec4 textureColor = readBaseColorTexture();
      discardOrAdjustAlpha(textureColor);

      /* When rendering the occluded overlay, we still need to read the base color texture
       * because we need to use the same discard logic. However after that to render only the
       * draped overlay, we simply set the base texture color to zero. */
      ${P(ie,B`textureColor = vec4(0);`)}

      ${P(ee,B`vec4 overlayColor = getOverlayColor(ovColorTex, vtcOverlay);`)}

      /* Early discard to only emit when we have overlay */
      ${P(ee&&ie,B`if (overlayColor.a < ${B.float(I)}) { discard; }`)}

      vec4 externalColor;
      int externalColorMixMode;
      readExternalColor(externalColor, externalColorMixMode);

      vec4 materialColor = computeMaterialColor(textureColor, externalColor, externalColorMixMode);
    `),le?(L(k),Y&&x(k),k.main.add(B`
        applyPBRFactors();
        ${P(q===N.Normal,B`if (externalColorMixMode == 3) {
              mrr = vec3(0.0, 0.6, 0.2);
            }`)}
        float additionalIrradiance = 0.02 * mainLightIntensity[2];
        ${P(J,"mat3 tangentSpace = computeTangentSpace(fragmentFaceNormal, vPositionWorldCameraRelative, vuv0);")}
        vec3 shadingNormal = ${J?"computeTextureNormal(tangentSpace, vuv0)":"fragmentShadingNormal"};
        vec3 groundNormal = ${Y?B`normalize(positionWorld())`:B`vec3(0.0, 0.0, 1.0)`};

        vec3 viewDir = normalize(vPositionWorldCameraRelative);
        float ssao = 1.0 - occlusion * evaluateAmbientOcclusionInverse();
        ${P(K,B`float snow = getSnow(fragmentFaceNormal, normalize(positionWorld()));
                 materialColor.rgb = mix(materialColor.rgb, vec3(1.1), snow);
                 ssao = mix(ssao, 0.5 * ssao, snow);
                 shadingNormal = mix(shadingNormal, fragmentFaceNormal, snow);`)}
        ${P(ee,"materialColor = materialColor * (1.0 - overlayColor.a) + overlayColor;")}

        vec3 additionalLight = evaluateAdditionalLighting(ssao, positionWorld());
        vec4 emission = ${ae?"vec4(0.0)":"getEmissions(materialColor.rgb)"};
        ${P(Y,"float additionalAmbientScale = additionalDirectedAmbientLight(positionWorld());")}
        ${Y?B`float shadow = max(lightingGlobalFactor * (1.0 - additionalAmbientScale), evaluateShadow());`:"float shadow = evaluateShadow();"}
        vec4 shadedColor = vec4(evaluateSceneLightingPBR(shadingNormal, materialColor.rgb, shadow, ssao, additionalLight, viewDir, groundNormal, mrr, emission, additionalIrradiance), materialColor.a);
        `)):(j(k),Y&&x(k),de&&k.uniforms.add(new F("ovNormalTex",(e=>e.overlay?.getTexture(a.WaterNormal)))),k.main.add(B`
        ${P(Y,"float additionalAmbientScale = additionalDirectedAmbientLight(positionWorld());")}
        float shadow = ${Q?Y?"max(lightingGlobalFactor * (1.0 - additionalAmbientScale), evaluateShadow())":"evaluateShadow()":Y?"lightingGlobalFactor * (1.0 - additionalAmbientScale)":"0.0"};

        ${P(Q&&!X,B`
            float dotFL = dot(fragmentFaceNormal, mainLightDirection);
            if( dotFL <= 0.0) shadow = 1.0;
        `)}
        ${P(K,B`float snow = getSnow(fragmentFaceNormal, normalize(positionWorld()));
               materialColor.rgb = mix(materialColor.rgb, vec3(1), snow);`)}

        // At global scale we create some additional ambient light based on the main light to simulate global illumination
        float ssao = evaluateAmbientOcclusion();
        vec3 additionalLight = evaluateAdditionalLighting(ssao, positionWorld());

        ${P(ee,"materialColor = materialColor * (1.0 - overlayColor.a) + overlayColor;")}

        vec4 shadedColor = vec4(evaluateSceneLighting(fragmentShadingNormal, materialColor.rgb, shadow, ssao, additionalLight), materialColor.a);
        ${P(de,B`vec4 overlayWaterMask = getOverlayColor(ovNormalTex, vtcOverlay);
                 float waterNormalLength = length(overlayWaterMask);
                 if (waterNormalLength > 0.95) {
                   mat3 tbnMatrix = mat3(tbnTangent, tbnBiTangent, groundNormal);
                   vec4 waterColorLinear = getOverlayWaterColor(overlayWaterMask, overlayColor, -normalize(vPositionWorldCameraRelative), shadow, groundNormal, tbnMatrix, vPosition_view, positionWorld());
                   vec4 waterColorNonLinear = delinearizeGamma(vec4(waterColorLinear.xyz, 1.0));
                   // un-gamma the ground color to mix in linear space
                   shadedColor = mix(shadedColor, waterColorNonLinear, waterColorLinear.w);
                 }`)}
      `)),k.main.add(`outputColorHighlightOID(shadedColor, vPositionWorldCameraRelative, materialColor.rgb ${P(K,", snow")});`),_;const ce=U===d.Normal,ve=U===d.ObjectAndLayerIdColor,ue=U===d.Highlight,he=te||U===d.ViewshedShadow;return he&&_.include(h,V),ce&&_.include(p,V),ee&&_.include(b,V),_.include(w,V),k.main.add(B`
    discardBySlice(vPositionWorldCameraRelative);

    vec4 textureColor = readBaseColorTexture();
    discardOrAdjustAlpha(textureColor);

    ${P(he,"outputDepth(linearDepth);")}
    ${P(ce,B`fragColor = vec4(vec3(0.5) + 0.5 * fragmentFaceNormalView, 1.0);`)}
    ${P(ve,ee?"fragColor = getOverlayColorTexel();":"outputObjectAndLayerIdColor();")}
    ${P(ue,P(ee,B`calculateOcclusionAndOutputHighlight(getAllOverlayHighlightValuesEncoded());`,B`calculateOcclusionAndOutputHighlight();`))}`),_}const _=Object.freeze(Object.defineProperty({__proto__:null,build:V},Symbol.toStringTag,{value:"Module"}));export{_ as C,V as b};
