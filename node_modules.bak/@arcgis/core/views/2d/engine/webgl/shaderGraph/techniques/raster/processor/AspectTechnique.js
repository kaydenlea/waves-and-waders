/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{RasterTechniqueType as e}from"../../TechniqueType.js";import{BaseRasterProcessorTechnique as s}from"./BaseRasterProcessorTechnique.js";import{AspectShader as t}from"../../shaders/raster/processor/AspectShader.js";class r extends s{constructor(){super(...arguments),this.name="RasterAspectProcessor",this.type=e.Aspect,this.shaders={aspect:new t}}_process(e,s){const t={cellSize:s.getRasterCellSize()},r=this._getCommonConfig(e,s),o={shader:this.shaders.aspect,uniforms:{config:r,aspectConfig:t},defines:{},optionalAttributes:null,useComputeBuffer:!1},{painter:i,context:a}=e;i.submitDrawMesh(a,o,i.quadMesh)}}export{r as AspectTechnique};
