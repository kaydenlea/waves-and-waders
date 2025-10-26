/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{VertexAttribute as e}from"./VertexAttribute.js";import{DataType as O}from"../../../webgl/enums.js";import{VertexElementDescriptor as r}from"../../../webgl/VertexElementDescriptor.js";const t=[],T=[new r(e.POSITION,3,O.FLOAT,0,12)],n=[new r(e.POSITION,2,O.FLOAT,0,8)],o=[new r(e.POSITION,2,O.FLOAT,0,12),new r(e.UV0,2,O.HALF_FLOAT,8,12)],m=[new r(e.POSITION,2,O.FLOAT,0,16),new r(e.UV0,2,O.FLOAT,8,16)];export{t as NoVertex,n as Pos2,o as Pos2TexF16,m as Pos2TexF32,T as Pos3};
