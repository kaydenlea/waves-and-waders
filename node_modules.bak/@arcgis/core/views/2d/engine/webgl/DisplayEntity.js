/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import t from"./DisplayRecord.js";import{serializeList as i,deserializeList as r}from"./util/serializationUtils.js";class s{static{this.byteSizeHint=2*Uint32Array.BYTES_PER_ELEMENT+t.byteSizeHint}constructor(t,i){this.id=t,this.sortKey=i,this.records=[]}serialize(t){return t.push(this.id),t.writeF32(this.sortKey),i(t,this.records),t}static deserialize(i){const e=i.readInt32(),o=i.readF32(),a=new s(e,o);return a.records=r(i,t)??[],a}}export{s as default};
