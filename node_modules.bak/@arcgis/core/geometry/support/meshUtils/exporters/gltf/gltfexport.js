/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{exportGLB as o}from"./index.js";import{Asset as n}from"./asset.js";import{Scene as e}from"./scene.js";import{Node as r}from"./node.js";async function i(i,t){const s=new n,m=new e;return s.addScene(m),m.addNode(new r(i)),await o(s,{origin:i.origin,...t})}export{i as toBinaryGLTF};
