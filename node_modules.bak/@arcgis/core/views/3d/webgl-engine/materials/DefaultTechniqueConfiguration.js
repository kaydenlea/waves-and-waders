/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{_ as t}from"../../../../chunks/tslib.es6.js";import{ShaderOutput as o}from"../core/shaderLibrary/ShaderOutput.js";import{InstancedDoubleConfiguration as i}from"../core/shaderLibrary/attributes/InstancedDoubleConfiguration.js";import{parameter as r}from"../core/shaderTechnique/ShaderTechniqueConfiguration.js";import{OITPass as s}from"../lib/OITPass.js";import{BindType as e}from"../../../webgl/BindType.js";class a extends i{constructor(){super(...arguments),this.output=o.Color,this.oitPass=s.NONE,this.hasSlicePlane=!1,this.hasHighlightMixTexture=!1,this.bindType=e.Pass,this.writeDepth=!0}}t([r({count:o.COUNT})],a.prototype,"output",void 0),t([r({count:s.COUNT})],a.prototype,"oitPass",void 0),t([r()],a.prototype,"hasSlicePlane",void 0),t([r()],a.prototype,"hasHighlightMixTexture",void 0);export{a as DefaultTechniqueConfiguration};
