/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{isPowerOfTwo as e}from"../../core/mathUtils.js";import{WorkerHandle as r}from"../../core/workers/WorkerHandle.js";import{PixelFormat as t}from"../webgl/enums.js";function o(r,o){let s=o.width,n=o.height;return(r instanceof HTMLImageElement||r instanceof HTMLCanvasElement)&&(s=r.width,n=r.height),(r instanceof HTMLImageElement||r instanceof HTMLCanvasElement||r instanceof Uint8Array)&&(o.pixelFormat===t.RGBA||o.pixelFormat===t.RGB)&&e(s)&&e(n)&&s>=16&&n>=16}class s extends r{constructor(e){super("TextureCompressionWorker","compress",{compress:e=>[e.data]},e)}isCompressible(e,r){return o(e,r)}}export{s as TextureCompressionWorkerHandle,o as isCompressible};
