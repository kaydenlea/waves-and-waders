/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{Geometry as t}from"./Geometry.js";import{GeometryType as r}from"./IntersectableGeometry.js";class e extends t{constructor(t,e,o,s,n,i){super(t,e,null,r.Mesh,i),this.path=o,this.geometrySR=s,this.stencilWidth=n}}var o;function s(t){return"path"in t}!function(t){t[t.World=0]="World",t[t.Path=1]="Path"}(o||(o={}));export{e as PathGeometry,o as UpVectorAlignment,s as isPathGeometry};
