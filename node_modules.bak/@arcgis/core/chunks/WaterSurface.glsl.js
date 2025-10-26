/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{ForwardLinearDepth as e}from"../views/3d/webgl-engine/core/shaderLibrary/ForwardLinearDepth.glsl.js";import{isColorOrColorEmission as r,ShaderOutput as i}from"../views/3d/webgl-engine/core/shaderLibrary/ShaderOutput.js";import{SliceDraw as o}from"../views/3d/webgl-engine/core/shaderLibrary/Slice.glsl.js";import{Transform as a}from"../views/3d/webgl-engine/core/shaderLibrary/Transform.glsl.js";import{ObjectAndLayerIdColor as t}from"../views/3d/webgl-engine/core/shaderLibrary/attributes/ObjectAndLayerIdColor.glsl.js";import{OutputHighlight as n}from"../views/3d/webgl-engine/core/shaderLibrary/output/OutputHighlight.glsl.js";import{EvaluateAmbientLighting as s}from"../views/3d/webgl-engine/core/shaderLibrary/shading/EvaluateAmbientLighting.glsl.js";import{addMainLightDirection as l,addMainLightIntensity as d}from"../views/3d/webgl-engine/core/shaderLibrary/shading/MainLighting.glsl.js";import{NormalUtils as g}from"../views/3d/webgl-engine/core/shaderLibrary/shading/NormalUtils.glsl.js";import{PBRMode as m}from"../views/3d/webgl-engine/core/shaderLibrary/shading/PhysicallyBasedRenderingParameters.glsl.js";import{ReadShadowMapDraw as c}from"../views/3d/webgl-engine/core/shaderLibrary/shading/ReadShadowMap.glsl.js";import{terrainDepthTest as v}from"../views/3d/webgl-engine/core/shaderLibrary/shading/TerrainDepthTest.glsl.js";import{Water as p}from"../views/3d/webgl-engine/core/shaderLibrary/shading/Water.glsl.js";import{WaterDistortion as w}from"../views/3d/webgl-engine/core/shaderLibrary/shading/WaterDistortion.glsl.js";import{ColorConversion as u}from"../views/3d/webgl-engine/core/shaderLibrary/util/ColorConversion.glsl.js";import{addProjViewLocalOrigin as f,addCameraPosition as h}from"../views/3d/webgl-engine/core/shaderLibrary/util/View.glsl.js";import{Float4PassUniform as b}from"../views/3d/webgl-engine/core/shaderModules/Float4PassUniform.js";import{FloatPassUniform as y}from"../views/3d/webgl-engine/core/shaderModules/FloatPassUniform.js";import{glsl as j}from"../views/3d/webgl-engine/core/shaderModules/glsl.js";import{VertexAttribute as L}from"../views/3d/webgl-engine/lib/VertexAttribute.js";import{outputColorHighlightOID as C}from"../views/3d/webgl-engine/shaders/OutputColorHighlightOID.glsl.js";import{ShaderBuilder as P}from"../views/webgl/ShaderBuilder.js";import{alphaCutoff as x}from"../webscene/support/AlphaCutoff.js";function O(O){const S=new P,{vertex:D,fragment:N,varyings:_}=S,{output:F,draped:M,receiveShadows:z}=O;f(D,O),S.include(a,O),S.attributes.add(L.POSITION,"vec3"),S.attributes.add(L.UV0,"vec2");const A=new b("waterColor",(e=>e.color));if(_.add("vpos","vec3",{invariant:!0}),D.uniforms.add(A),r(F)){if(M)return D.main.add(j`
      if (waterColor.a < ${j.float(x)}) {
        // Discard this vertex
        gl_Position = vec4(1e38, 1e38, 1e38, 1.0);
        return;
      }

      vpos = position;
      gl_Position = transformPosition(proj, view, vpos);`),N.uniforms.add(A),N.main.add(j`fragColor = waterColor;`),S;S.include(g,O),S.include(e,O),_.add("vuv","vec2"),_.add("vnormal","vec3"),_.add("vtbnMatrix","mat3"),D.main.add(j`
      if (waterColor.a < ${j.float(x)}) {
        // Discard this vertex
        gl_Position = vec4(1e38, 1e38, 1e38, 1.0);
        return;
      }

      vuv = uv0;
      vpos = position;

      vnormal = getLocalUp(vpos, localOrigin);
      vtbnMatrix = getTBNMatrix(vnormal);
      forwardViewPosDepth((view * vec4(vpos, 1.0)).xyz);

      gl_Position = transformPosition(proj, view, vpos);
      forwardLinearDepth();`)}switch(S.include(v,O),F){case i.Color:case i.ColorEmission:S.include(s,{pbrMode:m.Disabled,lightingSphericalHarmonicsOrder:2}),S.include(w),S.include(c,O),S.include(p,O),N.include(o,O),S.include(C,O),N.include(u),h(N,O),l(N),d(N),N.uniforms.add(A,new y("timeElapsed",(({timeElapsed:e})=>e)),D.uniforms.get("view"),D.uniforms.get("localOrigin")).main.add(j`
        discardBySlice(vpos);
        discardByTerrainDepth();
        vec3 localUp = vnormal;
        // the created normal is in tangent space
        vec4 tangentNormalFoam = getSurfaceNormalAndFoam(vuv, timeElapsed);

        // we rotate the normal according to the tangent-bitangent-normal-Matrix
        vec3 n = normalize(vtbnMatrix * tangentNormalFoam.xyz);
        vec3 v = -normalize(vpos - cameraPosition);
        float shadow = ${z?j`1.0 - readShadowMap(vpos, linearDepth)`:"1.0"};
        vec4 vPosView = view * vec4(vpos, 1.0);
        vec4 final = vec4(getSeaColor(n, v, mainLightDirection, waterColor.rgb, mainLightIntensity, localUp, shadow, tangentNormalFoam.w, vPosView.xyz, vpos + localOrigin), waterColor.w);

        // gamma correction
        fragColor = delinearizeGamma(final);
        outputColorHighlightOID(fragColor, vpos, final.rgb);`);break;case i.Normal:S.include(g,O),S.include(w,O),N.include(o,O),_.add("vuv","vec2"),D.main.add(j`
        if (waterColor.a < ${j.float(x)}) {
          // Discard this vertex
          gl_Position = vec4(1e38, 1e38, 1e38, 1.0);
          return;
        }

        vuv = uv0;
        vpos = position;

        gl_Position = transformPosition(proj, view, vpos);`),N.uniforms.add(new y("timeElapsed",(({timeElapsed:e})=>e))).main.add(j`discardBySlice(vpos);
vec4 tangentNormalFoam = getSurfaceNormalAndFoam(vuv, timeElapsed);
tangentNormalFoam.xyz = normalize(tangentNormalFoam.xyz);
fragColor = vec4((tangentNormalFoam.xyz + vec3(1.0)) * 0.5, tangentNormalFoam.w);`);break;case i.Highlight:S.include(n,O),D.main.add(j`
        if (waterColor.a < ${j.float(x)}) {
          // Discard this vertex
          gl_Position = vec4(1e38, 1e38, 1e38, 1.0);
          return;
        }

        vpos = position;
        gl_Position = transformPosition(proj, view, vpos);`),N.include(o,O),N.main.add(j`discardBySlice(vpos);
calculateOcclusionAndOutputHighlight();`);break;case i.ObjectAndLayerIdColor:S.include(t,O),D.main.add(j`
        if (waterColor.a < ${j.float(x)}) {
          // Discard this vertex
          gl_Position = vec4(1e38, 1e38, 1e38, 1.0);
          return;
        }

        vpos = position;
        gl_Position = transformPosition(proj, view, vpos);
        forwardObjectAndLayerIdColor();`),N.include(o,O),N.main.add(j`discardBySlice(vpos);
outputObjectAndLayerIdColor();`)}return S}const S=Object.freeze(Object.defineProperty({__proto__:null,build:O},Symbol.toStringTag,{value:"Module"}));export{S as W,O as b};
