/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{S as n}from"../../../chunks/SimpleGeometryCursor.js";import"../../../chunks/Geometry.js";import"../../../chunks/MultiPathImpl.js";import{O as r}from"../../../chunks/ProjectionTransformation.js";import"../../../chunks/Envelope.js";const t=new r;function e(n,r,e){return t.execute(n,r,e,null)}function o(r,e,o){const u=t.executeMany(new n(r),e,o,null);return Array.from(u)}function u(n,r,e){return t.isSimpleAsFeature(n,r,e,null,null)}function s(){return t.supportsCurves()}export{e as execute,o as executeMany,u as isSimpleAsFeature,s as supportsCurves};
