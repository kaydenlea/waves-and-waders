/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{ShaderOutput as e}from"../views/3d/webgl-engine/core/shaderLibrary/ShaderOutput.js";import{SliceDraw as o}from"../views/3d/webgl-engine/core/shaderLibrary/Slice.glsl.js";import{Transform as r}from"../views/3d/webgl-engine/core/shaderLibrary/Transform.glsl.js";import{ObjectAndLayerIdColor as t}from"../views/3d/webgl-engine/core/shaderLibrary/attributes/ObjectAndLayerIdColor.glsl.js";import{VertexColor as a}from"../views/3d/webgl-engine/core/shaderLibrary/attributes/VertexColor.glsl.js";import{terrainDepthTest as i}from"../views/3d/webgl-engine/core/shaderLibrary/shading/TerrainDepthTest.glsl.js";import{VisualVariables as l}from"../views/3d/webgl-engine/core/shaderLibrary/shading/VisualVariables.glsl.js";import{ColorConversion as n}from"../views/3d/webgl-engine/core/shaderLibrary/util/ColorConversion.glsl.js";import{addProjViewLocalOrigin as c,addCameraPosition as d}from"../views/3d/webgl-engine/core/shaderLibrary/util/View.glsl.js";import{Float4PassUniform as s}from"../views/3d/webgl-engine/core/shaderModules/Float4PassUniform.js";import{FloatBindUniform as v}from"../views/3d/webgl-engine/core/shaderModules/FloatBindUniform.js";import{glsl as g,If as p}from"../views/3d/webgl-engine/core/shaderModules/glsl.js";import{VertexAttribute as m}from"../views/3d/webgl-engine/lib/VertexAttribute.js";import{Style as f}from"../views/3d/webgl-engine/materials/PatternStyle.js";import{outputColorHighlightOID as u}from"../views/3d/webgl-engine/shaders/OutputColorHighlightOID.glsl.js";import{ShaderBuilder as w}from"../views/webgl/ShaderBuilder.js";const b=.70710678118,h=b,y=.08715574274,S=10,j=1;function x(x){const T=new w,{vertex:P,fragment:R,attributes:V,varyings:D}=T,O=x.output===e.Highlight;c(P,x),T.include(r,x),T.include(a,x),T.include(l,x),T.include(t,x),T.fragment.include(o,x),T.include(u,x),T.include(i,x),x.draped?P.uniforms.add(new v("worldToScreenRatio",(e=>1/e.screenToPCSRatio))):V.add(m.BOUNDINGRECT,"mat3"),V.add(m.POSITION,"vec3"),V.add(m.UVMAPSPACE,"vec4"),x.vvColor&&V.add(m.COLORFEATUREATTRIBUTE,"float"),x.hasVertexColors||D.add("vColor","vec4"),D.add("vpos","vec3",{invariant:!0}),D.add("vuv","vec2"),P.uniforms.add(new s("uColor",(e=>e.color)));const A=x.style===f.ForwardDiagonal||x.style===f.BackwardDiagonal||x.style===f.DiagonalCross;return A&&P.code.add(g`
      const mat2 rotate45 = mat2(${g.float(b)}, ${g.float(-.70710678118)},
                                 ${g.float(h)}, ${g.float(b)});
    `),x.draped||(d(P,x),P.uniforms.add(new v("worldToScreenPerDistanceRatio",(e=>1/e.camera.perScreenPixelRatio))),P.code.add(g`vec3 projectPointToLineSegment(vec3 center, vec3 halfVector, vec3 point) {
float projectedLength = dot(halfVector, point - center) / dot(halfVector, halfVector);
return center + halfVector * clamp(projectedLength, -1.0, 1.0);
}`),P.code.add(g`vec3 intersectRayPlane(vec3 rayDir, vec3 rayOrigin, vec3 planeNormal, vec3 planePoint) {
float d = dot(planeNormal, planePoint);
float t = (d - dot(planeNormal, rayOrigin)) / dot(planeNormal, rayDir);
return rayOrigin + t * rayDir;
}`),P.code.add(g`
      float boundingRectDistanceToCamera() {
        vec3 center = vec3(boundingRect[0][0], boundingRect[0][1], boundingRect[0][2]);
        vec3 halfU = vec3(boundingRect[1][0], boundingRect[1][1], boundingRect[1][2]);
        vec3 halfV = vec3(boundingRect[2][0], boundingRect[2][1], boundingRect[2][2]);
        vec3 n = normalize(cross(halfU, halfV));

        vec3 viewDir = - vec3(view[0][2], view[1][2], view[2][2]);

        float viewAngle = dot(viewDir, n);
        float minViewAngle = ${g.float(y)};

        if (abs(viewAngle) < minViewAngle) {
          // view direction is (almost) parallel to plane -> clamp it to min angle
          float normalComponent = sign(viewAngle) * minViewAngle - viewAngle;
          viewDir = normalize(viewDir + normalComponent * n);
        }

        // intersect view direction with infinite plane that contains bounding rect
        vec3 planeProjected = intersectRayPlane(viewDir, cameraPosition, n, center);

        // clip to bounds by projecting to u and v line segments individually
        vec3 uProjected = projectPointToLineSegment(center, halfU, planeProjected);
        vec3 vProjected = projectPointToLineSegment(center, halfV, planeProjected);

        // use to calculate the closest point to camera on bounding rect
        vec3 closestPoint = uProjected + vProjected - center;

        return length(closestPoint - cameraPosition);
      }
    `)),P.code.add(g`
    vec2 scaledUV() {
      vec2 uv = uvMapSpace.xy ${p(A," * rotate45")};
      vec2 uvCellOrigin = uvMapSpace.zw ${p(A," * rotate45")};

      ${p(!x.draped,g`float distanceToCamera = boundingRectDistanceToCamera();
               float worldToScreenRatio = worldToScreenPerDistanceRatio / distanceToCamera;`)}

      // Logarithmically discretize ratio to avoid jittering
      float step = 0.1;
      float discreteWorldToScreenRatio = log(worldToScreenRatio);
      discreteWorldToScreenRatio = ceil(discreteWorldToScreenRatio / step) * step;
      discreteWorldToScreenRatio = exp(discreteWorldToScreenRatio);

      vec2 uvOffset = mod(uvCellOrigin * discreteWorldToScreenRatio, ${g.float(S)});
      return uvOffset + (uv * discreteWorldToScreenRatio);
    }
  `),P.main.add(g`
    vuv = scaledUV();
    vpos = position;
    forwardViewPosDepth((view * vec4(vpos, 1.0)).xyz);
    forwardNormalizedVertexColor();
    forwardObjectAndLayerIdColor();
    ${x.hasVertexColors?"vColor *= uColor;":x.vvColor?"vColor = uColor * interpolateVVColor(colorFeatureAttribute);":"vColor = uColor;"}
    gl_Position = transformPosition(proj, view, vpos);
  `),R.include(n),x.draped&&R.uniforms.add(new v("texelSize",(e=>1/e.camera.pixelRatio))),O||(R.code.add(g`
      const float lineWidth = ${g.float(j)};
      const float spacing = ${g.float(S)};
      const float spacingINV = ${g.float(1/S)};

      float coverage(float p, float txlSize) {
        p = mod(p, spacing);

        float halfTxlSize = txlSize / 2.0;

        float start = p - halfTxlSize;
        float end = p + halfTxlSize;

        float coverage = (ceil(end * spacingINV) - floor(start * spacingINV)) * lineWidth;
        coverage -= min(lineWidth, mod(start, spacing));
        coverage -= max(lineWidth - mod(end, spacing), 0.0);

        return coverage / txlSize;
      }
    `),x.draped||R.code.add(g`const int maxSamples = 5;
float sampleAA(float p) {
vec2 dxdy = abs(vec2(dFdx(p), dFdy(p)));
float fwidth = dxdy.x + dxdy.y;
ivec2 samples = 1 + ivec2(clamp(dxdy, 0.0, float(maxSamples - 1)));
vec2 invSamples = 1.0 / vec2(samples);
float accumulator = 0.0;
for (int j = 0; j < maxSamples; j++) {
if(j >= samples.y) {
break;
}
for (int i = 0; i < maxSamples; i++) {
if(i >= samples.x) {
break;
}
vec2 step = vec2(i,j) * invSamples - 0.5;
accumulator += coverage(p + step.x * dxdy.x + step.y * dxdy.y, fwidth);
}
}
accumulator /= float(samples.x * samples.y);
return accumulator;
}`)),R.main.add(g`
    discardBySlice(vpos);
    discardByTerrainDepth();
    vec4 color = vColor;
    ${p(!O,g`color.a *= ${C(x)};`)}
    outputColorHighlightOID(color, vpos, color.rgb);
  `),T}function C(e){function o(o){return e.draped?g`coverage(vuv.${o}, texelSize)`:g`sampleAA(vuv.${o})`}switch(e.style){case f.ForwardDiagonal:case f.Horizontal:return o("y");case f.BackwardDiagonal:case f.Vertical:return o("x");case f.DiagonalCross:case f.Cross:return g`1.0 - (1.0 - ${o("x")}) * (1.0 - ${o("y")})`;default:return"0.0"}}const T=Object.freeze(Object.defineProperty({__proto__:null,build:x},Symbol.toStringTag,{value:"Module"}));export{T as P,x as b};
