/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{MaterialChangeSet as e}from"./ChangeSet.js";var r,t;function n(r){const t=new Map,n=n=>{let o=t.get(n);return o||(o=new e(r),t.set(n,o)),o};return r.removes.forAll((e=>{o(e)&&n(e.material).removes.push(e)})),r.adds.forAll((e=>{o(e)&&n(e.material).adds.push(e)})),r.updates.forAll((e=>{o(e.renderGeometry)&&n(e.renderGeometry.material).updates.push(e)})),t}function o(e){return e.geometry.indexCount>=1}!function(e){e[e.Default=0]="Default",e[e.Screenshot=1]="Screenshot",e[e.ObjectAndLayerID=2]="ObjectAndLayerID"}(r||(r={})),function(e){e[e.TOP=0]="TOP",e[e.RIGHT=1]="RIGHT",e[e.BOTTOM=2]="BOTTOM",e[e.LEFT=3]="LEFT"}(t||(t={}));export{t as PaddingSide,r as RendererTarget,n as splitRenderGeometryChangeSetByMaterial};
