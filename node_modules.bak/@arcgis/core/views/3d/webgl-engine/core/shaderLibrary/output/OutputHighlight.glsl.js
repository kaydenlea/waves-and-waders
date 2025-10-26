/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{HighlightReadBitmap as i}from"../HighlightReadBitmap.glsl.js";import{ShaderOutput as e}from"../ShaderOutput.js";import{glsl as t}from"../../shaderModules/glsl.js";import{Integer2BindUniform as h}from"../../shaderModules/Integer2BindUniform.js";import{IntegerBindUniform as g}from"../../shaderModules/IntegerBindUniform.js";import{Texture2DBindUniform as l}from"../../shaderModules/Texture2DBindUniform.js";import{Texture2DUintBindUniform as d}from"../../shaderModules/Texture2DUintBindUniform.js";function o(o,u){const{fragment:r}=o,{output:c,draped:n,hasHighlightMixTexture:s}=u;c===e.Highlight?(r.uniforms.add(new g("highlightLevel",(i=>i.highlightLevel??0)),new h("highlightMixOrigin",(i=>i.highlightMixOrigin))),o.outputs.add("fragHighlight","uvec2",0),o.include(i),s?r.uniforms.add(new d("highlightMixTexture",(i=>i.highlightMixTexture))).code.add(t`uvec2 getAccumulatedHighlight() {
return texelFetch(highlightMixTexture, ivec2(gl_FragCoord.xy) - highlightMixOrigin, 0).rg;
}
void outputHighlight(bool occluded) {
if (highlightLevel == 0) {
uint bits = occluded ? 3u : 1u;
fragHighlight = uvec2(bits, 0);
} else {
int ll = (highlightLevel & 3) << 1;
int li = (highlightLevel >> 2) & 3;
uint bits;
if (occluded) {
bits = 3u << ll;
} else {
bits = 1u << ll;
}
uvec2 combinedHighlight = getAccumulatedHighlight();
combinedHighlight[li] |= bits;
fragHighlight = combinedHighlight;
}
}`):r.code.add(t`void outputHighlight(bool occluded) {
uint bits = occluded ? 3u : 1u;
fragHighlight = uvec2(bits, 0);
}`),n?r.code.add(t`bool isHighlightOccluded() {
return false;
}`):r.uniforms.add(new l("depthTexture",(i=>i.mainDepth))).code.add(t`bool isHighlightOccluded() {
float sceneDepth = texelFetch(depthTexture, ivec2(gl_FragCoord.xy), 0).x;
return gl_FragCoord.z > sceneDepth + 5e-7;
}`),r.code.add(t`void calculateOcclusionAndOutputHighlight() {
outputHighlight(isHighlightOccluded());
}`)):r.code.add(t`void calculateOcclusionAndOutputHighlight() {}`)}export{o as OutputHighlight};
