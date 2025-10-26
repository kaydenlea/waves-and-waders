/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{convertTime as o}from"../core/timeUtils.js";import{getLocale as l,getLocaleParts as n}from"./locale.js";import{Duration as t}from"luxon";function r(l,n="milliseconds",r={}){const i={locale:e(),numberingSystem:"latn"};let s;return s=l?t.fromMillis(o(l,n,"milliseconds"),i).rescale():t.fromObject({seconds:0},i),s.toHuman({listStyle:"narrow",unitDisplay:"long",...r})}function e(){const o=l();return"bs"===n(o)?.language?"hr":o}export{r as formatDuration};
