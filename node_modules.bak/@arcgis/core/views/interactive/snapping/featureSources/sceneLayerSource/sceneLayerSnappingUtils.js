/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{b as s,j as o,f as r}from"../../../../../chunks/vec32.js";import{c,a as n}from"../../../../../chunks/sphere.js";const t=1e3;function a(t,a,e){const f=c(),m=n(f);return s(m,m,t,.5),s(m,m,a,.5),f[3]=o(m,t),r(m,m,e),f}export{a as boundsFromEdge,t as maxCandidateCount};
