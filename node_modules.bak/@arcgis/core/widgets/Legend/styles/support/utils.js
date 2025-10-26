/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{getTitle as t,isRendererTitle as e,getStretchStopLabel as r}from"../../support/styleUtils.js";function l(t,e,l){switch(e){case"heatmap-ramp":return l[t.label]||t.label;case"stretch-ramp":return r(t,l);default:return t.label}}function i(r,l){if(!r.title||"string"==typeof r.title)return r.title;const i="color-ramp"===r.type||"opacity-ramp"===r.type,n=r.title,o=t(l,n,i);return e(n,i)&&n.title?`${n.title} (${o})`:o}function n(t){return!(!t||"object"!=typeof t)}export{i as getLegendElementTitle,l as getRampStopLabel,n as isWidthAndHeight};
