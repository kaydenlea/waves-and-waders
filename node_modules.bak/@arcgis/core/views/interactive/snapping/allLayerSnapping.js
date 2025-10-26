/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import e from"../../../core/Collection.js";import{destroyHandle as t}from"../../../core/handleUtils.js";import{mapCollection as i}from"../../../core/mapCollectionUtils.js";import o from"./FeatureSnappingLayerSource.js";import{defaults as r}from"./Settings.js";import n from"./SnappingOptions.js";const l=e.ofType(o);function s(e,s){const c=i((()=>e.map?.allLayers),(e=>new o({layer:e})),{recycleItems:!0,createCollection:()=>new l}),a=new n({enabled:!0,selfEnabled:!1,featureEnabled:!0,featureSources:c,distance:s?.distance??r.distance,touchSensitivityMultiplier:s?.touchSensitivityMultiplier??r.touchSensitivityMultiplier});return{...t(c),options:a}}export{s as makeAllLayerSnappingOptions};
