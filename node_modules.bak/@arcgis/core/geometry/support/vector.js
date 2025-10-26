/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{acosClamped as t}from"../../core/mathUtils.js";import{n as r,e as n,h as o,l as s,g as c}from"../../chunks/vec32.js";import{create as e}from"../../core/libs/gl-matrix-2/factories/vec3f64.js";function i(t,r,o){const s=n(t,r)/n(t,t);return c(o,t,s)}function a(t,r){return n(t,r)/s(t)}function f(r,o){const c=n(r,o)/(s(r)*s(o));return-t(c)}function u(s,c,e){r(m,s),r(h,c);const i=n(m,h),a=t(i),f=o(m,m,h);return n(f,e)<0?2*Math.PI-a:a}const m=e(),h=e();export{f as angle,u as angleAroundAxis,i as projectPoint,a as projectPointSignedLength};
