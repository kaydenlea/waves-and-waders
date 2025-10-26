/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import o from"../../core/Collection.js";import{defaultHighlightName as r,temporaryHighlightColor as t,temporaryHighlightName as e}from"./HighlightDefaults.js";import i from"./HighlightOptions.js";function n(){return new o([new i({name:r}),new i({name:e,color:t})])}export{n as createInitialHighlightOptions};
