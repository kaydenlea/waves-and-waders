/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{VTLMaterial as t}from"./VTLMaterial.js";import{DataType as r}from"../../../../webgl/enums.js";import{VertexElementDescriptor as e}from"../../../../webgl/VertexElementDescriptor.js";class s extends t{static{this.ATTRIBUTES=[]}static{this.GEOMETRY_LAYOUT=[new e("a_pos",2,r.BYTE,0,2)]}static{this.ATTRIBUTES_INFO={}}constructor(t){super(t)}geometryInfo(){return s.GEOMETRY_LAYOUT}opacityInfo(){return null}attributes(){return s.ATTRIBUTES}attributesInfo(){return s.ATTRIBUTES_INFO}}export{s as VTLBackgroundMaterial};
