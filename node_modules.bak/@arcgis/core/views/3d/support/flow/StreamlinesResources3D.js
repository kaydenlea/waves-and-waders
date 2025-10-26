/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{destroyMaybe as e,disposeMaybe as t}from"../../../../core/maybe.js";import{Object3D as i}from"../../webgl-engine/lib/Object3D.js";import{UpdatePolicy as s}from"../../webgl-engine/lib/UpdatePolicy.js";import{WebGLLayer as n}from"../../webgl-engine/lib/WebGLLayer.js";class r{constructor(e,t){this.streamlines=e,this._geometries=t,this._object3D=null,this._engineLayer=null}get attached(){return null!=this._object3D&&null!=this._engineLayer}attach(e){const{_geometries:t}=this;if(null==t)return;this.detach();const r=new n(e,{pickable:!1,updatePolicy:s.SYNC}),o=new i({geometries:t});o.visible=!0,r.add(o),this._object3D=o,this._engineLayer=r}detach(){this.attached&&(this._engineLayer=e(this._engineLayer),this._object3D=t(this._object3D))}}export{r as StreamlinesResources3D};
