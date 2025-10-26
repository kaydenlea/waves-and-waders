/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{translate as e}from"../core/libs/gl-matrix-2/math/mat4.js";import{create as r}from"../core/libs/gl-matrix-2/factories/mat4f64.js";import{n as o,i as a}from"./vec32.js";import{create as i}from"../core/libs/gl-matrix-2/factories/vec3f64.js";import{OverlayContent as l}from"../views/3d/terrain/OverlayContent.js";import{TransparencyMode as t}from"../views/3d/terrain/TransparencyMode.js";import{addLinearDepth as n,addNearFar as s,ForwardLinearDepth as c}from"../views/3d/webgl-engine/core/shaderLibrary/ForwardLinearDepth.glsl.js";import{ShaderOutput as d}from"../views/3d/webgl-engine/core/shaderLibrary/ShaderOutput.js";import{SliceDraw as m}from"../views/3d/webgl-engine/core/shaderLibrary/Slice.glsl.js";import{Transform as v}from"../views/3d/webgl-engine/core/shaderLibrary/Transform.glsl.js";import{NormalAttribute as g}from"../views/3d/webgl-engine/core/shaderLibrary/attributes/NormalAttribute.glsl.js";import{TextureCoordinateAttribute as p}from"../views/3d/webgl-engine/core/shaderLibrary/attributes/TextureCoordinateAttribute.glsl.js";import{VertexTangent as f}from"../views/3d/webgl-engine/core/shaderLibrary/attributes/VertexTangent.glsl.js";import{OutputDepth as u}from"../views/3d/webgl-engine/core/shaderLibrary/output/OutputDepth.glsl.js";import{OutputHighlight as w}from"../views/3d/webgl-engine/core/shaderLibrary/output/OutputHighlight.glsl.js";import{OutputHighlightOverlay as h}from"../views/3d/webgl-engine/core/shaderLibrary/output/OutputHighlightOverlay.js";import{EvaluateAmbientOcclusion as b}from"../views/3d/webgl-engine/core/shaderLibrary/shading/EvaluateAmbientOcclusion.glsl.js";import{EvaluateSceneLighting as C,addAmbientBoostFactor as y,addLightingGlobalFactor as x}from"../views/3d/webgl-engine/core/shaderLibrary/shading/EvaluateSceneLighting.glsl.js";import{addMainLightDirection as O,addMainLightIntensity as j}from"../views/3d/webgl-engine/core/shaderLibrary/shading/MainLighting.glsl.js";import{NormalUtils as S}from"../views/3d/webgl-engine/core/shaderLibrary/shading/NormalUtils.glsl.js";import{PBRMode as L}from"../views/3d/webgl-engine/core/shaderLibrary/shading/PhysicallyBasedRenderingParameters.glsl.js";import{ReadShadowMapDraw as T}from"../views/3d/webgl-engine/core/shaderLibrary/shading/ReadShadowMap.glsl.js";import{OverlayTerrain as z,OverlayMode as P}from"../views/3d/webgl-engine/core/shaderLibrary/terrain/Overlay.glsl.js";import{OverlayTerrainPassParameters as M,TerrainTexture as $}from"../views/3d/webgl-engine/core/shaderLibrary/terrain/TerrainTexture.glsl.js";import{addProjViewLocalOrigin as N,addViewNormal as W,addCameraPosition as D}from"../views/3d/webgl-engine/core/shaderLibrary/util/View.glsl.js";import{Float3BindUniform as A}from"../views/3d/webgl-engine/core/shaderModules/Float3BindUniform.js";import{If as F,glsl as V}from"../views/3d/webgl-engine/core/shaderModules/glsl.js";import{Matrix4DrawUniform as _}from"../views/3d/webgl-engine/core/shaderModules/Matrix4DrawUniform.js";import{Texture2DBindUniform as B}from"../views/3d/webgl-engine/core/shaderModules/Texture2DBindUniform.js";import{VertexAttribute as U}from"../views/3d/webgl-engine/lib/VertexAttribute.js";import{ShaderBuilder as H}from"../views/webgl/ShaderBuilder.js";import{alphaCutoff as I}from"../webscene/support/AlphaCutoff.js";class k extends M{}function E(r){const i=new H,{attributes:M,vertex:k,fragment:E,varyings:R}=i;M.add(U.POSITION,"vec3"),i.include(g,r),i.include(p,r);const J=()=>{i.include(S,r),k.code.add(V`vec3 getNormal() {
float z = 1.0 - abs(normalCompressed.x) - abs(normalCompressed.y);
vec3 n = vec3(normalCompressed + vec2(normalCompressed.x >= 0.0 ? 1.0 : -1.0,
normalCompressed.y >= 0.0 ? 1.0 : -1.0) * min(z, 0.0), z);
return normalize(n);
}`)};N(k,r),i.include(v,r);const{output:K,pbrMode:Q,overlayMode:X,tileBorders:Y,spherical:Z,transparencyMode:ee,screenSizePerspective:re,overlayEnabled:oe}=r,ae=ee===t.InvisibleWithDraped||ee===t.Invisible,ie=oe&&ae;switch(K){case d.ColorEmission:case d.Color:{i.include($,r),i.include(C,r),oe&&(r.pbrMode=Q===L.Simplified?L.TerrainWithWater:L.Water,i.include(z,r),r.pbrMode=Q);const t=X===P.EnabledWithWater;t&&i.include(f,r),R.add("vnormal","vec3"),R.add("vpos","vec3",{invariant:!0}),R.add("vup","vec3"),J(),re&&W(k);const n=r.receiveShadows&&!r.renderOccluded;n&&i.include(c,r),re&&(R.add("screenSizeDistanceToCamera","float"),R.add("screenSizeCosAngle","float")),k.main.add(V`
          vpos = position;
          vec3 positionWorld = position + localOrigin;
          gl_Position = transformPosition(proj, view, vpos);
          vnormal = getNormal();
          vup = getLocalUp(position, localOrigin);
          ${F(t,V`forwardVertexTangent(vnormal);`)}

          forwardTextureCoordinatesWithTransform(uv0);
          ${F(oe,"setOverlayVTC(uv0);")}
          ${F(Y,"forwardTextureCoordinates();")}
          ${F(re,V`vec3 viewPos = (view * vec4(vpos, 1.0)).xyz;
                 screenSizeDistanceToCamera = length(viewPos);
                 vec3 viewSpaceNormal = (viewNormal * vec4(normalize(positionWorld), 1.0)).xyz;
                 screenSizeCosAngle = abs(viewSpaceNormal.z);`)}
          ${F(n,"forwardLinearDepth();")}`),E.include(m,r),i.include(C,r),E.include(b,r),i.include(T,r),D(E,r),y(E),x(E),E.uniforms.add(k.uniforms.get("localOrigin"),new A("viewDirection",(({camera:e})=>o(G,a(G,e.viewMatrix[12],e.viewMatrix[13],e.viewMatrix[14]))))),t&&E.uniforms.add(new B("ovWaterTex",(e=>e.overlay?.getTexture(l.WaterNormal))),new _("view",(({origin:r},{camera:o})=>e(q,o.viewMatrix,r))));const s=.2;E.code.add(V`float lum(vec3 c) {
return (min(min(c.r, c.g), c.b) + max(max(c.r, c.g), c.b)) * 0.5;
}`),O(E),j(E),E.main.add(V`
          vec3 normal = normalize(vnormal);
          float vndl = dot(normal, mainLightDirection);

          float additionalAmbientScale = smoothstep(0.0, 1.0, clamp(vndl*2.5, 0.0, 1.0));
          float shadow = ${n?"max(lightingGlobalFactor * (1.0 - additionalAmbientScale), readShadowMap(vpos, linearDepth))":Z?"lightingGlobalFactor * (1.0 - additionalAmbientScale)":"0.0"};

          float ssao = evaluateAmbientOcclusionInverse();
          vec4 tileColor = getTileColor();

          ${F(oe,V`vec4 overlayColorOpaque = getOverlayColor(ovColorTex, vtcOverlay);
                   vec4 overlayColor = overlayOpacity * overlayColorOpaque;
                   ${F(ae,`if (overlayColor.a < ${V.float(I)}) { discard; }`)}
                   vec4 groundColor = tileColor;
                   tileColor = tileColor * (1.0 - overlayColor.a) + overlayColor;`)}

          // If combined alpha is 0 we can discard pixel. The performance impact by having a discard here
          // is neglectable because terrain typically renders first into the framebuffer.
          if(tileColor.a < ${V.float(I)}) {
            discard;
          }

          bool sliced = rejectBySlice(vpos);
          if (sliced) {
            tileColor *= ${V.float(s)};
          }

          vec3 albedo = tileColor.rgb;

          // heuristic shading function used in the old terrain, now used to add ambient lighting

          vec3 additionalLight = ssao * mainLightIntensity * additionalAmbientScale * ambientBoostFactor * lightingGlobalFactor;

          ${Q===L.Simplified||Q===L.TerrainWithWater?V`fragColor = vec4(evaluatePBRSimplifiedLighting(normal, albedo, shadow, 1.0 - ssao, additionalLight, normalize(vpos - cameraPosition), vup), tileColor.a);`:V`fragColor = vec4(evaluateSceneLighting(normal, albedo, shadow, 1.0 - ssao, additionalLight), tileColor.a);`}
          ${F(t,V`vec4 overlayWaterMask = getOverlayColor(ovWaterTex, vtcOverlay);
                   float waterNormalLength = length(overlayWaterMask);
                   if (waterNormalLength > 0.95) {
                     mat3 tbnMatrix = mat3(tbnTangent, tbnBiTangent, vnormal);
                     vec4 waterOverlayColor = vec4(overlayColor.w > 0.0 ? overlayColorOpaque.xyz/overlayColor.w : vec3(1.0), overlayColor.w);
                     vec4 viewPosition = view*vec4(vpos, 1.0);
                     vec4 waterColorLinear = getOverlayWaterColor(overlayWaterMask, waterOverlayColor, -normalize(vpos - cameraPosition), shadow, vnormal, tbnMatrix, viewPosition.xyz,  vpos + localOrigin);
                     vec4 waterColorNonLinear = delinearizeGamma(vec4(waterColorLinear.xyz, 1.0));
                     float opacity = sliced ? ${V.float(s)} : 1.0;
                     // un-gamma the ground color to mix in linear space
                     fragColor = mix(groundColor, waterColorNonLinear, waterColorLinear.w) * opacity;
                   }`)}
          ${F(re,V`float perspectiveScale = screenSizePerspectiveScaleFloat(1.0, screenSizeCosAngle, screenSizeDistanceToCamera, vec4(0.0));
                   if (perspectiveScale <= 0.25) {
                     fragColor = mix(fragColor, vec4(1.0, 0.0, 0.0, 1.0), perspectiveScale * 4.0);
                   } else if (perspectiveScale <= 0.5) {
                     fragColor = mix(fragColor, vec4(0.0, 0.0, 1.0, 1.0), (perspectiveScale - 0.25) * 4.0);
                   } else if (perspectiveScale >= 0.99) {
                     fragColor = mix(fragColor, vec4(0.0, 1.0, 0.0, 1.0), 0.2);
                   } else {
                     fragColor = mix(fragColor, vec4(1.0, 0.0, 1.0, 1.0), (perspectiveScale - 0.5) * 2.0);
                   }`)}
          ${F(r.visualizeNormals,Z?V`
                  vec3 localUp = normalize(vpos + localOrigin);
                  vec3 right = normalize(cross(vec3(0.0, 0.0, 1.0), localUp));
                  vec3 forward = normalize(cross(localUp, right));
                  mat3 tbn = mat3(right, forward, localUp);
                  vec3 tNormal = normalize(normal * tbn);
                  fragColor = vec4(vec3(0.5) + 0.5 * tNormal, 0.0);`:V`
                  vec3 tNormal = normalize(normal);
                  fragColor = vec4(vec3(0.5) + 0.5 * tNormal, 0.0);`)}
          ${F(Y,V`vec2 dVuv = fwidth(vuv0);
                 vec2 edgeFactors = smoothstep(vec2(0.0), 1.5 * dVuv, min(vuv0, 1.0 - vuv0));
                 float edgeFactor = 1.0 - min(edgeFactors.x, edgeFactors.y);
                 fragColor = mix(fragColor, vec4(1.0, 0.0, 0.0, 1.0), edgeFactor);`)}
          fragColor = applySlice(fragColor, vpos);`)}break;case d.Depth:ie&&i.include(z,r),k.main.add(V`
        ${F(ie,"setOverlayVTC(uv0);")}
        gl_Position = transformPosition(proj, view, position);`),E.main.add(`${F(ie,`if (getCombinedOverlayColor().a < ${V.float(I)}) discard;`)}`);break;case d.Shadow:case d.ShadowHighlight:case d.ShadowExcludeHighlight:case d.ViewshedShadow:i.include(u,r),n(i),s(i),k.main.add(V`gl_Position = transformPositionWithDepth(proj, view, position, nearFar, linearDepth);`),E.main.add(V`outputDepth(linearDepth);`);break;case d.Normal:ie&&i.include(z,r),R.add("vnormal","vec3"),W(k),J(),k.main.add(V`
        ${F(ie,"setOverlayVTC(uv0);")}
        gl_Position = transformPosition(proj, view, position);
        vnormal = normalize((viewNormal * vec4(getNormal(), 1.0)).xyz);`),E.main.add(V`
        ${F(ie,`if (getCombinedOverlayColor().a < ${V.float(I)}) discard;`)}
        vec3 normal = normalize(vnormal);
        if (gl_FrontFacing == false) {
          normal = -normal;
        }
        fragColor = vec4(vec3(0.5) + 0.5 * normal, 1.0);`);break;case d.Highlight:oe&&(i.include(z,r),i.include(h,r)),k.main.add(V`
        ${F(oe,"setOverlayVTC(uv0);")}
        gl_Position = transformPosition(proj, view, position);`),i.include(w,r),E.main.add(V`
        ${F(oe,V`
           calculateOcclusionAndOutputHighlight(getAllOverlayHighlightValuesEncoded());`,"calculateOcclusionAndOutputHighlight();")}
      `)}if(K===d.ObjectAndLayerIdColor)if(oe)r.pbrMode=L.Disabled,i.include(z,r),r.pbrMode=Q,k.main.add(V`gl_Position = transformPosition(proj, view, position);
setOverlayVTC(uv0);`),E.main.add(V`fragColor = getOverlayColorTexel();`);else{const e=ee===t.Opaque;k.main.add(V`${F(e,"gl_Position = transformPosition(proj, view, position);")}`),E.main.add(V`fragColor = vec4(0.0);`)}return i}const q=r(),G=i(),R=Object.freeze(Object.defineProperty({__proto__:null,TerrainPassParameters:k,build:E},Symbol.toStringTag,{value:"Module"}));export{k as T,R as a,E as b};
