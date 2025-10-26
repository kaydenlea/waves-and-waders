/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{clone as r}from"../../core/lang.js";import t from"../../core/Logger.js";import{urlToObject as o,join as e}from"../../core/urlUtils.js";import{writeUrlWithLayerId as l,sanitizeUrlWithLayerId as n}from"./arcgisLayerUrl.js";import{url as i}from"./commonProperties.js";function s(){const o=r(i),e=o.json?.write;return"object"==typeof e&&e&&(e.writer=function(r,t,o,e){l(this,r,null,t,e)}),{...o,set:function(r){if(null==r)return void this._set("url",r);const o=n({layer:this,url:r,nonStandardUrlAllowed:!0,logger:t.getLogger(this)});this._set("url",o.url),null!=o.layerId&&this._set("layerId",o.layerId)}}}function u(r){const t=o(r.url);return null!=t&&null!=r.layerId&&(t.path=e(t.path,r.layerId.toString())),t}export{u as normalizeParsedUrlObject,s as urlProperty};
