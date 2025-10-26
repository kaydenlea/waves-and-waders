/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{expandPointInPlace as r}from"../aaBoundingRect.js";import{bezierCurveExtent as i}from"./bezierCurveUtils.js";import{circularCurveExtent as t}from"./circleUtils.js";import{deriveCircleFromCircularArc as o}from"./circularArcUtils.js";import{isBezierCurve as s,isCircularArc as c,isEllipticArc as n,isEllipticArc4 as e}from"./curveUtils.js";import{deriveCircleFromEllipticArc4 as f}from"./ellipticArc4Utils.js";import{ellipticArcExtent as l}from"./ellipticArc7Utils.js";function m(m,u,p){if(s(p))return i(m,u,p);if(c(p)){const i=o(u,p);if(i.isInvalid){const[i,t]=p.c;return r(m,u),r(m,i),r(m,t),m}return t(m,i)}if(n(p)){if(e(p)){const i=f(u,p);if(i.isInvalid){const[i,t]=p.a;return r(m,u),r(m,i),m}return t(m,i)}return l(m,u,p)}return m}export{m as curveExtent};
