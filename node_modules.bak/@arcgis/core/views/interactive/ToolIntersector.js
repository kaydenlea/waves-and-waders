/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{Intersector as e}from"../3d/webgl-engine/lib/Intersector.js";import{StoreResults as n}from"../3d/webgl-engine/lib/IntersectorInterfaces.js";function o(o){const t=new e(o);return t.options.store=n.MIN,t.options.excludeLabels=!0,t}export{o as newToolIntersector};
