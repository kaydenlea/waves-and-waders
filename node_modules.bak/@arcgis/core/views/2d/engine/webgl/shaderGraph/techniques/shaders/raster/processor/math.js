/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{Vec4 as n,floor as t,sign as e,abs as r,step as u,Vec3 as l,Float as i,mix as o,dot as a}from"../../../../graph/glsl.js";function c(n){const t=e(n),u=n.add(r(t).subtract(1));return t.multiply(t).divide(u)}function d(e){return new n(t(e.rgb.add(.5)),e.a)}function w(n,t){return u(t.x,n).multiply(u(n,t.y))}function p(n,t,r){const c=new l(n);let d=new l(0,0,0),w=new i(0);for(let e=0;e<r/3;e++){const n=9*e,r=new l(t[n],t[n+3],t[n+6]),i=new l(t[n+1],t[n+4],t[n+7]),a=u(r,c).multiply(u(c,i)),p=new l(t[n+2],t[n+5],t[n+8]);w=o(w,p.x,a.x),w=o(w,p.y,a.y),w=o(w,p.z,a.z),d=d.add(a)}return{mapValue:w,includeMask:e(a(d,new l(1,1,1)))}}export{p as computeMapValue,w as getRangeClipFactor,c as invertValue,d as roundOutput};
