/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import r from"../../views/support/waitForResources.js";async function n(n){await r(n);const t="3d"===n.type?n.resourceController?.scheduler?.test?.getRunning()??null:null;if(null!=t)throw new Error(`View is not updating, but scheduler is running:${t} at ${(new Error).stack}`)}export{n as waitUpdated};
