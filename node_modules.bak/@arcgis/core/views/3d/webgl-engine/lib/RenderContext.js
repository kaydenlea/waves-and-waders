/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{Milliseconds as r}from"../../../../core/time.js";import e from"../../webgl/RenderCamera.js";import{ShaderOutput as t}from"../core/shaderLibrary/ShaderOutput.js";import{BindParameters as i}from"./BindParameters.js";import{RenderOccludedFlag as s}from"./Material.js";class a{constructor(s,a,o){this.rctx=s,this.techniques=o,this.lastFrameCamera=new e,this.output=t.Color,this.renderOccludedMask=n,this.time=r(0),this.bind=new i(a),this.bind.alignPixelEnabled=!0}}const n=s.Occlude|s.OccludeAndTransparent|s.OccludeAndTransparentStencil;export{a as RenderContext,n as defaultRenderOccludedMask};
