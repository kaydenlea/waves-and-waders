/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{create as o}from"../../../../../../core/libs/gl-matrix-2/factories/vec3f64.js";import{calculateUVZShadowPass as e,calculateUVZShadowDraw as a,ReadShadowMapOrigin as r}from"./calculateUVZShadow.glsl.js";import{ShadowmapFiltering as s}from"./ShadowmapFiltering.glsl.js";import{glsl as d}from"../../shaderModules/glsl.js";import{Texture2DShadowBindUniform as t}from"../../shaderModules/Texture2DShadowBindUniform.js";import{NoParameters as i}from"../../../../../webgl/NoParameters.js";class l extends r{}class n extends i{constructor(){super(...arguments),this.origin=o()}}function c(o,a){a.receiveShadows&&(o.include(e),u(o))}function h(o,e){e.receiveShadows&&(o.include(a),u(o))}function u(o){o.include(s);const{fragment:e}=o;e.uniforms.add(new t("shadowMap",(o=>o.shadowMap.depthTexture))),e.code.add(d`float readShadowMap(const in vec3 _worldPos, float _linearDepth) {
vec3 uvzShadow = calculateUVZShadow(_worldPos, _linearDepth, textureSize(shadowMap,0));
if (uvzShadow.z < 0.0) {
return 0.0;
}
return readShadowMapUVZ(uvzShadow, shadowMap);
}`)}export{h as ReadShadowMapDraw,l as ReadShadowMapDrawParameters,c as ReadShadowMapPass,n as ReadShadowMapPassParameters};
