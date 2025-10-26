/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{newLayout as e}from"../../../support/buffer/InterleavedLayout.js";import{TextureCoordinateType as r}from"../../core/shaderLibrary/attributes/TextureCoordinateAttribute.glsl.js";import{VertexAttribute as t}from"../../lib/VertexAttribute.js";import{NoParameters as o}from"../../../../webgl/NoParameters.js";class s extends o{constructor(e,r,t,o,s){super(),this.colors=e,this.textureCoordinates=r,this.hasNormals=t,this.shadeNormals=o,this.applySSAO=s}}function a({hasNormals:o,textureCoordinates:s,colors:a}){const i=e().vec3f(t.POSITION);return o&&i.vec2i16(t.NORMALCOMPRESSED,{glNormalized:!0}),s===r.Default?i.vec2f(t.UV0):s===r.Atlas&&(i.vec2f(t.UV0),i.vec4u16(t.UVREGION,{glNormalized:!0})),a&&i.vec4u8(t.COLOR,{glNormalized:!0}),i.freeze()}export{s as GeometryParameters,a as createVertexBufferLayout};
