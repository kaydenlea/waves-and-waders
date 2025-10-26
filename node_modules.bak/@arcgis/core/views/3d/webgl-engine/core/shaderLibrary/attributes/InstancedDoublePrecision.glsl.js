/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{normalFromMat4 as e}from"../../../../../../core/libs/gl-matrix-2/math/mat3.js";import{create as r}from"../../../../../../core/libs/gl-matrix-2/factories/mat3f64.js";import{IDENTITY as o}from"../../../../../../core/libs/gl-matrix-2/factories/mat4f64.js";import{i as a}from"../../../../../../chunks/vec32.js";import{create as i}from"../../../../../../core/libs/gl-matrix-2/factories/vec3f64.js";import{ShaderOutput as n}from"../ShaderOutput.js";import{DoublePrecision as t}from"../util/DoublePrecision.glsl.js";import{addViewNormal as s}from"../util/View.glsl.js";import{Float3BindUniform as l}from"../../shaderModules/Float3BindUniform.js";import{glsl as m}from"../../shaderModules/glsl.js";import{Matrix3PassUniform as c}from"../../shaderModules/Matrix3PassUniform.js";import{Matrix4PassUniform as d}from"../../shaderModules/Matrix4PassUniform.js";import{VertexAttribute as v}from"../../../lib/VertexAttribute.js";import{encodeDoubleHi as u,encodeDoubleLo as g}from"../../../../../webgl/doublePrecisionUtils.js";import{NoParameters as p}from"../../../../../webgl/NoParameters.js";class x extends p{constructor(){super(...arguments),this.modelTransformation=null}}const M=r();function f(r,i){const{hasModelTransformation:p,instancedDoublePrecision:x,instanced:f,output:O,hasVertexTangents:N}=i;p&&(r.vertex.uniforms.add(new d("model",(e=>e.modelTransformation??o))),r.vertex.uniforms.add(new c("normalLocalOriginFromModel",(r=>(e(M,r.modelTransformation??o),M))))),f&&x&&(r.attributes.add(v.INSTANCEMODELORIGINHI,"vec3"),r.attributes.add(v.INSTANCEMODELORIGINLO,"vec3"),r.attributes.add(v.INSTANCEMODEL,"mat3"),r.attributes.add(v.INSTANCEMODELNORMAL,"mat3"));const _=r.vertex;x&&(_.include(t,i),_.uniforms.add(new l("viewOriginHi",(e=>u(a(w,e.camera.viewInverseTransposeMatrix[3],e.camera.viewInverseTransposeMatrix[7],e.camera.viewInverseTransposeMatrix[11]),w))),new l("viewOriginLo",(e=>g(a(w,e.camera.viewInverseTransposeMatrix[3],e.camera.viewInverseTransposeMatrix[7],e.camera.viewInverseTransposeMatrix[11]),w))))),_.code.add(m`
    vec3 getVertexInLocalOriginSpace() {
      return ${p?x?"(model * vec4(instanceModel * localPosition().xyz, 1.0)).xyz":"(model * localPosition()).xyz":x?"instanceModel * localPosition().xyz":"localPosition().xyz"};
    }

    vec3 subtractOrigin(vec3 _pos) {
      ${x?m`
          // Issue: (should be resolved now with invariant position) https://devtopia.esri.com/WebGIS/arcgis-js-api/issues/56280
          vec3 originDelta = dpAdd(viewOriginHi, viewOriginLo, -instanceModelOriginHi, -instanceModelOriginLo);
          return _pos - originDelta;`:"return vpos;"}
    }
    `),_.code.add(m`
    vec3 dpNormal(vec4 _normal) {
      return normalize(${p?x?"normalLocalOriginFromModel * (instanceModelNormal * _normal.xyz)":"normalLocalOriginFromModel * _normal.xyz":x?"instanceModelNormal * _normal.xyz":"_normal.xyz"});
    }
    `),O===n.Normal&&(s(_),_.code.add(m`
    vec3 dpNormalView(vec4 _normal) {
      return normalize((viewNormal * ${p?x?"vec4(normalLocalOriginFromModel * (instanceModelNormal * _normal.xyz), 1.0)":"vec4(normalLocalOriginFromModel * _normal.xyz, 1.0)":x?"vec4(instanceModelNormal * _normal.xyz, 1.0)":"_normal"}).xyz);
    }
    `)),N&&_.code.add(m`
    vec4 dpTransformVertexTangent(vec4 _tangent) {
      ${p?x?"return vec4(normalLocalOriginFromModel * (instanceModelNormal * _tangent.xyz), _tangent.w);":"return vec4(normalLocalOriginFromModel * _tangent.xyz, _tangent.w);":x?"return vec4(instanceModelNormal * _tangent.xyz, _tangent.w);":"return _tangent;"}
    }`)}const w=i();export{x as InstancedDoublePassParameters,f as InstancedDoublePrecision};
