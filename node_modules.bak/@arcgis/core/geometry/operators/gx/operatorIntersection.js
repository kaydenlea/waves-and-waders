/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{S as r}from"../../../chunks/SimpleGeometryCursor.js";import"../../../chunks/Geometry.js";import{g as n}from"../../../chunks/ProjectionTransformation.js";import"../../../chunks/MultiPathImpl.js";import"../../../chunks/Envelope.js";const e=new n;function t(r,n){return e.accelerateGeometry(r,n,1)}function o(r,n,t){return e.execute(r,n,t,null)}function u(n,t,o,u){const s=e.executeMany(new r(n),new r([t]),o,null,u);return Array.from(s)}function s(){return e.supportsCurves()}export{t as accelerateGeometry,o as execute,u as executeMany,s as supportsCurves};
