/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{copy as e,set as o}from"../core/libs/gl-matrix-2/math/vec2.js";import{create as i}from"../core/libs/gl-matrix-2/factories/vec2f64.js";import{ZEROS as r,fromValues as t}from"../core/libs/gl-matrix-2/factories/vec4f64.js";import{earth as l}from"../geometry/support/Ellipsoid.js";import{ShaderOutput as a}from"../views/3d/webgl-engine/core/shaderLibrary/ShaderOutput.js";import{RejectBySlice as s}from"../views/3d/webgl-engine/core/shaderLibrary/Slice.glsl.js";import{ObjectAndLayerIdColor as n}from"../views/3d/webgl-engine/core/shaderLibrary/attributes/ObjectAndLayerIdColor.glsl.js";import{AlignPixel as c}from"../views/3d/webgl-engine/core/shaderLibrary/hud/AlignPixel.glsl.js";import{HUD as d}from"../views/3d/webgl-engine/core/shaderLibrary/hud/HUD.glsl.js";import{HUDOcclusionPass as u}from"../views/3d/webgl-engine/core/shaderLibrary/hud/HUDOcclusionPass.glsl.js";import{HUDVisibility as f}from"../views/3d/webgl-engine/core/shaderLibrary/hud/HUDVisibility.glsl.js";import{OutputHighlight as p}from"../views/3d/webgl-engine/core/shaderLibrary/output/OutputHighlight.glsl.js";import{VisualVariables as m}from"../views/3d/webgl-engine/core/shaderLibrary/shading/VisualVariables.glsl.js";import{ColorConversion as g}from"../views/3d/webgl-engine/core/shaderLibrary/util/ColorConversion.glsl.js";import{RgbaFloatEncoding as v}from"../views/3d/webgl-engine/core/shaderLibrary/util/RgbaFloatEncoding.glsl.js";import{ScreenSizePerspective as b,addScreenSizePerspective as h,addScreenSizePerspectiveAlignment as x}from"../views/3d/webgl-engine/core/shaderLibrary/util/ScreenSizePerspective.glsl.js";import{addPixelRatio as w}from"../views/3d/webgl-engine/core/shaderLibrary/util/View.glsl.js";import{Float2PassUniform as C}from"../views/3d/webgl-engine/core/shaderModules/Float2PassUniform.js";import{Float4BindUniform as P}from"../views/3d/webgl-engine/core/shaderModules/Float4BindUniform.js";import{Float4DrawUniform as z}from"../views/3d/webgl-engine/core/shaderModules/Float4DrawUniform.js";import{Float4PassUniform as S}from"../views/3d/webgl-engine/core/shaderModules/Float4PassUniform.js";import{FloatBindUniform as j}from"../views/3d/webgl-engine/core/shaderModules/FloatBindUniform.js";import{FloatPassUniform as y}from"../views/3d/webgl-engine/core/shaderModules/FloatPassUniform.js";import{glsl as A,If as O}from"../views/3d/webgl-engine/core/shaderModules/glsl.js";import{Texture2DBindUniform as $}from"../views/3d/webgl-engine/core/shaderModules/Texture2DBindUniform.js";import{Texture2DPassUniform as F}from"../views/3d/webgl-engine/core/shaderModules/Texture2DPassUniform.js";import{OITPass as T}from"../views/3d/webgl-engine/lib/OITPass.js";import{VertexAttribute as D}from"../views/3d/webgl-engine/lib/VertexAttribute.js";import{ShaderBuilder as E}from"../views/webgl/ShaderBuilder.js";import{alphaCutoff as L}from"../webscene/support/AlphaCutoff.js";function B(e){const i=new E,{signedDistanceFieldEnabled:B,occlusionTestEnabled:H,horizonCullingEnabled:V,pixelSnappingEnabled:_,hasScreenSizePerspective:q,debugDrawLabelBorder:k,vvSize:G,vvColor:N,hasRotation:Z,occludedFragmentFade:J,sampleSignedDistanceFieldTexelCenter:K}=e;i.include(d,e),i.vertex.include(s,e);const{occlusionPass:Q,output:W,oitPass:X}=e;if(Q)return i.include(u,e),i;const{vertex:Y,fragment:ee}=i;i.include(b),i.include(m,e),i.include(n,e),H&&i.include(f),ee.include(v),ee.include(g),i.varyings.add("vcolor","vec4"),i.varyings.add("vtc","vec2"),i.varyings.add("vsize","vec2");const oe=W===a.Highlight,ie=oe&&H;ie&&i.varyings.add("voccluded","float"),Y.uniforms.add(new P("viewport",(e=>e.camera.fullViewport)),new C("screenOffset",((e,i)=>o(R,2*e.screenOffset[0]*i.camera.pixelRatio,2*e.screenOffset[1]*i.camera.pixelRatio))),new C("anchorPosition",(e=>M(e))),new S("materialColor",(e=>e.color)),new y("materialRotation",(e=>e.rotation)),new F("tex",(e=>e.texture))),w(Y),B&&(Y.uniforms.add(new S("outlineColor",(e=>e.outlineColor))),ee.uniforms.add(new S("outlineColor",(e=>U(e)?e.outlineColor:r)),new y("outlineSize",(e=>U(e)?e.outlineSize:0)))),V&&Y.uniforms.add(new z("pointDistanceSphere",((e,o)=>{const i=o.camera.eye,r=e.origin;return t(r[0]-i[0],r[1]-i[1],r[2]-i[2],l.radius)}))),_&&Y.include(c),q&&(h(Y),x(Y)),k&&i.varyings.add("debugBorderCoords","vec4"),i.attributes.add(D.UVI,"vec2"),i.attributes.add(D.COLOR,"vec4"),i.attributes.add(D.SIZE,"vec2"),i.attributes.add(D.ROTATION,"float"),(G||N)&&i.attributes.add(D.FEATUREATTRIBUTE,"vec4"),Y.code.add(V?A`bool behindHorizon(vec3 posModel) {
vec3 camToEarthCenter = pointDistanceSphere.xyz - localOrigin;
vec3 camToPos = pointDistanceSphere.xyz + posModel;
float earthRadius = pointDistanceSphere.w;
float a = dot(camToPos, camToPos);
float b = dot(camToPos, camToEarthCenter);
float c = dot(camToEarthCenter, camToEarthCenter) - earthRadius * earthRadius;
return b > 0.0 && b < a && b * b  > a * c;
}`:A`bool behindHorizon(vec3 posModel) { return false; }`),Y.main.add(A`
    ProjectHUDAux projectAux;
    vec4 posProj = projectPositionHUD(projectAux);
    forwardObjectAndLayerIdColor();

    if (rejectBySlice(projectAux.posModel)) {
      // Project outside of clip plane
      gl_Position = vec4(1e038, 1e038, 1e038, 1.0);
      return;
    }

    if (behindHorizon(projectAux.posModel)) {
      // Project outside of clip plane
      gl_Position = vec4(1e038, 1e038, 1e038, 1.0);
      return;
    }

    vec2 inputSize;
    ${O(q,A`
        inputSize = screenSizePerspectiveScaleVec2(size, projectAux.absCosAngle, projectAux.distanceToCamera, screenSizePerspective);
        vec2 screenOffsetScaled = screenSizePerspectiveScaleVec2(screenOffset, projectAux.absCosAngle, projectAux.distanceToCamera, screenSizePerspectiveAlignment);`,A`
        inputSize = size;
        vec2 screenOffsetScaled = screenOffset;`)}
    ${O(G,A`inputSize *= vvScale(featureAttribute).xx;`)}

    vec2 combinedSize = inputSize * pixelRatio;
    vec4 quadOffset = vec4(0.0);

    ${O(H,A`
    bool visible = testHUDVisibility(posProj);
    if (!visible) {
      vtc = vec2(0.0);
      ${O(k,"debugBorderCoords = vec4(0.5, 0.5, 1.5 / combinedSize);")}
      return;
    }`)}
    ${O(ie,A`voccluded = visible ? 0.0 : 1.0;`)}
  `);const re=A`
      vec2 uvi1 = vec2(uvi.x < 0.0 ? 1.0 : 0.0, uvi.y < 0.0 ? 1.0 : 0.0);
      vec2 uv = abs(uvi + uvi1);
      vec2 texSize = vec2(textureSize(tex, 0));
      uv.x = uv.x >= ${I} ? 1.0 : uv.x / texSize.x;
      uv.y = uv.y >= ${I} ? 1.0 : uv.y / texSize.y;
      quadOffset.xy = (uvi1 - anchorPosition) * 2.0 * combinedSize;

      ${O(Z,A`
          float angle = radians(materialRotation + rotation);
          float cosAngle = cos(angle);
          float sinAngle = sin(angle);
          mat2 rotate = mat2(cosAngle, -sinAngle, sinAngle,  cosAngle);

          quadOffset.xy = rotate * quadOffset.xy;
        `)}

      quadOffset.xy = (quadOffset.xy + screenOffsetScaled) / viewport.zw * posProj.w;
  `,te=_?B?A`posProj = alignToPixelOrigin(posProj, viewport.zw) + quadOffset;`:A`posProj += quadOffset;
if (inputSize.x == size.x) {
posProj = alignToPixelOrigin(posProj, viewport.zw);
}`:A`posProj += quadOffset;`;Y.main.add(A`
    ${re}
    ${N?"vcolor = interpolateVVColor(featureAttribute.y) * materialColor;":"vcolor = color / 255.0 * materialColor;"}

    ${O(W===a.ObjectAndLayerIdColor,A`vcolor.a = 1.0;`)}

    bool alphaDiscard = vcolor.a < ${A.float(L)};
    ${O(B,`alphaDiscard = alphaDiscard && outlineColor.a < ${A.float(L)};`)}
    if (alphaDiscard) {
      // "early discard" if both symbol color (= fill) and outline color (if applicable) are transparent
      gl_Position = vec4(1e38, 1e38, 1e38, 1.0);
      return;
    } else {
      ${te}
      gl_Position = posProj;
    }

    vtc = uv;

    ${O(k,A`debugBorderCoords = vec4(uv01, 1.5 / combinedSize);`)}
    vsize = inputSize;
  `),ee.uniforms.add(new F("tex",(e=>e.texture))),J&&!oe&&ee.uniforms.add(new $("depthMap",(e=>e.mainDepth)),new j("occludedOpacity",(e=>e.hudOccludedFragmentOpacity)));const le=k?A`(isBorder > 0.0 ? 0.0 : ${A.float(L)})`:A.float(L),ae=A`
    ${O(k,A`float isBorder = float(any(lessThan(debugBorderCoords.xy, debugBorderCoords.zw)) || any(greaterThan(debugBorderCoords.xy, 1.0 - debugBorderCoords.zw)));`)}

    vec2 samplePos = vtc;

    ${O(K,A`
      float txSize = float(textureSize(tex, 0).x);
      float texelSize = 1.0 / txSize;

      // Calculate how much we have to add/subtract to/from each texel to reach the size of an onscreen pixel
      vec2 scaleFactor = (vsize - txSize) * texelSize;
      samplePos += (vec2(1.0, -1.0) * texelSize) * scaleFactor;`)}

    ${B?A`
      vec4 fillPixelColor = vcolor;

      // Get distance and map it into [-0.5, 0.5]
      float d = rgbaTofloat(texture(tex, samplePos)) - 0.5;

      // Distance in output units (i.e. pixels)
      float dist = d * vsize.x;

      // Create smooth transition from the icon into its outline
      float fillAlphaFactor = clamp(0.5 - dist, 0.0, 1.0);
      fillPixelColor.a *= fillAlphaFactor;

      if (outlineSize > 0.25) {
        vec4 outlinePixelColor = outlineColor;
        float clampedOutlineSize = min(outlineSize, 0.5*vsize.x);

        // Create smooth transition around outline
        float outlineAlphaFactor = clamp(0.5 - (abs(dist) - 0.5*clampedOutlineSize), 0.0, 1.0);
        outlinePixelColor.a *= outlineAlphaFactor;

        if (
          outlineAlphaFactor + fillAlphaFactor < ${le} ||
          fillPixelColor.a + outlinePixelColor.a < ${A.float(L)}
        ) {
          discard;
        }

        // perform un-premultiplied over operator (see https://en.wikipedia.org/wiki/Alpha_compositing#Description)
        float compositeAlpha = outlinePixelColor.a + fillPixelColor.a * (1.0 - outlinePixelColor.a);
        vec3 compositeColor = vec3(outlinePixelColor) * outlinePixelColor.a +
          vec3(fillPixelColor) * fillPixelColor.a * (1.0 - outlinePixelColor.a);

        ${O(!oe,A`fragColor = vec4(compositeColor, compositeAlpha);`)}
      } else {
        if (fillAlphaFactor < ${le}) {
          discard;
        }

        ${O(!oe,A`fragColor = premultiplyAlpha(fillPixelColor);`)}
      }

      // visualize SDF:
      // fragColor = vec4(clamp(-dist/vsize.x*2.0, 0.0, 1.0), clamp(dist/vsize.x*2.0, 0.0, 1.0), 0.0, 1.0);
      `:A`
          vec4 texColor = texture(tex, samplePos, -0.5);
          if (texColor.a < ${le}) {
            discard;
          }
          ${O(!oe,A`fragColor = texColor * premultiplyAlpha(vcolor);`)}
          `}

    ${O(J&&!oe,A`
        float zSample = texelFetch(depthMap, ivec2(gl_FragCoord.xy), 0).x;
        if (zSample < gl_FragCoord.z) {
          fragColor *= occludedOpacity;
        }
        `)}

    ${O(!oe&&k,A`fragColor = mix(fragColor, vec4(1.0, 0.0, 1.0, 1.0), isBorder * 0.5);`)}
  `;switch(W){case a.Color:case a.ColorEmission:i.outputs.add("fragColor","vec4",0),W===a.ColorEmission&&i.outputs.add("fragEmission","vec4",1),X===T.ColorAlpha&&i.outputs.add("fragAlpha","float",W===a.ColorEmission?2:1),ee.main.add(A`
        ${ae}
        ${O(X===T.FrontFace,A`fragColor.rgb /= fragColor.a;`)}
        ${O(W===a.ColorEmission,A`fragEmission = vec4(0.0);`)}
        ${O(X===T.ColorAlpha,A`fragAlpha = fragColor.a;`)}`);break;case a.ObjectAndLayerIdColor:ee.main.add(A`
        ${ae}
        outputObjectAndLayerIdColor();`);break;case a.Highlight:i.include(p,e),ee.main.add(A`
        ${ae}
        outputHighlight(${O(ie,A`voccluded == 1.0`,A`false`)});`)}return i}function U(e){return e.outlineColor[3]>0&&e.outlineSize>0}function M(o){return o.textureIsSignedDistanceField?H(o.anchorPosition,o.distanceFieldBoundingBox,R):e(R,o.anchorPosition),R}function H(e,i,r){o(r,e[0]*(i[2]-i[0])+i[0],e[1]*(i[3]-i[1])+i[1])}const R=i(),V=32e3,I=A.float(V),_=Object.freeze(Object.defineProperty({__proto__:null,build:B,calculateAnchorPosition:M,fullUV:V},Symbol.toStringTag,{value:"Module"}));export{_ as H,B as b,M as c,V as f};
