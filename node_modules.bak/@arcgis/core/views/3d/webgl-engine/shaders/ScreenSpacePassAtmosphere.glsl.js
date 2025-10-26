/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{invertOrIdentity as e}from"../../../../core/libs/gl-matrix-2/math/mat4.js";import{create as i}from"../../../../core/libs/gl-matrix-2/factories/mat4f64.js";import{If as r,glsl as o}from"../core/shaderModules/glsl.js";import{Matrix4BindUniform as t}from"../core/shaderModules/Matrix4BindUniform.js";import{VertexAttribute as a}from"../lib/VertexAttribute.js";function s(i,s={needUVs:!0,needEyeDirection:!0}){i.attributes.add(a.POSITION,"vec2"),i.varyings.add("worldRay","vec3");const{needUVs:c,needEyeDirection:d}=s;c&&i.varyings.add("uv","vec2"),d&&i.varyings.add("eyeDir","vec3"),i.vertex.uniforms.add(new t("inverseProjectionMatrix",(e=>e.camera.inverseProjectionMatrix)),new t("inverseViewMatrix",(i=>e(n,i.camera.viewMatrix)))),i.vertex.main.add(o`
    vec3 posViewNear = (inverseProjectionMatrix * vec4(position, -1.0, 1.0)).xyz;
    ${r(d,"eyeDir = posViewNear;")}
    worldRay = (inverseViewMatrix * vec4(posViewNear, 0)).xyz;
    ${r(c,"uv = position * 0.5 + vec2(0.5);")}
    gl_Position = vec4(position, 1, 1);
  `)}const n=i();export{s as ScreenSpacePassAtmosphere};
