/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{S as n}from"../../../chunks/SimpleGeometryCursor.js";import"../../../chunks/Geometry.js";import{f as r}from"../../../chunks/ProjectionTransformation.js";import"../../../chunks/Point2D.js";import"../../../chunks/MultiPathImpl.js";import"../../../chunks/Envelope2D.js";import"../../../chunks/Envelope.js";const o=new r;function t(n,r,t){return o.execute(n,r,t,null)}function e(r,t,e){const s=o.executeMany(new n(r),new n([t]),e,null);return Array.from(s)}function s(){return o.supportsCurves()}export{t as execute,e as executeMany,s as supportsCurves};
