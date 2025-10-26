/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import e from"../../../../core/Evented.js";import{mapCollection as t}from"../../../../core/mapCollectionUtils.js";class s{constructor(s){this.events=new e,this._handles=t((()=>s),(e=>e.on("visible-geometry-changed",(e=>this.events.emit("request-update",e)))))}destroy(){this._handles.destroy()}}export{s as ContentGeometryUpdates};
