/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{bezierCurveLength as r}from"./bezierCurveUtils.js";import{circularCurveLength as i}from"./circleUtils.js";import{deriveCircleFromCircularArc as t}from"./circularArcUtils.js";import{isBezierCurve as s,isCircularArc as o,isEllipticArc as l,isEllipticArc4 as m}from"./curveUtils.js";import{deriveCircleFromEllipticArc4 as c}from"./ellipticArc4Utils.js";import{ellipticArcLength as e}from"./ellipticArc7Utils.js";import{distance2 as f}from"./mathUtils.js";function n(n,p,u=1){if(s(p))return r(n,p,u);if(o(p)){const r=t(n,p);return r.isInvalid?Math.sqrt(f(n,p.c[0])):i(r)}if(l(p)){if(m(p)){const r=c(n,p);return r.isInvalid?Math.sqrt(f(n,p.a[0])):i(r)}return e(n,p,u)}return 0}export{n as curveLength};
