/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{create as e}from"../../../../../../core/libs/gl-matrix-2/factories/vec4f64.js";import{hasArea as o,width as r,height as t}from"../../../../../../geometry/support/aaBoundingRect.js";import{OverlayIndex as a}from"../../../../terrain/interfaces.js";import{OverlayContent as l}from"../../../../terrain/OverlayContent.js";import{RenderPassIdentifier as i}from"../../renderPasses/RenderPassIdentifier.js";import{ShaderOutput as n,isColorOrColorEmission as d}from"../ShaderOutput.js";import{addMainLightDirection as s,addMainLightIntensity as v}from"../shading/MainLighting.glsl.js";import{PBRMode as c}from"../shading/PhysicallyBasedRenderingParameters.glsl.js";import{Water as u}from"../shading/Water.glsl.js";import{Float4DrawUniform as x}from"../../shaderModules/Float4DrawUniform.js";import{FloatPassUniform as y}from"../../shaderModules/FloatPassUniform.js";import{glsl as m}from"../../shaderModules/glsl.js";import{Texture2DPassUniform as p}from"../../shaderModules/Texture2DPassUniform.js";import{Texture2DUintPassUniform as f}from"../../shaderModules/Texture2DUintPassUniform.js";import{Uniform as g}from"../../../../../webgl/Uniform.js";var h;function C(e,o){const{vertex:r,fragment:t}=e;r.uniforms.add(new x("overlayTexOffset",((e,o)=>V(e,o))),new x("overlayTexScale",((e,o)=>I(e,o)))),t.constants.add("overlayOpacity","float",1),t.uniforms.add(new p("ovColorTex",((e,o)=>b(e,o)))),T(e,o)}function O(e,o){const{vertex:r,fragment:t}=e,{output:a}=o;r.uniforms.add(new M("overlayTexOffset"),new M("overlayTexScale")),t.uniforms.add(new y("overlayOpacity",(e=>e.overlayOpacity))),a!==n.Highlight&&t.uniforms.add(new p("ovColorTex",((e,o)=>o.overlay?.getTexture(e.overlayContent)))),T(e,o)}function T(e,o){const r=o.pbrMode===c.Water||o.pbrMode===c.WaterOnIntegratedMesh||o.pbrMode===c.TerrainWithWater;r&&e.include(u,o);const{vertex:t,fragment:a,varyings:i}=e;i.add("vtcOverlay","vec4");const{output:d}=o,x=d===n.Highlight;t.code.add(m`void setOverlayVTC(in vec2 uv) {
vtcOverlay = vec4(uv, uv) * overlayTexScale + overlayTexOffset;
}`),a.code.add(m`bool isValid(vec2 uv, vec2 dxdy) {
return (uv.x >= 0.0 + dxdy.x) && (uv.x <= 1.0 - dxdy.x) && (uv.y >= 0.0 + dxdy.y) && (uv.y <= 1.0 - dxdy.y);
}
vec4 getOverlayColor(sampler2D ov0Tex, vec4 texCoords) {
vec4 color0 = texture(ov0Tex, vec2(texCoords.x * 0.5, texCoords.y));
vec4 color1 = texture(ov0Tex, vec2(texCoords.z * 0.5 + 0.5, texCoords.w));
bool isValid0 = isValid(texCoords.xy, fwidth(texCoords.xy));
bool isValid1 = isValid(texCoords.zw, vec2(0.0, 0.0));
return mix(color1 * float(isValid1), color0, float(isValid0));
}`),x?a.uniforms.add(new f("overlayHighlightTexture",((e,o)=>o.overlay?.getTexture(l.Highlight)))).code.add(m`uvec2 getAllOverlayHighlightValuesEncoded() {
vec4 texCoords = vtcOverlay;
vec2 uvInner = texCoords.xy;
vec2 uvOuter = texCoords.zw;
bool isValidInner = isValid(uvInner, fwidth(uvInner));
bool isValidOuter = isValid(uvOuter, vec2(0.0, 0.0));
vec2 texelCoordInner = uvInner * vec2(0.5, 1.0);
vec2 texelCoordOuter = uvOuter * vec2(0.5, 1.0) + vec2(0.5,0.0);
vec2 texDim =  vec2(textureSize(overlayHighlightTexture, 0));
uvec2 texelValueInner = texelFetch(overlayHighlightTexture, ivec2(texelCoordInner * texDim), 0).rg;
uvec2 texelValueOuter = texelFetch(overlayHighlightTexture, ivec2(texelCoordOuter * texDim), 0).rg;
return
isValidInner ? texelValueInner :
isValidOuter ? texelValueOuter :
uvec2(0);
}`):(a.code.add(m`vec4 getCombinedOverlayColor() {
return overlayOpacity * getOverlayColor(ovColorTex, vtcOverlay);
}`),a.code.add(m`vec4 getOverlayColorTexel() {
vec4 texCoords = vtcOverlay;
vec2 texDim =  vec2(textureSize(ovColorTex, 0));
vec4 color0 = texelFetch(ovColorTex, ivec2(vec2(texCoords.x * 0.5, texCoords.y) * texDim), 0);
vec4 color1 = texelFetch(ovColorTex, ivec2(vec2(texCoords.z * 0.5 + 0.5, texCoords.w) * texDim), 0);
bool isValid0 = isValid(texCoords.xy, fwidth(texCoords.xy));
bool isValid1 = isValid(texCoords.zw, vec2(0.0, 0.0));
return mix(color1 * float(isValid1), color0, float(isValid0));
}`)),r&&(s(a),v(a),a.code.add(m`vec4 getOverlayWaterColor(vec4 maskInput, vec4 colorInput, vec3 vposEyeDir,
float shadow, vec3 localUp, mat3 tbn, vec3 position, vec3 positionWorld) {
vec3 n = normalize(tbn *  (2.0 * maskInput.rgb - vec3(1.0)));
vec3 v = vposEyeDir;
vec3 final = getSeaColor(n, v, mainLightDirection, colorInput.rgb, mainLightIntensity, localUp, 1.0 - shadow, maskInput.w, position, positionWorld);
return vec4(final, colorInput.w);
}`))}function b(e,o){return e.identifier===i.Material&&d(e.output)?e.occludedGround?o.overlay?.getTexture(l.Occluded):o.overlay?.getTexture(l.ColorNoRasterImage):e.identifier===i.Material&&e.output===n.ObjectAndLayerIdColor?o.overlay?.getTexture(l.ObjectAndLayerIdColor):e.identifier===i.Highlight?o.overlay?.getTexture(l.Highlight):null}function V(e,l){const i=l.overlay?.overlays[a.INNER]?.extent;o(i)&&(w[0]=e.toMapSpace[0]/r(i)-i[0]/r(i),w[1]=e.toMapSpace[1]/t(i)-i[1]/t(i));const n=l.overlay?.overlays[a.OUTER]?.extent;return o(n)&&(w[2]=e.toMapSpace[0]/r(n)-n[0]/r(n),w[3]=e.toMapSpace[1]/t(n)-n[1]/t(n)),w}function I(e,l){const i=l.overlay?.overlays[a.INNER]?.extent;o(i)&&(w[0]=e.toMapSpace[2]/r(i),w[1]=e.toMapSpace[3]/t(i));const n=l.overlay?.overlays[a.OUTER]?.extent;return o(n)&&(w[2]=e.toMapSpace[2]/r(n),w[3]=e.toMapSpace[3]/t(n)),w}!function(e){e[e.Disabled=0]="Disabled",e[e.Enabled=1]="Enabled",e[e.EnabledWithWater=2]="EnabledWithWater",e[e.COUNT=3]="COUNT"}(h||(h={}));const w=e();class M extends g{constructor(e){super(e,"vec4")}}export{C as OverlayIM,h as OverlayMode,O as OverlayTerrain,b as getIMColorTexture};
