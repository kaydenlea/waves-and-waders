/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import"../../../chunks/Envelope2D.js";import"../../../chunks/Geometry.js";import"../../../chunks/MultiPathImpl.js";import"../../../chunks/Envelope.js";import"../../../chunks/Point2D.js";import{i as t}from"../../../chunks/ProjectionTransformation.js";import{gradGcsIds as r,getMetersPerUnit as s,isProjectedWKT as o}from"../../../core/unitUtils.js";import{isGeographic as e}from"../../support/spatialReferenceUtils.js";t((t=>{let i,n;"number"==typeof t?i=t:n=t;const p={wkid:i,wkt:n};let m,a;if(n){m=o(n);const t=e(p);if(!m&&!t)throw new Error(`Unsupported WKT type: ${n}`)}else m=!e(p);return a=i&&r.has(i)?Math.PI/200:m?s(p):Math.PI/180,{isPCS:m,metersOrRadiansPerUnit:a,semiMajor:0,wkidOrWkt:t}}));
