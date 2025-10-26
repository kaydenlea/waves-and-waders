/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{ShaderOutput as i}from"../ShaderOutput.js";import{OutputHighlight as t}from"./OutputHighlight.glsl.js";import{glsl as l}from"../../shaderModules/glsl.js";function h(h,u){u.output===i.Highlight&&(h.include(t,u),h.fragment.code.add(l`
    void calculateOcclusionAndOutputHighlight(uvec2 highlightToAdd) {
      uint levelBits = readLevelBits(highlightToAdd, highlightLevel);
      if ((levelBits & 1u) == 0u) discard;
      outputHighlight(isHighlightOccluded());
    }
  `))}export{h as OutputHighlightOverlay};
