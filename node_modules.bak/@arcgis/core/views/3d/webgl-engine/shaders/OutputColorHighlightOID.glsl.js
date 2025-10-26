/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{ShaderOutput as o,isColorEmission as r,isColorOrColorEmission as l}from"../core/shaderLibrary/ShaderOutput.js";import{Emissions as i}from"../core/shaderLibrary/output/Emissions.glsl.js";import{OutputHighlight as s}from"../core/shaderLibrary/output/OutputHighlight.glsl.js";import{ColorConversion as a}from"../core/shaderLibrary/util/ColorConversion.glsl.js";import{If as t,glsl as e}from"../core/shaderModules/glsl.js";import{OITPass as n}from"../lib/OITPass.js";import{alphaCutoff as f}from"../../../../webscene/support/AlphaCutoff.js";function u(u,d){u.include(s,d),u.include(i,d),u.fragment.include(a);const{output:p,oitPass:c,discardInvisibleFragments:m,snowCover:C}=d,g=p===o.ObjectAndLayerIdColor,h=r(p),v=l(p)&&c===n.ColorAlpha,b=l(p)&&c!==n.ColorAlpha;let j=0;(b||h||v)&&u.outputs.add("fragColor","vec4",j++),h&&u.outputs.add("fragEmission","vec4",j++),v&&u.outputs.add("fragAlpha","float",j++),u.fragment.code.add(e`
    void outputColorHighlightOID(vec4 finalColor, const in vec3 vWorldPosition, vec3 emissiveBaseColor ${t(C,", float snow")}) {
      ${t(g,"finalColor.a = 1.0;")}

      ${t(m,`if (finalColor.a < ${e.float(f)}) { discard; }`)}

      finalColor = applySlice(finalColor, vWorldPosition);
      ${t(v,e`fragColor = premultiplyAlpha(finalColor);
             fragAlpha = finalColor.a;`)}
      ${t(b,"fragColor = finalColor;")}
      ${t(h,`fragEmission = ${t(C,"mix(finalColor.a * getEmissions(emissiveBaseColor), vec4(0.0), snow);","finalColor.a * getEmissions(emissiveBaseColor);")}`)}
      calculateOcclusionAndOutputHighlight();
      ${t(g,"outputObjectAndLayerIdColor();")}
    }
  `)}export{u as outputColorHighlightOID};
