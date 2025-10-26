/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import"../../../../../../core/has.js";import{ZEROS as o}from"../../../../../../core/libs/gl-matrix-2/factories/vec3f64.js";import{LayerBlendMode as r}from"../output/BlendOptions.js";import{BackgroundGrid as e}from"./BackgroundGrid.glsl.js";import{BaseOpacityMode as a}from"./BaseOpacityMode.js";import{BlendLayersOutput as c}from"./BlendLayersOutput.js";import{PremultipliedAlphaSource as s}from"./PremultipliedAlphaSource.js";import{BlendModes as t}from"../util/BlendModes.glsl.js";import{Float3PassUniform as l}from"../../shaderModules/Float3PassUniform.js";import{FloatPassUniform as i}from"../../shaderModules/FloatPassUniform.js";import{glsl as p,If as d}from"../../shaderModules/glsl.js";import{Texture2DPassUniform as m}from"../../shaderModules/Texture2DPassUniform.js";import{NoParameters as u}from"../../../../../webgl/NoParameters.js";class n extends u{constructor(){super(...arguments),this.baseOpacity=1,this.backgroundColor=o,this.fboTexture=null}}function b(o,u){const{output:n,blendMode:b,baseOpacityMode:g,premultipliedSource:f}=u,y=o.fragment,C=g===a.Required;C&&y.uniforms.add(new i("baseOpacity",(o=>o.baseOpacity)));const v=b!==r.Normal,h=f===s.On,j=n===c.Composite,k=n===c.GroupBackgroundComposite,B=!v&&!h&&(j&&!C||k);y.include(t,u);let L="";switch(n){case c.GroupBackgroundComposite:case c.Draw:L=p`vec4(0.0)`;break;case c.ColorComposite:y.uniforms.add(new l("backgroundColor",(o=>o.backgroundColor))),L=p`vec4(backgroundColor, 1.0)`;break;case c.GridComposite:y.include(e),L=p`vec4(gridColor(uv), 1.0)`;break;case c.Composite:y.uniforms.add(new m("fboColor",(o=>o.fboTexture))),L=p`texelFetch(fboColor, ivec2(gl_FragCoord.xy), 0)`;case c.COUNT:}y.code.add(p`
    vec4 getBackground(vec2 uv) {
      return ${d(C,p`baseOpacity *`)} ${L};
    }

    vec4 blendLayers(vec2 bgUV, vec4 colorLayer, float opacity) {
      ${v?p`
          vec3 cl = colorLayer.a == 0.0 ? colorLayer.rgb : colorLayer.rgb / colorLayer.a;
          vec4 bgColor = getBackground(bgUV);
          vec3 cb = bgColor.a == 0.0 ? bgColor.rgb : bgColor.rgb / bgColor.a;
          return applyBlendMode(clamp(cl, vec3(0.0), vec3(1.0)), colorLayer.a * opacity, cb, bgColor.a);`:p`
          float composeAlpha = colorLayer.a * opacity;
          ${B?p`return colorLayer * opacity;`:p`
            vec4 bgColor = getBackground(bgUV);
            return bgColor * (1.0 - composeAlpha) + colorLayer * opacity;`}`}
    }`)}export{b as TileBackground,n as TileBackgroundPassParameters};
