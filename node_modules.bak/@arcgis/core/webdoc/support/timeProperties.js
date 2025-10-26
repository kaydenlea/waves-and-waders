/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import e from"../../core/Error.js";import{Integer as r,Null as t}from"../../core/accessorSupport/ensureType.js";import{T as s}from"../../chunks/TimeExtent.js";const o={type:s,json:{read:{source:"timeExtent",reader:e=>e?Array.isArray(e)?s.fromArray(e):s.fromJSON(e):null},write:{writer:(r,t,s,o)=>{r&&(r.isEmpty?o?.messages&&o.messages.push(new e("invalid-timeExtent","TimeExtent cannot be empty")):t[s]=r.toArray())},target:{timeExtent:{type:[[r,t]]}}}}};export{o as timeExtent};
