/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{ForwardLinearDepth as e,addNearFar as i}from"../views/3d/webgl-engine/core/shaderLibrary/ForwardLinearDepth.glsl.js";import{isColorOrColorEmission as o,ShaderOutput as a}from"../views/3d/webgl-engine/core/shaderLibrary/ShaderOutput.js";import{SliceDraw as r}from"../views/3d/webgl-engine/core/shaderLibrary/Slice.glsl.js";import{Transform as n}from"../views/3d/webgl-engine/core/shaderLibrary/Transform.glsl.js";import{ObjectAndLayerIdColor as l}from"../views/3d/webgl-engine/core/shaderLibrary/attributes/ObjectAndLayerIdColor.glsl.js";import{PathVertexPosition as s}from"../views/3d/webgl-engine/core/shaderLibrary/attributes/PathVertexPosition.glsl.js";import{OutputDepth as d}from"../views/3d/webgl-engine/core/shaderLibrary/output/OutputDepth.glsl.js";import{OutputHighlight as t}from"../views/3d/webgl-engine/core/shaderLibrary/output/OutputHighlight.glsl.js";import{EvaluateAmbientOcclusion as c}from"../views/3d/webgl-engine/core/shaderLibrary/shading/EvaluateAmbientOcclusion.glsl.js";import{EvaluateSceneLighting as m,addAmbientBoostFactor as g,addLightingGlobalFactor as v}from"../views/3d/webgl-engine/core/shaderLibrary/shading/EvaluateSceneLighting.glsl.js";import{addMainLightIntensity as h}from"../views/3d/webgl-engine/core/shaderLibrary/shading/MainLighting.glsl.js";import{Normals as p}from"../views/3d/webgl-engine/core/shaderLibrary/shading/Normals.glsl.js";import{NormalUtils as w}from"../views/3d/webgl-engine/core/shaderLibrary/shading/NormalUtils.glsl.js";import{PhysicallyBasedRenderingParameters as b,PBRMode as u}from"../views/3d/webgl-engine/core/shaderLibrary/shading/PhysicallyBasedRenderingParameters.glsl.js";import{ReadShadowMapDraw as f}from"../views/3d/webgl-engine/core/shaderLibrary/shading/ReadShadowMap.glsl.js";import{terrainDepthTest as y}from"../views/3d/webgl-engine/core/shaderLibrary/shading/TerrainDepthTest.glsl.js";import{ColorConversion as j}from"../views/3d/webgl-engine/core/shaderLibrary/util/ColorConversion.glsl.js";import{addProjViewLocalOrigin as L,addViewNormal as P,addCameraPosition as S}from"../views/3d/webgl-engine/core/shaderLibrary/util/View.glsl.js";import{Float3PassUniform as O}from"../views/3d/webgl-engine/core/shaderModules/Float3PassUniform.js";import{FloatPassUniform as C}from"../views/3d/webgl-engine/core/shaderModules/FloatPassUniform.js";import{glsl as A,If as D}from"../views/3d/webgl-engine/core/shaderModules/glsl.js";import{SnowCover as I}from"../views/3d/webgl-engine/effects/weather/SnowCover.glsl.js";import{outputColorHighlightOID as B}from"../views/3d/webgl-engine/shaders/OutputColorHighlightOID.glsl.js";import{ShaderBuilder as F}from"../views/webgl/ShaderBuilder.js";function x(x){const V=new F,{vertex:_,fragment:M,varyings:$}=V;L(_,x),$.add("vpos","vec3",{invariant:!0}),V.include(s,x);const{output:z,spherical:H,pbrMode:N,receiveShadows:E,hasBloom:G,snowCover:T}=x,k=o(z);switch((k||z===a.ObjectAndLayerIdColor)&&(V.include(n,x),V.include(f,x),V.include(e,x),V.include(l,x),V.include(y,x),$.add("vnormal","vec3"),$.add("vcolor","vec4"),_.main.add(A`
      vpos = calculateVPos();
      vnormal = normalize(localNormal());
      forwardViewPosDepth((view * vec4(vpos, 1.0)).xyz);

      gl_Position = transformPosition(proj, view, vpos);

      ${k?"forwardLinearDepth();":""}
      forwardObjectAndLayerIdColor();

      vcolor = getColor();`)),z){case a.ColorEmission:case a.Color:V.include(b,x),V.include(m,x),M.include(c,x),V.include(f,x),V.include(p,x),M.include(r,x),V.include(B,x),S(M,x),g(M),v(M),M.uniforms.add(_.uniforms.get("localOrigin"),new O("ambient",(e=>e.ambient)),new O("diffuse",(e=>e.diffuse)),new C("opacity",(e=>e.opacity))),M.include(j),M.include(I,x),h(M),M.main.add(A`
        discardBySlice(vpos);
        discardByTerrainDepth();

        shadingParams.viewDirection = normalize(vpos - cameraPosition);
        shadingParams.normalView = vnormal;
        vec3 normal = shadingNormal(shadingParams);
        float ssao = evaluateAmbientOcclusionInverse();

        vec3 posWorld = vpos + localOrigin;
        vec3 normalGround = ${H?"normalize(posWorld);":"vec3(0.0, 0.0, 1.0);"}

        vec3 albedo = vcolor.rgb * max(ambient, diffuse); // combine the old material parameters into a single one
        float combinedOpacity = vcolor.a * opacity;

        ${D(T,A`float snow = getSnow(normal, normalGround);
                 albedo = mix(albedo, vec3(1), snow);
                 ssao = mix(ssao, 1.0, snow);`)}

        float additionalAmbientScale = additionalDirectedAmbientLight(posWorld);
        vec3 additionalLight = ssao * mainLightIntensity * additionalAmbientScale * ambientBoostFactor * lightingGlobalFactor;
        float shadow = ${E?"max(lightingGlobalFactor * (1.0 - additionalAmbientScale), readShadowMap(vpos, linearDepth));":H?"lightingGlobalFactor * (1.0 - additionalAmbientScale);":"0.0;"}

        ${D(N===u.Schematic,`float additionalAmbientIrradiance = additionalAmbientIrradianceFactor * mainLightIntensity[2];\n           vec4 emission = ${G?"vec4(0.0)":"getEmissions(albedo)"};\n           ${D(T,"mrr = applySnowToMRR(mrr, snow);\n              emission = snowCoverForEmissions(emission, snow);")}`)}

        vec3 shadedColor = ${N===u.Schematic?"evaluateSceneLightingPBR(normal, albedo, shadow, 1.0 - ssao, additionalLight, shadingParams.viewDirection, normalGround, mrr, emission, additionalAmbientIrradiance);":"evaluateSceneLighting(normal, albedo, shadow, 1.0 - ssao, additionalLight);"}
        vec4 finalColor = vec4(shadedColor, combinedOpacity);
        outputColorHighlightOID(finalColor, vpos, albedo ${D(T,", snow")});`);break;case a.Depth:V.include(n,x),_.main.add(A`vpos = calculateVPos();
gl_Position = transformPosition(proj, view, vpos);`),V.fragment.include(r,x),M.main.add(A`discardBySlice(vpos);`);break;case a.Shadow:case a.ShadowHighlight:case a.ShadowExcludeHighlight:case a.ViewshedShadow:V.include(n,x),i(V),$.add("depth","float"),_.main.add(A`vpos = calculateVPos();
gl_Position = transformPositionWithDepth(proj, view, vpos, nearFar, depth);`),V.fragment.include(r,x),V.include(d,x),M.main.add(A`discardBySlice(vpos);
outputDepth(depth);`);break;case a.ObjectAndLayerIdColor:V.fragment.include(r,x),M.main.add(A`discardBySlice(vpos);
outputObjectAndLayerIdColor();`);break;case a.Normal:V.include(n,x),V.include(w,x),P(_),$.add("vnormal","vec3"),_.main.add(A`vpos = calculateVPos();
vnormal = normalize((viewNormal * vec4(localNormal(), 1.0)).xyz);
gl_Position = transformPosition(proj, view, vpos);`),V.fragment.include(r,x),M.main.add(A`discardBySlice(vpos);
vec3 normal = normalize(vnormal);
if (gl_FrontFacing == false) normal = -normal;
fragColor = vec4(vec3(0.5) + 0.5 * normal, 1.0);`);break;case a.Highlight:V.include(n,x),V.include(w,x),$.add("vnormal","vec3"),_.main.add(A`vpos = calculateVPos();
gl_Position = transformPosition(proj, view, vpos);`),V.fragment.include(r,x),V.include(t,x),M.main.add(A`discardBySlice(vpos);
calculateOcclusionAndOutputHighlight();`)}return V}const V=Object.freeze(Object.defineProperty({__proto__:null,build:x},Symbol.toStringTag,{value:"Module"}));export{V as P,x as b};
