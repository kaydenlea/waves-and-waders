/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{RasterTechniqueType as e}from"../../TechniqueType.js";import{BaseRasterProcessorTechnique as t}from"./BaseRasterProcessorTechnique.js";import{ExtractBandShader as s}from"../../shaders/raster/processor/ExtractBandShader.js";class r extends t{constructor(){super(...arguments),this.name="RasterExtractBandProcessor",this.type=e.ExtractBand,this.shaders={extractBand:new s}}_process(e,t){const s={bandIndexMat3:e.rasterFunction.parameters.bandIndexMat3},r=this._getCommonConfig(e,t),a={shader:this.shaders.extractBand,uniforms:{config:r,extractBandConfig:s},defines:{},optionalAttributes:null,useComputeBuffer:!1},{painter:n,context:o}=e;n.submitDrawMesh(o,a,n.quadMesh)}}export{r as ExtractBandTechnique};
