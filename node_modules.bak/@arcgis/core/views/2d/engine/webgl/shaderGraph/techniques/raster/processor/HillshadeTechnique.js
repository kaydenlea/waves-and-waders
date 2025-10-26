/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{RasterTechniqueType as e}from"../../TechniqueType.js";import{BaseRasterProcessorTechnique as s}from"./BaseRasterProcessorTechnique.js";import{computeZFactor as r}from"../../shaders/raster/surface.js";import{HillshadeShader as t}from"../../shaders/raster/processor/HillshadeShader.js";class a extends s{constructor(){super(...arguments),this.name="RasterHillshadeProcessor",this.type=e.Hillshade,this.shaders={hillshade:new t}}_process(e,s){const t=e.rasterFunction.parameters,a={isMultidirectional:t.hillshadeType>0},i=s.getRasterCellSize(),o=r(t,i),h={...t,factor:o,minValue:0,maxValue:8e3},l=this._getCommonConfig(e,s),n={shader:this.shaders.hillshade,uniforms:{config:l,hillshadeConfig:h},defines:a,optionalAttributes:null,useComputeBuffer:!1},{painter:d,context:m}=e;d.submitDrawMesh(m,n,d.quadMesh)}}export{a as HillshadeTechnique};
