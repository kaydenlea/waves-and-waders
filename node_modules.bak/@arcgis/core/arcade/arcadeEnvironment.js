/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{ArcadeExecutionError as e,ExecutionErrorCodes as r}from"./executionError.js";function t(t){if("string"==typeof t)return t.toLowerCase();if("name"in t)return t.name.toLowerCase();if("string"!=typeof t.value)throw new e(null,r.InvalidIdentifier,null);return t.value.toLowerCase()}const n=Object.freeze({aborted:!1});export{n as neverAbortedSignal,t as toSymbolId};
