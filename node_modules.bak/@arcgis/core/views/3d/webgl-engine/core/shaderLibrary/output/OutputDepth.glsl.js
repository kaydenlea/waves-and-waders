/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{ShaderOutput as t}from"../ShaderOutput.js";import{glsl as a}from"../../shaderModules/glsl.js";function e(e,o){switch(o.output){case t.Shadow:case t.ShadowHighlight:case t.ShadowExcludeHighlight:case t.ViewshedShadow:e.fragment.code.add(a`float _calculateFragDepth(const in float depth) {
const float SLOPE_SCALE = 2.0;
const float BIAS = 20.0 * .000015259;
float m = max(abs(dFdx(depth)), abs(dFdy(depth)));
return depth + SLOPE_SCALE * m + BIAS;
}
void outputDepth(float _linearDepth){
float fragDepth = _calculateFragDepth(_linearDepth);
gl_FragDepth = fragDepth;
}`)}}export{e as OutputDepth};
