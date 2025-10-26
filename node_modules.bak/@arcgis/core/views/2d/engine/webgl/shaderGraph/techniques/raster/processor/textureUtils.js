/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{SizedPixelFormat as e,TextureSamplingMode as r,PixelType as t,TextureWrapMode as n}from"../../../../../../../webgl/enums.js";import{FramebufferObject as o}from"../../../../../../../webgl/FramebufferObject.js";import{Texture as m}from"../../../../../../../webgl/Texture.js";import{TextureDescriptor as i}from"../../../../../../../webgl/TextureDescriptor.js";function s(o,m){const s=new i;return s.width=o,s.height=m,s.internalFormat=e.RGBA32F,s.samplingMode=r.NEAREST,s.dataType=t.FLOAT,s.isImmutable=!0,s.wrapMode=n.CLAMP_TO_EDGE,s}function u(e,r,t){const n=s(r,t);return new m(e,n)}function a(e,r,t){const n=s(r,t);return new o(e,n)}export{a as createNewFBO,u as createProcessedTexture};
