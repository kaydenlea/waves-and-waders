/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{markerTextureSize as e,markerSymbolSize as r,markerTipThicknessFactor as i}from"../views/3d/support/engineContent/marker.js";import{SliceDraw as o}from"../views/3d/webgl-engine/core/shaderLibrary/Slice.glsl.js";import{RibbonVertexPosition as t}from"../views/3d/webgl-engine/core/shaderLibrary/attributes/RibbonVertexPosition.glsl.js";import{OutputHighlight as a}from"../views/3d/webgl-engine/core/shaderLibrary/output/OutputHighlight.glsl.js";import{MarkerSizing as n}from"../views/3d/webgl-engine/core/shaderLibrary/shading/MarkerSizing.glsl.js";import{terrainDepthTest as s}from"../views/3d/webgl-engine/core/shaderLibrary/shading/TerrainDepthTest.glsl.js";import{ColorConversion as l}from"../views/3d/webgl-engine/core/shaderLibrary/util/ColorConversion.glsl.js";import{RgbaFloatEncoding as c}from"../views/3d/webgl-engine/core/shaderLibrary/util/RgbaFloatEncoding.glsl.js";import{addProjViewLocalOrigin as p,addViewNormal as d,addPixelRatio as v}from"../views/3d/webgl-engine/core/shaderLibrary/util/View.glsl.js";import{Float2BindUniform as m}from"../views/3d/webgl-engine/core/shaderModules/Float2BindUniform.js";import{Float4BindUniform as h}from"../views/3d/webgl-engine/core/shaderModules/Float4BindUniform.js";import{Float4PassUniform as f}from"../views/3d/webgl-engine/core/shaderModules/Float4PassUniform.js";import{FloatBindUniform as g}from"../views/3d/webgl-engine/core/shaderModules/FloatBindUniform.js";import{glsl as u,If as w}from"../views/3d/webgl-engine/core/shaderModules/glsl.js";import{Matrix4BindUniform as S}from"../views/3d/webgl-engine/core/shaderModules/Matrix4BindUniform.js";import{Texture2DPassUniform as b}from"../views/3d/webgl-engine/core/shaderModules/Texture2DPassUniform.js";import{VertexAttribute as y}from"../views/3d/webgl-engine/lib/VertexAttribute.js";import{LineMarkerSpace as x,LineMarkerAnchor as P}from"../views/3d/webgl-engine/shaders/LineMarkerTechniqueConfiguration.js";import{outputColorHighlightOID as z}from"../views/3d/webgl-engine/shaders/OutputColorHighlightOID.glsl.js";import{ShaderBuilder as j}from"../views/webgl/ShaderBuilder.js";function L(L){const k=new j,{space:M,anchor:D,hasTip:C}=L,$=M===x.World;k.include(t,L),k.include(n,L),k.include(s,L);const{vertex:O,fragment:T,varyings:W}=k;T.include(c),p(O,L),k.attributes.add(y.POSITION,"vec3"),k.attributes.add(y.PREVIOUSDELTA,"vec4"),k.attributes.add(y.UV0,"vec2"),W.add("vColor","vec4"),W.add("vpos","vec3",{invariant:!0}),W.add("vUV","vec2"),W.add("vSize","float"),C&&W.add("vLineWidth","float"),O.uniforms.add(new m("nearFar",(({camera:e})=>e.nearFar)),new h("viewport",(({camera:e})=>e.fullViewport))).code.add(u`vec4 projectAndScale(vec4 pos) {
vec4 posNdc = proj * pos;
posNdc.xy *= viewport.zw / posNdc.w;
return posNdc;
}`),O.code.add(u`void clip(vec4 pos, inout vec4 prev) {
float vnp = nearFar[0] * 0.99;
if (prev.z > -nearFar[0]) {
float interpolation = (-vnp - pos.z) / (prev.z - pos.z);
prev = mix(pos, prev, interpolation);
}
}`),$?(k.attributes.add(y.NORMAL,"vec3"),d(O),O.constants.add("tiltThreshold","float",.7),O.code.add(u`vec3 perpendicular(vec3 v) {
vec3 n = (viewNormal * vec4(normal.xyz, 1.0)).xyz;
vec3 n2 = cross(v, n);
vec3 forward = vec3(0.0, 0.0, 1.0);
float tiltDot = dot(forward, n);
return abs(tiltDot) < tiltThreshold ? n : n2;
}`)):O.code.add(u`vec2 perpendicular(vec2 v) {
return vec2(v.y, -v.x);
}`);const U=$?"vec3":"vec2";return O.code.add(u`
      ${U} normalizedSegment(${U} pos, ${U} prev) {
        ${U} segment = pos - prev;
        float segmentLen = length(segment);

        // normalize or zero if too short
        return (segmentLen > 0.001) ? segment / segmentLen : ${$?"vec3(0.0, 0.0, 0.0)":"vec2(0.0, 0.0)"};
      }

      ${U} displace(${U} pos, ${U} prev, float displacementLen) {
        ${U} segment = normalizedSegment(pos, prev);

        ${U} displacementDirU = perpendicular(segment);
        ${U} displacementDirV = segment;

        ${D===P.Tip?"pos -= 0.5 * displacementLen * displacementDirV;":""}

        return pos + displacementLen * (uv0.x * displacementDirU + uv0.y * displacementDirV);
      }
    `),M===x.Screen&&(O.uniforms.add(new S("inverseProjectionMatrix",(({camera:e})=>e.inverseProjectionMatrix))),O.code.add(u`vec3 inverseProject(vec4 posScreen) {
posScreen.xy = (posScreen.xy / viewport.zw) * posScreen.w;
return (inverseProjectionMatrix * posScreen).xyz;
}`),O.code.add(u`bool rayIntersectPlane(vec3 rayDir, vec3 planeOrigin, vec3 planeNormal, out vec3 intersection) {
float cos = dot(rayDir, planeNormal);
float t = dot(planeOrigin, planeNormal) / cos;
intersection = t * rayDir;
return abs(cos) > 0.001 && t > 0.0;
}`),O.uniforms.add(new g("perScreenPixelRatio",(({camera:e})=>e.perScreenPixelRatio))),O.code.add(u`
      vec4 toFront(vec4 displacedPosScreen, vec3 posLeft, vec3 posRight, vec3 prev, float lineWidth) {
        // Project displaced position back to camera space
        vec3 displacedPos = inverseProject(displacedPosScreen);

        // Calculate the plane that we want the marker to lie in. Note that this will always be an approximation since ribbon lines are generally
        // not planar and we do not know the actual position of the displaced prev vertices (they are offset in screen space, too).
        vec3 planeNormal = normalize(cross(posLeft - posRight, posLeft - prev));
        vec3 planeOrigin = posLeft;

        ${w(L.hasCap,"if(prev.z > posLeft.z) {\n                vec2 diff = posLeft.xy - posRight.xy;\n                planeOrigin.xy += perpendicular(diff) / 2.0;\n             }")};

        // Move the plane towards the camera by a margin dependent on the line width (approximated in world space). This tolerance corrects for the
        // non-planarity in most cases, but sharp joins can place the prev vertices at arbitrary positions so markers can still clip.
        float offset = lineWidth * perScreenPixelRatio;
        planeOrigin *= (1.0 - offset);

        // Intersect camera ray with the plane and make sure it is within clip space
        vec3 rayDir = normalize(displacedPos);
        vec3 intersection;
        if (rayIntersectPlane(rayDir, planeOrigin, planeNormal, intersection) && intersection.z < -nearFar[0] && intersection.z > -nearFar[1]) {
          return vec4(intersection.xyz, 1.0);
        }

        // Fallback: use depth of pos or prev, whichever is closer to the camera
        float minDepth = planeOrigin.z > prev.z ? length(planeOrigin) : length(prev);
        displacedPos *= minDepth / length(displacedPos);
        return vec4(displacedPos.xyz, 1.0);
      }
  `)),v(O),O.main.add(u`
    // Check for special value of uv0.y which is used by the Renderer when graphics
    // are removed before the VBO is recompacted. If this is the case, then we just
    // project outside of clip space.
    if (uv0.y == 0.0) {
      // Project out of clip space
      gl_Position = vec4(1e038, 1e038, 1e038, 1.0);
    }
    else {
      float lineWidth = getLineWidth();
      float screenMarkerSize = getScreenMarkerSize();

      vec4 pos  = view * vec4(position, 1.0);
      vec4 prev = view * vec4(position + previousDelta.xyz * previousDelta.w, 1.0);
      clip(pos, prev);

      ${$?u`${w(L.hideOnShortSegments,u`
                if (areWorldMarkersHidden(pos, prev)) {
                  // Project out of clip space
                  gl_Position = vec4(1e038, 1e038, 1e038, 1.0);
                  return;
                }`)}
            pos.xyz = displace(pos.xyz, prev.xyz, getWorldMarkerSize(pos));
            vec4 displacedPosScreen = projectAndScale(pos);`:u`
            vec4 posScreen = projectAndScale(pos);
            vec4 prevScreen = projectAndScale(prev);
            vec4 displacedPosScreen = posScreen;

            displacedPosScreen.xy = displace(posScreen.xy, prevScreen.xy, screenMarkerSize);
            ${w(M===x.Screen,u`
                vec2 displacementDirU = perpendicular(normalizedSegment(posScreen.xy, prevScreen.xy));

                // We need three points of the ribbon line in camera space to calculate the plane it lies in
                // Note that we approximate the third point, since we have no information about the join around prev
                vec3 lineRight = inverseProject(posScreen + lineWidth * vec4(displacementDirU.xy, 0.0, 0.0));
                vec3 lineLeft = pos.xyz + (pos.xyz - lineRight);

                pos = toFront(displacedPosScreen, lineLeft, lineRight, prev.xyz, lineWidth);
                displacedPosScreen = projectAndScale(pos);`)}`}
      forwardViewPosDepth(pos.xyz);
      // Convert back into NDC
      displacedPosScreen.xy = (displacedPosScreen.xy / viewport.zw) * displacedPosScreen.w;

      // Convert texture coordinate into [0,1]
      vUV = (uv0 + 1.0) / 2.0;
      ${w(!$,"vUV *= displacedPosScreen.w;")}
      ${w(C,"vLineWidth = lineWidth;")}

      vSize = screenMarkerSize;
      vColor = getColor();

      // Use camera space for slicing
      vpos = pos.xyz;

      gl_Position = displacedPosScreen;
    }`),T.include(o,L),k.include(z,L),T.include(l),T.uniforms.add(new f("intrinsicColor",(({color:e})=>e)),new b("tex",(({markerTexture:e})=>e))).constants.add("texelSize","float",1/e).code.add(u`float markerAlpha(vec2 samplePos) {
samplePos += vec2(0.5, -0.5) * texelSize;
float sdf = rgbaTofloat(texture(tex, samplePos)) - 0.5;
float distance = sdf * vSize;
distance -= 0.5;
return clamp(0.5 - distance, 0.0, 1.0);
}`),C&&T.constants.add("relativeMarkerSize","float",r/e).constants.add("relativeTipLineWidth","float",i).code.add(u`
    float tipAlpha(vec2 samplePos) {
      // Convert coordinates s.t. they are in pixels and relative to the tip of an arrow marker
      samplePos -= vec2(0.5, 0.5 + 0.5 * relativeMarkerSize);
      samplePos *= vSize;

      float halfMarkerSize = 0.5 * relativeMarkerSize * vSize;
      float halfTipLineWidth = 0.5 * max(1.0, relativeTipLineWidth * vLineWidth);

      ${w($,"halfTipLineWidth *= fwidth(samplePos.y);")}

      float distance = max(abs(samplePos.x) - halfMarkerSize, abs(samplePos.y) - halfTipLineWidth);
      return clamp(0.5 - distance, 0.0, 1.0);
    }
  `),k.include(a,L),T.main.add(u`
    discardBySlice(vpos);
    discardByTerrainDepth();

    vec4 finalColor = intrinsicColor * vColor;

    // Cancel out perspective correct interpolation if in screen space or draped
    vec2 samplePos = vUV ${w(!$,"* gl_FragCoord.w")};
    finalColor.a *= ${C?"max(markerAlpha(samplePos), tipAlpha(samplePos))":"markerAlpha(samplePos)"};
    outputColorHighlightOID(finalColor, vpos, finalColor.rgb);`),k}const k=Object.freeze(Object.defineProperty({__proto__:null,build:L},Symbol.toStringTag,{value:"Module"}));export{k as L,L as b};
