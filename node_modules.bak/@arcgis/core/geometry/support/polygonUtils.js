/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{deg2rad as r}from"../../core/mathUtils.js";import{getMetersPerUnitForSR as t,getMetersPerVerticalUnitForSR as o}from"../../core/unitUtils.js";import{i as s}from"../../chunks/vec32.js";import{Axis as i}from"./Axis.js";import{getNormal as a,create as n,fromManyPoints as m}from"./plane.js";function c(t,o,s){const n=e(f,t,o,s)?a(f):[0,0,1];return Math.abs(n[2])>Math.cos(r(80))?i.Z:Math.abs(n[1])>Math.abs(n[0])?i.Y:i.X}function e(r,i,a,n){const c=(r=>!Array.isArray(r[0]))(i)?(r,t)=>i[3*r+t]:(r,t)=>i[r][t],e=n?t(n)/o(n):1;return m(r,((r,t)=>s(r,c(t,0)*e,c(t,1)*e,c(t,2))),a)}const f=n();export{e as fitPlane,c as leastSignificantAxis};
