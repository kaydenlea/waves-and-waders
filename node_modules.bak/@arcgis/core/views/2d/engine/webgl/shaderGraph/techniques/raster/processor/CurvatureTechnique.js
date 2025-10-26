/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{RasterTechniqueType as r}from"../../TechniqueType.js";import{BaseRasterProcessorTechnique as e}from"./BaseRasterProcessorTechnique.js";import{CurvatureShader as s}from"../../shaders/raster/processor/CurvatureShader.js";class t extends e{constructor(){super(...arguments),this.name="RasterCurvatureProcessor",this.type=r.Curvature,this.shaders={curvature:new s}}_process(r,e){const s=r.rasterFunction.parameters,t={curvatureType:s.curvatureType},o=e.getRasterCellSize(),a={zlFactor:200*s.zFactor/o[0]/o[1]},u=this._getCommonConfig(r,e),i={shader:this.shaders.curvature,uniforms:{config:u,curvatureConfig:a},defines:t,optionalAttributes:null,useComputeBuffer:!1},{painter:c,context:n}=r;c.submitDrawMesh(n,i,c.quadMesh)}}export{t as CurvatureTechnique};
