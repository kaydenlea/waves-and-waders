/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{RasterTechniqueType as s}from"../../TechniqueType.js";import{BaseRasterProcessorTechnique as e}from"./BaseRasterProcessorTechnique.js";import{GrayscaleShader as r}from"../../shaders/raster/processor/GrayscaleShader.js";class t extends e{constructor(){super(...arguments),this.name="RasterGrayscaleProcessor",this.type=s.Grayscale,this.shaders={grayscale:new r}}_process(s,e){const r={weights:s.rasterFunction.parameters.weights},t=this._getCommonConfig(s,e),a={shader:this.shaders.grayscale,uniforms:{config:t,grayscaleConfig:r},defines:{},optionalAttributes:null,useComputeBuffer:!1},{painter:o,context:i}=s;o.submitDrawMesh(i,a,o.quadMesh)}}export{t as GrayscaleTechnique};
