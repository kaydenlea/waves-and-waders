/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{RasterTechniqueType as o}from"../../TechniqueType.js";import{BaseRasterProcessorTechnique as e}from"./BaseRasterProcessorTechnique.js";import{ColormapToRGBShader as r}from"../../shaders/raster/processor/ColormapToRGBShader.js";class s extends e{constructor(){super(...arguments),this.name="RasterColormapToRGBProcessor",this.type=o.ColormapToRGB,this.shaders={colormapToRGB:new r}}_process(o,e,r){const s=o.rasterFunction.parameters,t={colormapTexture:{texture:r,unit:1},colormapOffset:s.offset,colormapMaxIndex:s.indexedColormap.length/4-1},a=this._getCommonConfig(o,e),m={shader:this.shaders.colormapToRGB,uniforms:{config:a,colormapConfig:t},defines:{},optionalAttributes:null,useComputeBuffer:!1},{painter:n,context:p}=o;n.submitDrawMesh(p,m,n.quadMesh)}}export{s as ColormapToRGBTechnique};
