/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{ShaderOutput as e}from"./ShaderOutput.js";import{VertexPosition as a}from"./attributes/VertexPosition.glsl.js";import{Float2BindUniform as r}from"../shaderModules/Float2BindUniform.js";import{glsl as o}from"../shaderModules/glsl.js";function i(e){e.varyings.add("linearDepth","float",{invariant:!0})}function t(e){e.vertex.uniforms.add(new r("nearFar",(e=>e.camera.nearFar)))}function n(e){e.vertex.code.add(o`float calculateLinearDepth(vec2 nearFar,float z) {
return (-z - nearFar[0]) / (nearFar[1] - nearFar[0]);
}`)}function d(r,d){const{vertex:s}=r;switch(d.output){case e.Color:case e.ColorEmission:if(d.receiveShadows)return i(r),void s.code.add(o`void forwardLinearDepth() { linearDepth = gl_Position.w; }`);break;case e.Shadow:case e.ShadowHighlight:case e.ShadowExcludeHighlight:case e.ViewshedShadow:return r.include(a,d),i(r),t(r),n(r),void s.code.add(o`void forwardLinearDepth() {
linearDepth = calculateLinearDepth(nearFar, vPosition_view.z);
}`)}s.code.add(o`void forwardLinearDepth() {}`)}export{d as ForwardLinearDepth,n as addCalculateLinearDepth,i as addLinearDepth,t as addNearFar};
