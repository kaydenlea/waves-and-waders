/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{_ as o}from"../../../../../../../../chunks/tslib.es6.js";import{uniform as r,UniformGroup as t}from"../../../GraphShaderModule.js";import{clamp as e,Float as p,Vec2 as a,texture2D as l,Vec4 as m,step as s,Sampler2D as d}from"../../../graph/glsl.js";class i extends t{}function n(o,r,t,d=!0){const{colormapTexture:i,colormapOffset:n,colormapMaxIndex:c}=t,u=o.r.multiply(r).subtract(n),x=e(u,new p(0),c),f=new a(x.add(.5).divide(c.add(1)),0),y=l(i,f),h=new m(y.rgb,y.a.multiply(o.a));if(d)return h;const v=s(new p(0),u).multiply(s(u,t.colormapMaxIndex));return h.multiply(v)}o([r(d)],i.prototype,"colormapTexture",void 0),o([r(p)],i.prototype,"colormapOffset",void 0),o([r(p)],i.prototype,"colormapMaxIndex",void 0);export{i as ColormapConfig,n as lookupColor};
