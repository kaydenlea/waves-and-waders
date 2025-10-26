/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{RasterTechniqueType as s}from"../../TechniqueType.js";import{BaseRasterProcessorTechnique as e}from"./BaseRasterProcessorTechnique.js";import{NDVIShader as r}from"../../shaders/raster/processor/NDVIShader.js";class t extends e{constructor(){super(...arguments),this.name="RasterNDVIProcessor",this.type=s.NDVI,this.shaders={ndvi:new r}}_process(s,e){const r=s.rasterFunction.parameters,t={scaled:r.scaled},o={bandIndexMat3:r.bandIndexMat3},n=this._getCommonConfig(s,e),a={shader:this.shaders.ndvi,uniforms:{config:n,ndviConfig:o},defines:t,optionalAttributes:null,useComputeBuffer:!1},{painter:i,context:d}=s;i.submitDrawMesh(d,a,i.quadMesh)}}export{t as NDVITechnique};
