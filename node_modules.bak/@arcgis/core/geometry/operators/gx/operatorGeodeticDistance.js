/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{l as t,i as n,p as e}from"../../../chunks/pe.js";let r;function o(){return!!r&&n()}async function i(){if(!o()){const[n,o]=await Promise.all([import("../../../chunks/OperatorGeodeticDistance.js"),import("../../../chunks/ProjectionTransformation.js").then((t=>t.aG)).then((({injectPe:t})=>t)),t()]);r=new n.OperatorGeodeticDistance,o(e)}}function s(t,n,e,o){return r.execute(t,n,e,o,null)}function c(){return r.supportsCurves()}export{s as execute,o as isLoaded,i as load,c as supportsCurves};
