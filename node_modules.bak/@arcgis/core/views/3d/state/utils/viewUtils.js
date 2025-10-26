/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{acosClamped as o}from"../../../../core/mathUtils.js";import{d as r,l as t,e as s}from"../../../../chunks/vec32.js";import{create as i}from"../../../../core/libs/gl-matrix-2/factories/vec3f64.js";function c(i,c,n){i.worldUpAtPosition(c,e),r(m,n,c);const a=t(m);return 0===a?0:o(s(m,e)/a)}const e=i(),m=i();export{c as viewAngle};
