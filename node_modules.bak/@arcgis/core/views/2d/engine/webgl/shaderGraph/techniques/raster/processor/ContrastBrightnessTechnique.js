/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{RasterTechniqueType as s}from"../../TechniqueType.js";import{BaseRasterProcessorTechnique as t}from"./BaseRasterProcessorTechnique.js";import{ContrastBrightnessShader as r}from"../../shaders/raster/processor/ContrastBrightnessShader.js";class e extends t{constructor(){super(...arguments),this.name="RasterContrastBrightnessProcessor",this.type=s.ContrastBrightness,this.shaders={contrastBrightness:new r}}_process(s,t){const r=this._getCommonConfig(s,t),e=s.rasterFunction.parameters,o={shader:this.shaders.contrastBrightness,uniforms:{config:r,contrastBrightnessConfig:e},defines:{},optionalAttributes:null,useComputeBuffer:!1},{painter:n,context:i}=s;n.submitDrawMesh(i,o,n.quadMesh)}}export{e as ContrastBrightnessTechnique};
