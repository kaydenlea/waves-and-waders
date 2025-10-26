/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
const t="calcite-mode-",e="dark",c="light",r=/\W/g,n="--esri-calcite-mode-name";function o(){return getComputedStyle(document.body).getPropertyValue(n).replaceAll(r,"").toLowerCase()}function s(){return o()===e}function a(){const r=o();switch(r){case e:case c:return`${t}${r}`;default:return null}}function i(t){const e=a();e&&(l(t),t.classList.add(e))}function l(e){Array.from(e.classList).forEach((c=>{c.startsWith(t)&&e.classList.remove(c)}))}export{a as getCalciteModeClass,s as isDarkMode,n as modeNameCustomCSSProp,i as setCalciteModeClass};
