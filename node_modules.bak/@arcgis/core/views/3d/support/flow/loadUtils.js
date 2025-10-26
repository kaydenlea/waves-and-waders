/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{intersects as n,create as l}from"../../../../geometry/support/aaBoundingRect.js";function e(e,r,o){let[i,c,f,s]=[null,null,null,null];for(r.reset(e);!r.done;){const l=r.next();if(null==l)continue;if(!l.visible){r.skipSubtree();continue}const e=l.extent;l.leaf&&l.rendered&&n(e,o)&&(i=u(e[0],i),c=u(e[1],c),f=t(e[2],f),s=t(e[3],s))}return null==i||null==c||null==f||null==s?null:l([i,c,f,s])}function t(n,l){return null==l?n:Math.max(n,l)}function u(n,l){return null==l?n:Math.min(n,l)}export{e as boundingRectOfTileTree};
