/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{floatEqualRelative as t}from"../../../core/mathUtils.js";import{DerivedCircle as a,interpolateCircle as r}from"./circleUtils.js";import{correctSweepAndWinding as o,wrapAtan2 as s}from"./mathUtils.js";function h(r,h){const[n,c]=h.a,[i,e]=r,[m,M]=n,[f,l]=c,p=i-f,u=e-l,j=Math.sqrt(p*p+u*u),U=m-f,b=M-l,q=Math.sqrt(U*U+b*b),x=0===j||0===q||!t(j,q),I=j,P=s(e-l,i-f),d=o(s(M-l,m-f),P,h);return new a(f,l,I,P,d,x)}function n(t,a,o){const{cx:s,cy:h,thetaStart:n,thetaEnd:c}=t,[i,e,m,M]=a.a,f=n*(1-o)+c*o;return[{a:[r(t,o),[s,h],Math.abs(f-n)<Math.PI?1:0,M]},{a:[[...i],[s,h],Math.abs(c-f)<Math.PI?1:0,M]}]}export{h as deriveCircleFromEllipticArc4,n as splitEllipticArc4};
