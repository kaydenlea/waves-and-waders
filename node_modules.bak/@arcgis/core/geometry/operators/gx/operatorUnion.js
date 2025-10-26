/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{S as n}from"../../../chunks/SimpleGeometryCursor.js";import"../../../chunks/Geometry.js";import"../../../chunks/Point2D.js";import"../../../chunks/MultiPathImpl.js";import"../../../chunks/Envelope2D.js";import{j as t}from"../../../chunks/ProjectionTransformation.js";import"../../../chunks/Envelope.js";const o=new t;function r(n,t,r){return o.execute(n,t,r,null)}function e(t,r){return o.executeMany(new n(t),r,null).next()}function s(){return o.supportsCurves()}export{r as execute,e as executeMany,s as supportsCurves};
