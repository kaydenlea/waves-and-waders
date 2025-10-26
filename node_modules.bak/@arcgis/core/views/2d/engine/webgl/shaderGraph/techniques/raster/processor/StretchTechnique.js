/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{RasterTechniqueType as s}from"../../TechniqueType.js";import{BaseRasterProcessorTechnique as e}from"./BaseRasterProcessorTechnique.js";import{StretchShader as t}from"../../shaders/raster/processor/StretchShader.js";class r extends e{constructor(){super(...arguments),this.name="RasterStretchProcessor",this.type=s.Stretch,this.shaders={stretch:new t}}_process(s,e){const t=s.rasterFunction.parameters,r={isMultiband:t.bandCount>1,isOutputRounded:t.isOutputRounded,useGamma:t.useGamma},o=this._getCommonConfig(s,e),a={shader:this.shaders.stretch,uniforms:{config:o,stretchConfig:t},defines:r,optionalAttributes:null,useComputeBuffer:!1},{painter:i,context:n}=s;i.submitDrawMesh(n,a,i.quadMesh)}}export{r as StretchTechnique};
