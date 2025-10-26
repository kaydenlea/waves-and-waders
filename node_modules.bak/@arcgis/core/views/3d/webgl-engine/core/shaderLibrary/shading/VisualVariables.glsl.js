/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{Float3PassUniform as o}from"../../shaderModules/Float3PassUniform.js";import{Float4PassUniform as e}from"../../shaderModules/Float4PassUniform.js";import{Float4sPassUniform as r}from"../../shaderModules/Float4sPassUniform.js";import{FloatsPassUniform as v}from"../../shaderModules/FloatsPassUniform.js";import{glsl as t}from"../../shaderModules/glsl.js";import{Matrix3PassUniform as a}from"../../shaderModules/Matrix3PassUniform.js";import{VertexAttribute as i}from"../../../lib/VertexAttribute.js";import{vvColorNumber as l}from"../../../materials/VisualVariablePassParameters.js";function n(n,s){const{vertex:u,attributes:c}=n;s.hasVvInstancing&&(s.vvSize||s.vvColor)&&c.add(i.INSTANCEFEATUREATTRIBUTE,"vec4"),s.vvSize?(u.uniforms.add(new o("vvSizeMinSize",(o=>o.vvSize.minSize))),u.uniforms.add(new o("vvSizeMaxSize",(o=>o.vvSize.maxSize))),u.uniforms.add(new o("vvSizeOffset",(o=>o.vvSize.offset))),u.uniforms.add(new o("vvSizeFactor",(o=>o.vvSize.factor))),u.uniforms.add(new o("vvSizeFallback",(o=>o.vvSize.fallback))),u.uniforms.add(new a("vvSymbolRotationMatrix",(o=>o.vvSymbolRotationMatrix))),u.uniforms.add(new o("vvSymbolAnchor",(o=>o.vvSymbolAnchor))),u.code.add(t`vec3 vvScale(vec4 _featureAttribute) {
if (isnan(_featureAttribute.x)) {
return vvSizeFallback;
}
return clamp(vvSizeOffset + _featureAttribute.x * vvSizeFactor, vvSizeMinSize, vvSizeMaxSize);
}
vec4 vvTransformPosition(vec3 position, vec4 _featureAttribute) {
return vec4(vvSymbolRotationMatrix * ( vvScale(_featureAttribute) * (position + vvSymbolAnchor)), 1.0);
}`),u.code.add(t`
      const float eps = 1.192092896e-07;
      vec4 vvTransformNormal(vec3 _normal, vec4 _featureAttribute) {
        vec3 scale = max(vvScale(_featureAttribute), eps);
        return vec4(vvSymbolRotationMatrix * _normal / scale, 1.0);
      }

      ${s.hasVvInstancing?t`
      vec4 vvLocalNormal(vec3 _normal) {
        return vvTransformNormal(_normal, instanceFeatureAttribute);
      }

      vec4 localPosition() {
        return vvTransformPosition(position, instanceFeatureAttribute);
      }`:""}
    `)):u.code.add(t`vec4 localPosition() { return vec4(position, 1.0); }
vec4 vvLocalNormal(vec3 _normal) { return vec4(_normal, 1.0); }`),s.vvColor?(u.constants.add("vvColorNumber","int",l),u.uniforms.add(new v("vvColorValues",(o=>o.vvColor.values),l),new r("vvColorColors",(o=>o.vvColor.colors),l),new e("vvColorFallback",(o=>o.vvColor.fallback))),u.code.add(t`
      vec4 interpolateVVColor(float value) {
        if (isnan(value)) {
          return vvColorFallback;
        }

        if (value <= vvColorValues[0]) {
          return vvColorColors[0];
        }

        for (int i = 1; i < vvColorNumber; ++i) {
          if (vvColorValues[i] >= value) {
            float f = (value - vvColorValues[i-1]) / (vvColorValues[i] - vvColorValues[i-1]);
            return mix(vvColorColors[i-1], vvColorColors[i], f);
          }
        }
        return vvColorColors[vvColorNumber - 1];
      }

      vec4 vvGetColor(vec4 featureAttribute) {
        return interpolateVVColor(featureAttribute.y);
      }

      ${s.hasVvInstancing?t`
            vec4 vvColor() {
              return vvGetColor(instanceFeatureAttribute);
            }`:"vec4 vvColor() { return vec4(1.0); }"}
    `)):u.code.add(t`vec4 vvColor() { return vec4(1.0); }`)}export{n as VisualVariables};
