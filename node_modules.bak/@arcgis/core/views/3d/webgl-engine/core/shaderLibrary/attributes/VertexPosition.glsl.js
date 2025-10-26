/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{create as r}from"../../../../../../core/libs/gl-matrix-2/factories/mat3f64.js";import{create as o}from"../../../../../../core/libs/gl-matrix-2/factories/mat4f64.js";import{create as e}from"../../../../../../core/libs/gl-matrix-2/factories/vec3f64.js";import{DoublePrecision as t}from"../util/DoublePrecision.glsl.js";import{Float3DrawUniform as a}from"../../shaderModules/Float3DrawUniform.js";import{Float3PassUniform as i}from"../../shaderModules/Float3PassUniform.js";import{glsl as m}from"../../shaderModules/glsl.js";import{Matrix3DrawUniform as s}from"../../shaderModules/Matrix3DrawUniform.js";import{Matrix3PassUniform as d}from"../../shaderModules/Matrix3PassUniform.js";import{Matrix4PassUniform as l}from"../../shaderModules/Matrix4PassUniform.js";import{VertexAttribute as n}from"../../../lib/VertexAttribute.js";import{NoParameters as f}from"../../../../../webgl/NoParameters.js";function v(r,o){const{attributes:e,vertex:f,varyings:v,fragment:F}=r;f.include(t,o),e.add(n.POSITION,"vec3"),v.add("vPositionWorldCameraRelative","vec3"),v.add("vPosition_view","vec3",{invariant:!0}),f.uniforms.add(new i("transformWorldFromViewTH",(r=>r.transformWorldFromViewTH)),new i("transformWorldFromViewTL",(r=>r.transformWorldFromViewTL)),new d("transformViewFromCameraRelativeRS",(r=>r.transformViewFromCameraRelativeRS)),new l("transformProjFromView",(r=>r.transformProjFromView)),new s("transformWorldFromModelRS",(r=>r.transformWorldFromModelRS)),new a("transformWorldFromModelTH",(r=>r.transformWorldFromModelTH)),new a("transformWorldFromModelTL",(r=>r.transformWorldFromModelTL))),f.code.add(m`vec3 positionWorldCameraRelative() {
vec3 rotatedModelPosition = transformWorldFromModelRS * position;
vec3 transform_CameraRelativeFromModel = dpAdd(
transformWorldFromModelTL,
transformWorldFromModelTH,
-transformWorldFromViewTL,
-transformWorldFromViewTH
);
return transform_CameraRelativeFromModel + rotatedModelPosition;
}`),f.code.add(m`
    void forwardPosition(float fOffset) {
      vPositionWorldCameraRelative = positionWorldCameraRelative();
      if (fOffset != 0.0) {
        vPositionWorldCameraRelative += fOffset * ${o.spherical?m`normalize(transformWorldFromViewTL + vPositionWorldCameraRelative)`:m`vec3(0.0, 0.0, 1.0)`};
      }

      vPosition_view = transformViewFromCameraRelativeRS * vPositionWorldCameraRelative;
      gl_Position = transformProjFromView * vec4(vPosition_view, 1.0);
    }
  `),F.uniforms.add(new i("transformWorldFromViewTL",(r=>r.transformWorldFromViewTL))),f.code.add(m`vec3 positionWorld() {
return transformWorldFromViewTL + vPositionWorldCameraRelative;
}`),F.code.add(m`vec3 positionWorld() {
return transformWorldFromViewTL + vPositionWorldCameraRelative;
}`)}class F extends f{constructor(){super(...arguments),this.transformWorldFromViewTH=e(),this.transformWorldFromViewTL=e(),this.transformViewFromCameraRelativeRS=r(),this.transformProjFromView=o()}}class w extends f{constructor(){super(...arguments),this.transformWorldFromModelRS=r(),this.transformWorldFromModelTH=e(),this.transformWorldFromModelTL=e()}}export{v as VertexPosition,w as VertexPositionDrawParameters,F as VertexPositionPassParameters};
