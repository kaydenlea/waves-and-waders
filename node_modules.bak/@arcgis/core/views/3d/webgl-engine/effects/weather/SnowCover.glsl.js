/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{glsl as o}from"../../core/shaderModules/glsl.js";function r(r,e){e.snowCover&&(r.code.add(o`float getSnow(vec3 normal, vec3 normalGround) {
return smoothstep(0.5, 0.55, dot(normal, normalGround));
}`),r.code.add(o`vec3 applySnowToMRR(vec3 mrr, float snow) {
return mix(mrr, vec3(0.0, 1.0, 0.04), snow);
}
vec4 snowCoverForEmissions(vec4 emission, float snow) {
return mix(emission, vec4(0.0), snow);
}`))}export{r as SnowCover};
