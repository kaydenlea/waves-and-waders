/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{RasterTechniqueType as s}from"../../TechniqueType.js";import{BaseRasterProcessorTechnique as e}from"./BaseRasterProcessorTechnique.js";import{CompositeBandShader as t}from"../../shaders/raster/processor/CompositeBandShader.js";class o extends e{constructor(){super(...arguments),this.name="RasterCompositeBandProcessor",this.type=s.CompositeBand,this.shaders={compositeBand:new t}}_process(s,e){const{rasters:t}=s.rasterFunction.parameters,o={constantCount:this._getConstantCount(t),imageCount:t?.length??1},r=this._getMultipleInputConfig(e,t),n=this._getCommonConfig(s,e),i={shader:this.shaders.compositeBand,uniforms:{config:n,...r},defines:o,optionalAttributes:null,useComputeBuffer:!1},{painter:a,context:p}=s;a.submitDrawMesh(p,i,a.quadMesh)}}export{o as CompositeBandTechnique};
