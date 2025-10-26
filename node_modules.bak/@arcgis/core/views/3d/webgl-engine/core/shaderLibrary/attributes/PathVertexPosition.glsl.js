/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{fromValues as e}from"../../../../../../core/libs/gl-matrix-2/factories/vec2f64.js";import{Float2PassUniform as o}from"../../shaderModules/Float2PassUniform.js";import{Float3PassUniform as a}from"../../shaderModules/Float3PassUniform.js";import{Float4PassUniform as i}from"../../shaderModules/Float4PassUniform.js";import{Float4sPassUniform as r}from"../../shaderModules/Float4sPassUniform.js";import{FloatPassUniform as t}from"../../shaderModules/FloatPassUniform.js";import{FloatsPassUniform as v}from"../../shaderModules/FloatsPassUniform.js";import{glsl as l}from"../../shaderModules/glsl.js";import{VertexAttribute as s}from"../../../lib/VertexAttribute.js";import{VisualVariablePassParameters as c,vvColorNumber as p}from"../../../materials/VisualVariablePassParameters.js";const n=8;function f(e,c){const{attributes:f,vertex:d}=e;f.add(s.POSITION,"vec3"),f.add(s.PROFILEVERTEXANDNORMAL,"vec4"),f.add(s.PROFILEAUXDATA,"vec3"),f.add(s.PROFILERIGHT,"vec2"),f.add(s.PROFILEUP,"vec2"),d.code.add(l`bool isCapVertex() {
return profileAuxData.z == 1.0;
}`),d.uniforms.add(new o("size",(e=>e.size)));const{vvSize:u,vvColor:m,vvOpacity:x}=c;u?(f.add(s.SIZEFEATUREATTRIBUTE,"float"),d.uniforms.add(new a("vvSizeMinSize",(e=>e.vvSize.minSize)),new a("vvSizeMaxSize",(e=>e.vvSize.maxSize)),new a("vvSizeOffset",(e=>e.vvSize.offset)),new a("vvSizeFactor",(e=>e.vvSize.factor)),new a("vvSizeFallback",(e=>e.vvSize.fallback))),d.code.add(l`vec2 getSize() {
float value = sizeFeatureAttribute;
if (isnan(value)) {
return vvSizeFallback.xz;
}
return size * clamp(vvSizeOffset + value * vvSizeFactor, vvSizeMinSize, vvSizeMaxSize).xz;
}`)):d.code.add(l`vec2 getSize(){
return size;
}`),x?(f.add(s.OPACITYFEATUREATTRIBUTE,"float"),d.constants.add("vvOpacityNumber","int",n),d.uniforms.add(new v("vvOpacityValues",(e=>e.vvOpacity.values),n),new v("vvOpacityOpacities",(e=>e.vvOpacity.opacityValues),n),new t("vvOpacityFallback",(e=>e.vvOpacity.fallback))),d.code.add(l`vec4 applyOpacity(vec4 color) {
float value = opacityFeatureAttribute;
if (isnan(value)) {
return vec4(color.rgb, vvOpacityFallback);
}
if (value <= vvOpacityValues[0]) {
return vec4( color.xyz, vvOpacityOpacities[0]);
}
for (int i = 1; i < vvOpacityNumber; ++i) {
if (vvOpacityValues[i] >= value) {
float f = (value - vvOpacityValues[i-1]) / (vvOpacityValues[i] - vvOpacityValues[i-1]);
return vec4( color.xyz, mix(vvOpacityOpacities[i-1], vvOpacityOpacities[i], f));
}
}
return vec4( color.xyz, vvOpacityOpacities[vvOpacityNumber - 1]);
}`)):d.code.add(l`vec4 applyOpacity(vec4 color){
return color;
}`),m?(f.add(s.COLORFEATUREATTRIBUTE,"float"),d.constants.add("vvColorNumber","int",p),d.uniforms.add(new v("vvColorValues",(e=>e.vvColor.values),p),new r("vvColorColors",(e=>e.vvColor.colors),p),new i("vvColorFallback",(e=>e.vvColor.fallback))),d.code.add(l`vec4 getColor() {
float value = colorFeatureAttribute;
if (isnan(value)) {
return applyOpacity(vvColorFallback);
}
if (value <= vvColorValues[0]) {
return applyOpacity(vvColorColors[0]);
}
for (int i = 1; i < vvColorNumber; ++i) {
if (vvColorValues[i] >= value) {
float f = (value - vvColorValues[i-1]) / (vvColorValues[i] - vvColorValues[i-1]);
return applyOpacity(mix(vvColorColors[i-1], vvColorColors[i], f));
}
}
return applyOpacity(vvColorColors[vvColorNumber - 1]);
}`)):d.code.add(l`vec4 getColor(){
return applyOpacity(vec4(1, 1, 1, 1));
}`),d.code.add(l`vec3 decompressAxis(vec2 axis) {
float z = 1.0 - abs(axis.x) - abs(axis.y);
return normalize(vec3(axis + sign(axis) * min(z, 0.0), z));
}
vec3 calculateVPos() {
vec2 size = getSize();
vec3 origin = position;
vec3 right = decompressAxis(profileRight);
vec3 up = decompressAxis(profileUp);
vec2 profileVertex = profileVertexAndNormal.xy * size;`),d.code.add(l`if(isCapVertex()) {
float positionOffsetAlongProfilePlaneNormal = profileAuxData.x * size[0];
vec3 forward = cross(up, right);
vec3 offset = right * profileVertex.x + up * profileVertex.y + forward * positionOffsetAlongProfilePlaneNormal;
return origin + offset;
}
vec2 rotationRight = vec2(profileAuxData.x, profileAuxData.y);
float maxDistance = length(rotationRight);`),d.code.add(l`rotationRight = maxDistance > 0.0 ? normalize(rotationRight) : vec2(0, 0);
float rx = dot(profileVertex, rotationRight);
if (abs(rx) > maxDistance) {
vec2 rotationUp = vec2(-rotationRight.y, rotationRight.x);
float ry = dot(profileVertex, rotationUp);
profileVertex = rotationRight * maxDistance * sign(rx) + rotationUp * ry;
}
vec3 offset = right * profileVertex.x + up * profileVertex.y;
return origin + offset;
}`),d.code.add(l`vec3 localNormal() {
vec3 right = decompressAxis(profileRight);
vec3 up = decompressAxis(profileUp);
vec3 normal = right * profileVertexAndNormal.z + up * profileVertexAndNormal.w;
if(isCapVertex()) {
vec3 forward = cross(up, right);
normal += forward * profileAuxData.y;
}
return normal;
}`)}class d extends c{constructor(){super(...arguments),this.size=e(1,1)}}export{f as PathVertexPosition,d as PathVertexPositionPassParameters};
