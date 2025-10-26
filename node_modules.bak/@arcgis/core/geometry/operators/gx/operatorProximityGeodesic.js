/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{l as t,i as e,p as r}from"../../../chunks/pe.js";let n;function o(){return!!n&&e()}async function i(){if(!o()){const[e,o]=await Promise.all([import("../../../chunks/OperatorProximityGeodesic.js"),import("../../../chunks/ProjectionTransformation.js").then((t=>t.aG)).then((({injectPe:t})=>t)),t()]);n=new e.OperatorProximityGeodesic,o(r)}}function s(t,e,r,o,i,s){return n.getNearestCoordinate(t,e,r,o,i,s)}function a(t,e,r){return n.getNearestVertex(t,e,r)}function c(t,e,r,o,i){return n.getNearestVertices(t,e,r,o,i)}function u(){return n.supportsCurves()}export{s as getNearestCoordinate,a as getNearestVertex,c as getNearestVertices,o as isLoaded,i as load,u as supportsCurves};
