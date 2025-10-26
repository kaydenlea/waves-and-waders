/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{ManagedDepthAttachment as t}from"./ManagedDepthAttachment.js";import{FBOAttachmentType as e}from"../../webgl/FBOAttachmentType.js";class r extends t{constructor(t,e,r){super(t,e,r),this.attachment=e}}function n(t){return t?.attachment.type===e.Texture}export{r as ManagedDepthTexture,n as isManagedDepthTexture};
