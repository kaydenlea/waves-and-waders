/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{toUnit as e}from"../../core/quantityUtils.js";import{geodesicDistanceThreshold as t}from"../../views/support/geodesicMeasurementUtils.js";function r(e){return e.forceInteractive()}function i(r){return e(r,"meters").value>t}function n(e){return 0===e.viewData.intersectingSegments.size}export{r as forceInteractive,n as hasValidAreaResult,i as isAboveGeodesicDistanceThreshold};
