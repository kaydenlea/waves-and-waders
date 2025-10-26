/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{FeatureTechnique as e}from"../FeatureTechnique.js";import{isHittest as t,getSelectionDefines as r,getFeatureUniforms as s,resolveDynamicUniforms as i,getFeaturePipelineState as o}from"../featureTechniqueUtils.js";import{TechniqueType as n}from"../TechniqueType.js";import{FillShader as a}from"../shaders/FillShader.js";class u extends e{constructor(){super(...arguments),this.type=n.Fill,this.shaders={geometry:new a}}render(e,n){const{painter:a}=e,u=n.instance.getInput();a.setShader({shader:this.shaders.geometry,uniforms:{...i(e,n.target,u.uniforms),...s(e,n.target)},defines:r(e),optionalAttributes:u.optionalAttributes,useComputeBuffer:t(e)}),a.setPipelineState(o(e)),a.submitDraw(e,n)}}export{u as FillTechnique};
