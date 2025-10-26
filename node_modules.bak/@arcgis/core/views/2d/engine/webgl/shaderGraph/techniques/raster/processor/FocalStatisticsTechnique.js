/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{RasterTechniqueType as s}from"../../TechniqueType.js";import{BaseRasterProcessorTechnique as t}from"./BaseRasterProcessorTechnique.js";import{FocalStatisticsShader as e}from"../../shaders/raster/processor/FocalStatisticsShader.js";class i extends t{constructor(){super(...arguments),this.name="RasterFocalStatisticsProcessor",this.type=s.Statistics,this.shaders={focalStatistics:new e}}_process(s,t){const e=s.rasterFunction.parameters,i={rows:e.kernelRows,cols:e.kernelCols,statisticsType:e.statisticsType,fill:e.fillNoDataOnly},o={clampRange:e.clampRange},r=this._getCommonConfig(s,t),a={shader:this.shaders.focalStatistics,uniforms:{config:r,focalStatisticsConfig:o},defines:i,optionalAttributes:null,useComputeBuffer:!1},{painter:c,context:n}=s;c.submitDrawMesh(n,a,c.quadMesh)}}export{i as FocalStatisticsTechnique};
