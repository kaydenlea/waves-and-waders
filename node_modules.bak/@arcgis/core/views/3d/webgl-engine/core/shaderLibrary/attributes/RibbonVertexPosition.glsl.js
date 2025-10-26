/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{VisualVariables as i}from"../shading/VisualVariables.glsl.js";import{Float3PassUniform as e}from"../../shaderModules/Float3PassUniform.js";import{FloatPassUniform as a}from"../../shaderModules/FloatPassUniform.js";import{FloatsPassUniform as t}from"../../shaderModules/FloatsPassUniform.js";import{glsl as v}from"../../shaderModules/glsl.js";import{VertexAttribute as r}from"../../../lib/VertexAttribute.js";const o=8;function c(c,l){const{vertex:s,attributes:n}=c;s.uniforms.add(new a("intrinsicWidth",(i=>i.width))),l.vvSize?(n.add(r.SIZEFEATUREATTRIBUTE,"float"),s.uniforms.add(new e("vvSizeMinSize",(i=>i.vvSize.minSize)),new e("vvSizeMaxSize",(i=>i.vvSize.maxSize)),new e("vvSizeOffset",(i=>i.vvSize.offset)),new e("vvSizeFactor",(i=>i.vvSize.factor)),new e("vvSizeFallback",(i=>i.vvSize.fallback))),s.code.add(v`float getSize() {
if (isnan(sizeFeatureAttribute)) {
return vvSizeFallback.x;
}
return intrinsicWidth * clamp(vvSizeOffset + sizeFeatureAttribute * vvSizeFactor, vvSizeMinSize, vvSizeMaxSize).x;
}`)):(n.add(r.SIZE,"float"),s.code.add(v`float getSize(){
return intrinsicWidth * size;
}`)),l.vvOpacity?(n.add(r.OPACITYFEATUREATTRIBUTE,"float"),s.constants.add("vvOpacityNumber","int",8),s.uniforms.add(new t("vvOpacityValues",(i=>i.vvOpacity.values),o),new t("vvOpacityOpacities",(i=>i.vvOpacity.opacityValues),o),new a("vvOpacityFallback",(i=>i.vvOpacity.fallback))),s.code.add(v`float interpolateOpacity(float value){
if (isnan(value)) {
return vvOpacityFallback;
}
if (value <= vvOpacityValues[0]) {
return vvOpacityOpacities[0];
}
for (int i = 1; i < vvOpacityNumber; ++i) {
if (vvOpacityValues[i] >= value) {
float f = (value - vvOpacityValues[i-1]) / (vvOpacityValues[i] - vvOpacityValues[i-1]);
return mix(vvOpacityOpacities[i-1], vvOpacityOpacities[i], f);
}
}
return vvOpacityOpacities[vvOpacityNumber - 1];
}
vec4 applyOpacity( vec4 color ){
return vec4(color.xyz, interpolateOpacity(opacityFeatureAttribute));
}`)):s.code.add(v`vec4 applyOpacity( vec4 color ){
return color;
}`),l.vvColor?(c.include(i,l),n.add(r.COLORFEATUREATTRIBUTE,"float"),s.code.add(v`vec4 getColor(){
return applyOpacity(interpolateVVColor(colorFeatureAttribute));
}`)):(n.add(r.COLOR,"vec4"),s.code.add(v`vec4 getColor(){
return applyOpacity(color);
}`))}export{c as RibbonVertexPosition};
