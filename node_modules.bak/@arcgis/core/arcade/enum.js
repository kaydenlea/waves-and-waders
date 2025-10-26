/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{ArcadeExecutionError as r,ExecutionErrorCodes as t}from"./executionError.js";function o(r){return r.toLowerCase().replaceAll(/[\s-]+/g,"")}class e{constructor(r,t){const e=new Map;for(const n of r){const r=o(n);if(e.has(r))throw new Error(`${n} already added as ${e.get(r)}`);e.set(r,n)}if(null!=t)for(const[n,s]of t){const r=o(n);if(e.has(r))throw new Error(`${n} already associated with ${e.get(r)}`);e.set(r,s)}this._enumMap=e}lookup(r){return this._enumMap.get(o(r))}get(o){const e=this.lookup(o);if(null==e)throw new r(null,t.InvalidParameter,null);return e}}export{e as StringEnum,o as toStringEnumKey};
