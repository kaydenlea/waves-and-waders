/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
let a;function e(){return a||(a=(async()=>{const[a,e,r]=await Promise.all([import("./arcadeUtils.js"),import("../arcade/batchExec.js"),import("../arcade/functions/aiServices.js")]);return{arcade:a.arcade,arcadeUtils:a,batchExec:e,aiServices:r,Dictionary:a.Dictionary,Feature:a.arcadeFeature,Voxel:a.Voxel}})()),a}export{e as loadArcade};
