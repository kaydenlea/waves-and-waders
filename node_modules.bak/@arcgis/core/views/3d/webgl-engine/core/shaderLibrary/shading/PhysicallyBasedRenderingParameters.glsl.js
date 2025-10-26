/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{VertexTextureCoordinates as e}from"../attributes/VertexTextureCoordinates.glsl.js";import{Float3DrawUniform as r}from"../../shaderModules/Float3DrawUniform.js";import{Float3PassUniform as o}from"../../shaderModules/Float3PassUniform.js";import{glsl as s,If as t}from"../../shaderModules/glsl.js";import{Texture2DDrawUniform as a}from"../../shaderModules/Texture2DDrawUniform.js";import{Texture2DPassUniform as i}from"../../shaderModules/Texture2DPassUniform.js";import{schematicMRRFactors as c}from"../../../materials/pbrUtils.js";import{BindType as l}from"../../../../../webgl/BindType.js";import{NoParameters as u}from"../../../../../webgl/NoParameters.js";var n;!function(e){e[e.Disabled=0]="Disabled",e[e.Normal=1]="Normal",e[e.Schematic=2]="Schematic",e[e.Water=3]="Water",e[e.WaterOnIntegratedMesh=4]="WaterOnIntegratedMesh",e[e.Simplified=5]="Simplified",e[e.TerrainWithWater=6]="TerrainWithWater",e[e.COUNT=7]="COUNT"}(n||(n={}));class d extends u{constructor(e,r){super(),this.textureOcclusion=e,this.textureMetallicRoughness=r,this.mrrFactors=c}}function m(c,u){const d=u.pbrMode,m=c.fragment;if(d!==n.Schematic&&d!==n.Disabled&&d!==n.Normal)return void m.code.add(s`void applyPBRFactors() {}`);if(d===n.Disabled)return void m.code.add(s`void applyPBRFactors() {}
float getBakedOcclusion() { return 1.0; }`);if(d===n.Schematic)return void m.code.add(s`vec3 mrr = vec3(0.0, 0.6, 0.2);
float occlusion = 1.0;
void applyPBRFactors() {}
float getBakedOcclusion() { return 1.0; }`);const{hasMetallicRoughnessTexture:p,hasMetallicRoughnessTextureTransform:h,hasOcclusionTexture:f,hasOcclusionTextureTransform:g,bindType:v}=u;(p||f)&&c.include(e,u),m.code.add(s`vec3 mrr;
float occlusion;`),p&&m.uniforms.add(v===l.Pass?new i("texMetallicRoughness",(e=>e.textureMetallicRoughness)):new a("texMetallicRoughness",(e=>e.textureMetallicRoughness))),f&&m.uniforms.add(v===l.Pass?new i("texOcclusion",(e=>e.textureOcclusion)):new a("texOcclusion",(e=>e.textureOcclusion))),m.uniforms.add(v===l.Pass?new o("mrrFactors",(e=>e.mrrFactors)):new r("mrrFactors",(e=>e.mrrFactors))),m.code.add(s`
    ${t(p,s`void applyMetallicRoughness(vec2 uv) {
            vec3 metallicRoughness = textureLookup(texMetallicRoughness, uv).rgb;
            mrr[0] *= metallicRoughness.b;
            mrr[1] *= metallicRoughness.g;
          }`)}

    ${t(f,"void applyOcclusion(vec2 uv) { occlusion *= textureLookup(texOcclusion, uv).r; }")}

    float getBakedOcclusion() {
      return ${f?"occlusion":"1.0"};
    }

    void applyPBRFactors() {
      mrr = mrrFactors;
      occlusion = 1.0;

      ${t(p,`applyMetallicRoughness(${h?"metallicRoughnessUV":"vuv0"});`)}
      ${t(f,`applyOcclusion(${g?"occlusionUV":"vuv0"});`)}
    }
  `)}export{n as PBRMode,d as PBRRenderingParameters,m as PhysicallyBasedRenderingParameters};
