/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{isValidIntersectorResult as r}from"./IntersectorResult.js";import{IntersectorType as t}from"./IntersectorType.js";function e(e){return r(e)&&e.intersector===t.OBJECT&&!!e.target}export{e as isObjectIntersectorResult};
