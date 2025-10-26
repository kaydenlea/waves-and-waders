/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{BindType as r}from"../../../../webgl/BindType.js";import{Uniform as e}from"../../../../webgl/Uniform.js";class o extends e{constructor(e,o){super(e,"usampler2D",r.Bind,((r,s)=>r.bindTexture(e,o(s))))}}export{o as Texture2DUintBindUniform};
