/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{RasterTechniqueType as s}from"../../TechniqueType.js";import{BaseRasterProcessorTechnique as e}from"./BaseRasterProcessorTechnique.js";import{MaskShader as r}from"../../shaders/raster/processor/MaskShader.js";class a extends e{constructor(){super(...arguments),this.name="RasterMaskProcessor",this.type=s.Mask,this.shaders={mask:new r}}_process(s,e){const r=s.rasterFunction.parameters,a={isMultiband:r.bandCount>1},t={includedRanges:[...r.includedRanges],noDataValues:[...r.noDataValues]},o=this._getCommonConfig(s,e),n={shader:this.shaders.mask,uniforms:{config:o,maskConfig:t},defines:a,optionalAttributes:null,useComputeBuffer:!1},{painter:i,context:u}=s;i.submitDrawMesh(u,n,i.quadMesh)}}export{a as MaskTechnique};
