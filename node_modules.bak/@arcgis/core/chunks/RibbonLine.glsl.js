/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{ShaderOutput as e}from"../views/3d/webgl-engine/core/shaderLibrary/ShaderOutput.js";import{SliceDraw as i}from"../views/3d/webgl-engine/core/shaderLibrary/Slice.glsl.js";import{ObjectAndLayerIdColor as t}from"../views/3d/webgl-engine/core/shaderLibrary/attributes/ObjectAndLayerIdColor.glsl.js";import{RibbonVertexPosition as n}from"../views/3d/webgl-engine/core/shaderLibrary/attributes/RibbonVertexPosition.glsl.js";import{LineStipple as r,computePixelSize as o}from"../views/3d/webgl-engine/core/shaderLibrary/shading/LineStipple.glsl.js";import{MarkerSizing as a}from"../views/3d/webgl-engine/core/shaderLibrary/shading/MarkerSizing.glsl.js";import{PiUtils as s}from"../views/3d/webgl-engine/core/shaderLibrary/shading/PiUtils.glsl.js";import{terrainDepthTest as l}from"../views/3d/webgl-engine/core/shaderLibrary/shading/TerrainDepthTest.glsl.js";import{ColorConversion as d}from"../views/3d/webgl-engine/core/shaderLibrary/util/ColorConversion.glsl.js";import{addProjViewLocalOrigin as p,addPixelRatio as c}from"../views/3d/webgl-engine/core/shaderLibrary/util/View.glsl.js";import{Float2BindUniform as m}from"../views/3d/webgl-engine/core/shaderModules/Float2BindUniform.js";import{Float4BindUniform as v}from"../views/3d/webgl-engine/core/shaderModules/Float4BindUniform.js";import{Float4PassUniform as f}from"../views/3d/webgl-engine/core/shaderModules/Float4PassUniform.js";import{FloatBindUniform as g}from"../views/3d/webgl-engine/core/shaderModules/FloatBindUniform.js";import{FloatPassUniform as h}from"../views/3d/webgl-engine/core/shaderModules/FloatPassUniform.js";import{glsl as D}from"../views/3d/webgl-engine/core/shaderModules/glsl.js";import{Matrix4BindUniform as S}from"../views/3d/webgl-engine/core/shaderModules/Matrix4BindUniform.js";import{VertexAttribute as u}from"../views/3d/webgl-engine/lib/VertexAttribute.js";import{LineMarkerSpace as x}from"../views/3d/webgl-engine/shaders/LineMarkerTechniqueConfiguration.js";import{outputColorHighlightOID as L}from"../views/3d/webgl-engine/shaders/OutputColorHighlightOID.glsl.js";import{CapType as w}from"../views/3d/webgl-engine/shaders/RibbonLineTechniqueConfiguration.js";import{ShaderBuilder as b}from"../views/webgl/ShaderBuilder.js";import{alphaCutoff as y}from"../webscene/support/AlphaCutoff.js";const j=1;function P(P){const C=new b,{attributes:F,varyings:A,vertex:R,fragment:z}=C,{applyMarkerOffset:T,draped:V,output:W,capType:E,stippleEnabled:O,falloffEnabled:M,roundJoins:N,wireframe:_,innerColorEnabled:I}=P;z.include(s),C.include(n,P),C.include(r,P),C.include(t,P),C.include(l,P);const k=T&&!V;k&&(R.uniforms.add(new h("markerScale",(e=>e.markerScale))),C.include(a,{space:x.World})),p(R,P),R.uniforms.add(new S("inverseProjectionMatrix",(e=>e.camera.inverseProjectionMatrix)),new m("nearFar",(e=>e.camera.nearFar)),new h("miterLimit",(e=>"miter"!==e.join?0:e.miterLimit)),new v("viewport",(e=>e.camera.fullViewport))),R.constants.add("LARGE_HALF_FLOAT","float",65500),F.add(u.POSITION,"vec3"),F.add(u.PREVIOUSDELTA,"vec4"),F.add(u.NEXTDELTA,"vec4"),F.add(u.LINEPARAMETERS,"vec2"),F.add(u.U0,"float"),A.add("vColor","vec4"),A.add("vpos","vec3",{invariant:!0}),A.add("vLineDistance","float"),A.add("vLineWidth","float");const U=O;U&&A.add("vLineSizeInv","float");const B=E===w.ROUND,$=O&&B,H=M||$;H&&A.add("vLineDistanceNorm","float"),B&&(A.add("vSegmentSDF","float"),A.add("vReverseSegmentSDF","float")),R.code.add(D`vec2 perpendicular(vec2 v) {
return vec2(v.y, -v.x);
}
float interp(float ncp, vec4 a, vec4 b) {
return (-ncp - a.z) / (b.z - a.z);
}
vec2 rotate(vec2 v, float a) {
float s = sin(a);
float c = cos(a);
mat2 m = mat2(c, -s, s, c);
return m * v;
}`),R.code.add(D`vec4 projectAndScale(vec4 pos) {
vec4 posNdc = proj * pos;
posNdc.xy *= viewport.zw / posNdc.w;
return posNdc;
}`),R.code.add(D`void clipAndTransform(inout vec4 pos, inout vec4 prev, inout vec4 next, in bool isStartVertex) {
float vnp = nearFar[0] * 0.99;
if(pos.z > -nearFar[0]) {
if (!isStartVertex) {
if(prev.z < -nearFar[0]) {
pos = mix(prev, pos, interp(vnp, prev, pos));
next = pos;
} else {
pos = vec4(0.0, 0.0, 0.0, 1.0);
}
} else {
if(next.z < -nearFar[0]) {
pos = mix(pos, next, interp(vnp, pos, next));
prev = pos;
} else {
pos = vec4(0.0, 0.0, 0.0, 1.0);
}
}
} else {
if (prev.z > -nearFar[0]) {
prev = mix(pos, prev, interp(vnp, pos, prev));
}
if (next.z > -nearFar[0]) {
next = mix(next, pos, interp(vnp, next, pos));
}
}
forwardViewPosDepth(pos.xyz);
pos = projectAndScale(pos);
next = projectAndScale(next);
prev = projectAndScale(prev);
}`),c(R),R.constants.add("aaWidth","float",O?0:1).main.add(D`
    // unpack values from vertex type
    bool isStartVertex = abs(abs(lineParameters.y)-3.0) == 1.0;
    vec3 prevPosition = position + previousDelta.xyz * previousDelta.w;
    vec3 nextPosition = position + nextDelta.xyz * nextDelta.w;

    float coverage = 1.0;

    // Check for special value of lineParameters.y which is used by the Renderer when graphics are removed before the
    // VBO is recompacted. If this is the case, then we just project outside of clip space.
    if (lineParameters.y == 0.0) {
      // Project out of clip space
      gl_Position = vec4(1e038, 1e038, 1e038, 1.0);
    }
    else {
      bool isJoin = abs(lineParameters.y) < 3.0;
      float lineSize = getSize();

      if (lineSize < 1.0) {
        coverage = lineSize; // convert sub-pixel coverage to alpha
        lineSize = 1.0;
      }
      lineSize += aaWidth;

      float lineWidth = lineSize * pixelRatio;
      vLineWidth = lineWidth;
      ${U?D`vLineSizeInv = 1.0 / lineSize;`:""}

      vec4 pos  = view * vec4(position, 1.0);
      vec4 prev = view * vec4(prevPosition, 1.0);
      vec4 next = view * vec4(nextPosition, 1.0);
  `),k&&R.main.add(D`vec4 other = isStartVertex ? next : prev;
bool markersHidden = areWorldMarkersHidden(pos, other);
if(!isJoin && !markersHidden) {
pos.xyz += normalize(other.xyz - pos.xyz) * getWorldMarkerSize(pos) * 0.5;
}`),R.main.add(D`clipAndTransform(pos, prev, next, isStartVertex);
vec2 left = (pos.xy - prev.xy);
vec2 right = (next.xy - pos.xy);
float leftLen = length(left);
float rightLen = length(right);`);(O||B)&&R.main.add(D`
      float isEndVertex = float(!isStartVertex);
      vec2 segmentOrigin = mix(pos.xy, prev.xy, isEndVertex);
      vec2 segment = mix(right, left, isEndVertex);
      ${B?D`vec2 segmentEnd = mix(next.xy, pos.xy, isEndVertex);`:""}
    `),R.main.add(D`left = (leftLen > 0.001) ? left/leftLen : vec2(0.0, 0.0);
right = (rightLen > 0.001) ? right/rightLen : vec2(0.0, 0.0);
vec2 capDisplacementDir = vec2(0, 0);
vec2 joinDisplacementDir = vec2(0, 0);
float displacementLen = lineWidth;
if (isJoin) {
bool isOutside = (left.x * right.y - left.y * right.x) * lineParameters.y > 0.0;
joinDisplacementDir = normalize(left + right);
joinDisplacementDir = perpendicular(joinDisplacementDir);
if (leftLen > 0.001 && rightLen > 0.001) {
float nDotSeg = dot(joinDisplacementDir, left);
displacementLen /= length(nDotSeg * left - joinDisplacementDir);
if (!isOutside) {
displacementLen = min(displacementLen, min(leftLen, rightLen)/abs(nDotSeg));
}
}
float subdivisionFactor = lineParameters.x;
if (isOutside && (displacementLen > miterLimit * lineWidth)) {`),N?R.main.add(D`
        vec2 startDir = leftLen < 0.001 ? right : left;
        startDir = perpendicular(startDir);

        vec2 endDir = rightLen < 0.001 ? left : right;
        endDir = perpendicular(endDir);

        float factor = ${O?D`min(1.0, subdivisionFactor * ${D.float((j+2)/(j+1))})`:D`subdivisionFactor`};

        float rotationAngle = acos(clamp(dot(startDir, endDir), -1.0, 1.0));
        joinDisplacementDir = rotate(startDir, -sign(lineParameters.y) * factor * rotationAngle);
      `):R.main.add(D`if (leftLen < 0.001) {
joinDisplacementDir = right;
}
else if (rightLen < 0.001) {
joinDisplacementDir = left;
}
else {
joinDisplacementDir = (isStartVertex || subdivisionFactor > 0.0) ? right : left;
}
joinDisplacementDir = perpendicular(joinDisplacementDir);`);const J=E!==w.BUTT;return R.main.add(D`
        displacementLen = lineWidth;
      }
    } else {
      // CAP handling ---------------------------------------------------
      joinDisplacementDir = isStartVertex ? right : left;
      joinDisplacementDir = perpendicular(joinDisplacementDir);

      ${J?D`capDisplacementDir = isStartVertex ? -right : left;`:""}
    }
  `),R.main.add(D`
    // Displacement (in pixels) caused by join/or cap
    vec2 dpos = joinDisplacementDir * sign(lineParameters.y) * displacementLen + capDisplacementDir * displacementLen;
    float lineDistNorm = sign(lineParameters.y) * pos.w;

    vLineDistance =  lineWidth * lineDistNorm;
    ${H?D`vLineDistanceNorm = lineDistNorm;`:""}

    pos.xy += dpos;
  `),B&&R.main.add(D`vec2 segmentDir = normalize(segment);
vSegmentSDF = (isJoin && isStartVertex) ? LARGE_HALF_FLOAT : (dot(pos.xy - segmentOrigin, segmentDir) * pos.w) ;
vReverseSegmentSDF = (isJoin && !isStartVertex) ? LARGE_HALF_FLOAT : (dot(pos.xy - segmentEnd, -segmentDir) * pos.w);`),O&&(V?R.uniforms.add(new g("worldToScreenRatio",(e=>1/e.screenToPCSRatio))):R.main.add(D`vec3 segmentCenter = mix((nextPosition + position) * 0.5, (position + prevPosition) * 0.5, isEndVertex);
float worldToScreenRatio = computeWorldToScreenRatio(segmentCenter);`),R.main.add(D`float segmentLengthScreenDouble = length(segment);
float segmentLengthScreen = segmentLengthScreenDouble * 0.5;
float discreteWorldToScreenRatio = discretizeWorldToScreenRatio(worldToScreenRatio);
float segmentLengthRender = length(mix(nextPosition - position, position - prevPosition, isEndVertex));
vStipplePatternStretch = worldToScreenRatio / discreteWorldToScreenRatio;`),V?R.main.add(D`float segmentLengthPseudoScreen = segmentLengthScreen / pixelRatio * discreteWorldToScreenRatio / worldToScreenRatio;
float startPseudoScreen = u0 * discreteWorldToScreenRatio - mix(0.0, segmentLengthPseudoScreen, isEndVertex);`):R.main.add(D`float startPseudoScreen = mix(u0, u0 - segmentLengthRender, isEndVertex) * discreteWorldToScreenRatio;
float segmentLengthPseudoScreen = segmentLengthRender * discreteWorldToScreenRatio;`),R.uniforms.add(new h("stipplePatternPixelSize",(e=>o(e)))),R.main.add(D`float patternLength = lineSize * stipplePatternPixelSize;
vStippleDistanceLimits = computeStippleDistanceLimits(startPseudoScreen, segmentLengthPseudoScreen, segmentLengthScreen, patternLength);
vStippleDistance = mix(vStippleDistanceLimits.x, vStippleDistanceLimits.y, isEndVertex);
if (segmentLengthScreenDouble >= 0.001) {
vec2 stippleDisplacement = pos.xy - segmentOrigin;
float stippleDisplacementFactor = dot(segment, stippleDisplacement) / (segmentLengthScreenDouble * segmentLengthScreenDouble);
vStippleDistance += (stippleDisplacementFactor - isEndVertex) * (vStippleDistanceLimits.y - vStippleDistanceLimits.x);
}
vStippleDistanceLimits *= pos.w;
vStippleDistance *= pos.w;
vStippleDistanceLimits = isJoin ?
vStippleDistanceLimits :
isStartVertex ?
vec2(-1e34, vStippleDistanceLimits.y) :
vec2(vStippleDistanceLimits.x, 1e34);`)),R.main.add(D`
      // Convert back into NDC
      pos.xy = (pos.xy / viewport.zw) * pos.w;

      vColor = getColor();
      vColor.a *= coverage;

      ${_&&!V?"pos.z -= 0.001 * pos.w;":""}

      // transform final position to camera space for slicing
      vpos = (inverseProjectionMatrix * pos).xyz;
      gl_Position = pos;
      forwardObjectAndLayerIdColor();
    }`),C.fragment.include(i,P),C.include(L,P),z.include(d),z.main.add(D`discardBySlice(vpos);
discardByTerrainDepth();`),_?z.main.add(D`vec4 finalColor = vec4(1.0, 0.0, 1.0, 1.0);`):(B&&z.main.add(D`
        float sdf = min(vSegmentSDF, vReverseSegmentSDF);
        vec2 fragmentPosition = vec2(
          min(sdf, 0.0),
          vLineDistance
        ) * gl_FragCoord.w;

        float fragmentRadius = length(fragmentPosition);
        float fragmentCapSDF = (fragmentRadius - vLineWidth) * 0.5; // Divide by 2 to transform from double pixel scale
        float capCoverage = clamp(0.5 - fragmentCapSDF, 0.0, 1.0);

        if (capCoverage < ${D.float(y)}) {
          discard;
        }
      `),$?z.main.add(D`
      vec2 stipplePosition = vec2(
        min(getStippleSDF() * 2.0 - 1.0, 0.0),
        vLineDistanceNorm * gl_FragCoord.w
      );
      float stippleRadius = length(stipplePosition * vLineWidth);
      float stippleCapSDF = (stippleRadius - vLineWidth) * 0.5; // Divide by 2 to transform from double pixel scale
      float stippleCoverage = clamp(0.5 - stippleCapSDF, 0.0, 1.0);
      float stippleAlpha = step(${D.float(y)}, stippleCoverage);
      `):z.main.add(D`float stippleAlpha = getStippleAlpha();`),W!==e.ObjectAndLayerIdColor&&z.main.add(D`discardByStippleAlpha(stippleAlpha, ${D.float(y)});`),z.uniforms.add(new f("intrinsicColor",(e=>e.color))),z.main.add(D`vec4 color = intrinsicColor * vColor;`),I&&(z.uniforms.add(new f("innerColor",(e=>e.innerColor??e.color)),new h("innerWidth",((e,i)=>e.innerWidth*i.camera.pixelRatio))),z.main.add(D`float distToInner = abs(vLineDistance * gl_FragCoord.w) - innerWidth;
float innerAA = clamp(0.5 - distToInner, 0.0, 1.0);
float innerAlpha = innerColor.a + color.a * (1.0 - innerColor.a);
color = mix(color, vec4(innerColor.rgb, innerAlpha), innerAA);`)),z.main.add(D`vec4 finalColor = blendStipple(color, stippleAlpha);`),M&&(z.uniforms.add(new h("falloff",(e=>e.falloff))),z.main.add(D`finalColor.a *= pow(max(0.0, 1.0 - abs(vLineDistanceNorm * gl_FragCoord.w)), falloff);`)),O||z.main.add(D`float featherStartDistance = max(vLineWidth - 2.0, 0.0);
float value = abs(vLineDistance) * gl_FragCoord.w;
float feather = (value - featherStartDistance) / (vLineWidth - featherStartDistance);
finalColor.a *= 1.0 - clamp(feather, 0.0, 1.0);`)),z.main.add(D`outputColorHighlightOID(finalColor, vpos, finalColor.rgb);`),C}const C=Object.freeze(Object.defineProperty({__proto__:null,build:P,ribbonlineNumRoundJoinSubdivisions:j},Symbol.toStringTag,{value:"Module"}));export{C as R,P as b,j as r};
