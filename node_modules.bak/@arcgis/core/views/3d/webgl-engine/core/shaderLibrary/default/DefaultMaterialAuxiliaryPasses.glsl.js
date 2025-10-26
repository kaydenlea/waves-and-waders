/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{addNearFar as e}from"../ForwardLinearDepth.glsl.js";import{ShaderOutput as o}from"../ShaderOutput.js";import{SliceDraw as r}from"../Slice.glsl.js";import{Transform as t}from"../Transform.glsl.js";import{NormalAttribute as i,NormalType as a}from"../attributes/NormalAttribute.glsl.js";import{ObjectAndLayerIdColor as s}from"../attributes/ObjectAndLayerIdColor.glsl.js";import{TextureCoordinateAttribute as l}from"../attributes/TextureCoordinateAttribute.glsl.js";import{VertexNormal as d}from"../attributes/VertexNormal.glsl.js";import{OutputDepth as n}from"../output/OutputDepth.glsl.js";import{OutputHighlight as c}from"../output/OutputHighlight.glsl.js";import{VisualVariables as u}from"../shading/VisualVariables.glsl.js";import{DiscardOrAdjustAlphaPass as p}from"../util/DiscardOrAdjustAlpha.glsl.js";import{addProjViewLocalOrigin as m}from"../util/View.glsl.js";import{glsl as v,If as g}from"../../shaderModules/glsl.js";import{Texture2DPassUniform as f}from"../../shaderModules/Texture2DPassUniform.js";import{AlphaDiscardMode as x}from"../../../lib/basicInterfaces.js";function h(h,O){const{vertex:j,fragment:w,varyings:b}=h,{hasColorTexture:C,alphaDiscardMode:V}=O,A=C&&V!==x.Opaque,{output:S,normalType:y,hasColorTextureTransform:P}=O;switch(S){case o.Depth:m(j,O),h.include(t,O),w.include(r,O),h.include(l,O),A&&w.uniforms.add(new f("tex",(e=>e.texture))),j.main.add(v`vpos = getVertexInLocalOriginSpace();
vpos = subtractOrigin(vpos);
vpos = addVerticalOffset(vpos, localOrigin);
gl_Position = transformPosition(proj, view, vpos);
forwardTextureCoordinates();`),h.include(p,O),w.main.add(v`
        discardBySlice(vpos);
        ${g(A,v`vec4 texColor = texture(tex, ${P?"colorUV":"vuv0"});
                discardOrAdjustAlpha(texColor);`)}`);break;case o.Shadow:case o.ShadowHighlight:case o.ShadowExcludeHighlight:case o.ViewshedShadow:case o.ObjectAndLayerIdColor:m(j,O),h.include(t,O),h.include(l,O),h.include(u,O),h.include(n,O),w.include(r,O),h.include(s,O),e(h),b.add("depth","float",{invariant:!0}),A&&w.uniforms.add(new f("tex",(e=>e.texture))),j.main.add(v`vpos = getVertexInLocalOriginSpace();
vpos = subtractOrigin(vpos);
vpos = addVerticalOffset(vpos, localOrigin);
gl_Position = transformPositionWithDepth(proj, view, vpos, nearFar, depth);
forwardTextureCoordinates();
forwardObjectAndLayerIdColor();`),h.include(p,O),w.main.add(v`
        discardBySlice(vpos);
        ${g(A,v`vec4 texColor = texture(tex, ${P?"colorUV":"vuv0"});
                discardOrAdjustAlpha(texColor);`)}
        ${S===o.ObjectAndLayerIdColor?v`outputObjectAndLayerIdColor();`:v`outputDepth(depth);`}`);break;case o.Normal:{m(j,O),h.include(t,O),h.include(i,O),h.include(d,O),h.include(l,O),h.include(u,O),A&&w.uniforms.add(new f("tex",(e=>e.texture))),y===a.ScreenDerivative&&b.add("vPositionView","vec3",{invariant:!0});const e=y===a.Attribute||y===a.Compressed;j.main.add(v`
        vpos = getVertexInLocalOriginSpace();
        ${e?v`vNormalWorld = dpNormalView(vvLocalNormal(normalModel()));`:v`vPositionView = (view * vec4(vpos, 1.0)).xyz;`}
        vpos = subtractOrigin(vpos);
        vpos = addVerticalOffset(vpos, localOrigin);
        gl_Position = transformPosition(proj, view, vpos);
        forwardTextureCoordinates();`),w.include(r,O),h.include(p,O),w.main.add(v`
        discardBySlice(vpos);
        ${g(A,v`vec4 texColor = texture(tex, ${P?"colorUV":"vuv0"});
                discardOrAdjustAlpha(texColor);`)}

        ${y===a.ScreenDerivative?v`vec3 normal = screenDerivativeNormal(vPositionView);`:v`vec3 normal = normalize(vNormalWorld);
                    if (gl_FrontFacing == false){
                      normal = -normal;
                    }`}
        fragColor = vec4(0.5 + 0.5 * normal, 1.0);`);break}case o.Highlight:m(j,O),h.include(t,O),h.include(l,O),h.include(u,O),A&&w.uniforms.add(new f("tex",(e=>e.texture))),j.main.add(v`vpos = getVertexInLocalOriginSpace();
vpos = subtractOrigin(vpos);
vpos = addVerticalOffset(vpos, localOrigin);
gl_Position = transformPosition(proj, view, vpos);
forwardTextureCoordinates();`),w.include(r,O),h.include(p,O),h.include(c,O),w.main.add(v`
        discardBySlice(vpos);
        ${g(A,v`vec4 texColor = texture(tex, ${P?"colorUV":"vuv0"});
                discardOrAdjustAlpha(texColor);`)}
        calculateOcclusionAndOutputHighlight();`)}}export{h as DefaultMaterialAuxiliaryPasses};
