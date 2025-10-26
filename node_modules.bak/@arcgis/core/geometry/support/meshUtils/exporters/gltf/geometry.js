/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{i as o,d as n,h as t,n as s}from"../../../../../chunks/vec32.js";import{create as r}from"../../../../../core/libs/gl-matrix-2/factories/vec3f64.js";function c(o,n){if(o.components)for(const t of o.components)t.faces&&"smooth"===t.shading&&e(t.faces,n)}function e(r,c){null==c.normal&&(c.normal=new Float32Array(c.position.length));const{position:e,normal:m}=c,h=r.length/3;for(let s=0;s<h;++s){const c=3*r[3*s],l=3*r[3*s+1],h=3*r[3*s+2],p=o(a,e[c],e[c+1],e[c+2]),g=o(i,e[l],e[l+1],e[l+2]),u=o(f,e[h],e[h+1],e[h+2]),d=n(g,g,p),j=n(u,u,p),v=t(d,d,j);m[c]+=v[0],m[c+1]+=v[1],m[c+2]+=v[2],m[l]+=v[0],m[l+1]+=v[1],m[l+2]+=v[2],m[h]+=v[0],m[h+1]+=v[1],m[h+2]+=v[2]}for(let n=0;n<m.length;n+=3)o(l,m[n],m[n+1],m[n+2]),s(l,l),m[n]=l[0],m[n+1]=l[1],m[n+2]=l[2]}const a=r(),i=r(),f=r(),l=r();export{c as smoothNormals};
