/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import r from"../../../core/Error.js";import{closestPointsOnBezierCurve as i}from"./bezierCurveUtils.js";import{closestPointOnCircle as t}from"./circleUtils.js";import{deriveCircleFromCircularArc as o}from"./circularArcUtils.js";import{isBezierCurve as e,isCircularArc as c,isEllipticArc as n,isEllipticArc4 as s,isEllipticArc7 as l}from"./curveUtils.js";import{deriveCircleFromEllipticArc4 as f}from"./ellipticArc4Utils.js";import{deriveEllipse as m,closestPointOnEllipse as u}from"./ellipticArc7Utils.js";function p(p,j,U){if(e(j)){const t=i(p,j,U)[0];if(null==t)throw new r("closestPointOnCurve:unexpected-error","Failed to find close point on bezier curve");return t}if(c(j)){const r=o(p,j);return t(r,U)}if(n(j)){if(s(j)){const r=f(p,j);return t(r,U)}if(l(j)){const r=m(p,j);return u(r,U)}}return null}export{p as closestPointOnCurve};
