/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import e from"../../../../core/Accessor.js";import{ShaderOutput as r}from"../core/shaderLibrary/ShaderOutput.js";import{RenderOccludedFlag as t}from"../lib/Material.js";const s={required:[]},n={required:[r.Depth]};class u extends e{precompile(e){return!!this.acquireTechniques(e)}consumes(){return s}get usedMemory(){return 0}get renderOccludedFlags(){return t.Occlude}get isDecoration(){return!1}get running(){return!1}modify(e,r){}get numGeometries(){return 0}get hasOccludees(){return!1}get hasEmissions(){return!1}forEachGeometry(e){}}class o extends u{}class c extends u{}export{c as AsyncRenderPlugin,n as ConsumesDepth,s as ConsumesNone,o as SyncRenderPlugin};
