/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{isSimpleAsFeature as e,execute as t,executeMany as r}from"../gx/operatorSimplify.js";import{fromGeometry as o,toGeometry as n,fromGeometries as c}from"../support/jsonConverter.js";function p(e){const r=o(e),c=r.getSpatialReference();return n(t(r.getGeometry(),c,!1),c)}function a(e){const[t,o]=c(e);return r(t,o,!1).map((e=>n(e,o)))}function i(t){const r=o(t);return e(r.getGeometry(),r.getSpatialReference(),!1)}export{p as execute,a as executeMany,i as isSimple};
