/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{RasterTechniqueType as o}from"../../TechniqueType.js";import{BaseRasterProcessorTechnique as e}from"./BaseRasterProcessorTechnique.js";import{ConvolutionShader as s}from"../../shaders/raster/processor/ConvolutionShader.js";class r extends e{constructor(){super(...arguments),this.name="RasterConvolutionProcessor",this.type=o.Convolution,this.shaders={convolution:new s}}_process(o,e){const s=o.rasterFunction.parameters,r={rows:s.kernelRows,cols:s.kernelCols},n={kernel:[...s.kernel],clampRange:s.clampRange},t=this._getCommonConfig(o,e),i={shader:this.shaders.convolution,uniforms:{config:t,convolutionConfig:n},defines:r,optionalAttributes:null,useComputeBuffer:!1},{painter:a,context:c}=o;a.submitDrawMesh(c,i,a.quadMesh)}}export{r as ConvolutionTechnique};
