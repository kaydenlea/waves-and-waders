/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{ManagedFBOResource as t}from"./ManagedFBOResource.js";class e extends t{constructor(t,e,s){super(t,s),this.attachment=e,this.name=""}dispose(){this.attachment.dispose()}get cachedMemory(){return this.attachment.usedMemory}}export{e as ManagedFBOAttachment};
