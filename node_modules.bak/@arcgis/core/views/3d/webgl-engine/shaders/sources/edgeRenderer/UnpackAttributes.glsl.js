/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{If as e,glsl as t}from"../../../core/shaderModules/glsl.js";import{VertexAttribute as n}from"../../../lib/VertexAttribute.js";import{EdgeType as s}from"./EdgeUtil.glsl.js";function i(i,o){const d=o.type===s.Mixed,r=o.type===s.Solid;i.attributes.add(n.SIDENESS,"vec2"),i.vertex.code.add(t`
    struct UnpackedAttributes {
      vec2 sideness;
      vec2 sidenessNorm;
      float lineWidthPixels;
      float extensionLengthPixels;
      ${e(d,"float type;")}
    };
  `).code.add(t`
    UnpackedAttributes unpackAttributes(ComponentData component) {
      vec2 sidenessNorm = sideness;
      vec2 sideness = sidenessNorm * 2.0 - 1.0;
      float extensionLengthPixels = component.extensionLength;
      float lineWidth = component.lineWidth;
      ${e(d,"if (component.type <= 0.0) {")}
      ${e(!r,"extensionLengthPixels *= variantExtension * 2.0 - 1.0;")}
      ${e(d,"}")}
      return UnpackedAttributes(sideness, sidenessNorm, lineWidth, extensionLengthPixels ${e(d,", component.type")});
    }
  `)}export{i as UnpackAttributes};
