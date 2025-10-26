/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{fromValues as o}from"../../../../../../core/libs/gl-matrix-2/factories/vec3f64.js";import{earth as t}from"../../../../../../geometry/support/Ellipsoid.js";import{CloudsTextureChannels as e}from"../../../../environment/Clouds.js";import{FadeState as r}from"../../../../environment/CloudsParameters.js";import{cloudsHeight as a}from"../../../../environment/weather.js";import{addMainLightDirection as i,addMainLightIntensity as d}from"../shading/MainLighting.glsl.js";import{LookupCloudsFromTextureArray as c}from"./LookupCloudsFromTextureArray.glsl.js";import{BooleanBindUniform as n}from"../../shaderModules/BooleanBindUniform.js";import{Float3BindUniform as l}from"../../shaderModules/Float3BindUniform.js";import{FloatBindUniform as s}from"../../shaderModules/FloatBindUniform.js";import{glsl as u}from"../../shaderModules/glsl.js";import{Matrix4BindUniform as m}from"../../shaderModules/Matrix4BindUniform.js";import{Texture2DArrayBindUniform as h}from"../../shaderModules/Texture2DArrayBindUniform.js";function C(t){const a=t.fragment;a.constants.add("radiusCloudsSquared","float",v).code.add(u`vec3 intersectWithCloudLayer(vec3 dir, vec3 cameraPosition, vec3 spherePos) {
float B = 2.0 * dot(cameraPosition, dir);
float C = dot(cameraPosition, cameraPosition) - radiusCloudsSquared;
float det = B * B - 4.0 * C;
float pointIntDist = max(0.0, 0.5 *(-B + sqrt(det)));
return (cameraPosition + dir * pointIntDist) - spherePos;
}`),a.uniforms.add(new s("radiusCurvatureCorrection",(({clouds:o})=>o.parallax.radiusCurvatureCorrection))).code.add(u`vec3 correctForPlanetCurvature(vec3 dir) {
dir.z = dir.z * (1.0 - radiusCurvatureCorrection) + radiusCurvatureCorrection;
return dir;
}`),a.code.add(u`vec3 rotateDirectionToAnchorPoint(mat4 rotMat, vec3 inVec) {
return (rotMat * vec4(inVec, 0.0)).xyz;
}`),i(a),d(a);const C=o(.28,.175,.035);a.constants.add("RIM_COLOR","vec3",C);const f=.3,p=140,g=.2,w=10,P=.3;a.code.add(u`
    vec3 calculateCloudColor(vec3 cameraPosition, vec3 worldSpaceRay, vec4 clouds) {
      float upDotLight = dot(cameraPosition, mainLightDirection);
      float dirDotLight = max(dot(worldSpaceRay, mainLightDirection), 0.0);
      float sunsetTransition = clamp(pow(max(upDotLight, 0.0), ${u.float(f)}), 0.0, 1.0);

      // Base color of the clouds that depends on lighting of the sun and sky
      vec3 ambientLight = calculateAmbientIrradiance(cameraPosition,  0.0);
      vec3 combinedLight = clamp((mainLightIntensity + ambientLight )/PI, vec3(0.0), vec3(1.0));
      vec3 baseCloudColor = pow(combinedLight * pow(clouds.xyz, vec3(GAMMA)), vec3(INV_GAMMA));

      // Rim light around the edge of the clouds simulating scattering of the direct lun light
      float scatteringMod = max(clouds.a < 0.5 ? clouds.a / 0.5 : - clouds.a / 0.5 + 2.0, 0.0);
      float rimLightIntensity = 0.5 + 0.5 * pow(max(upDotLight, 0.0), 0.35);
      vec3 directSunScattering = RIM_COLOR * rimLightIntensity * (pow(dirDotLight, ${u.float(p)})) * scatteringMod;

      // Brighten the clouds around the sun at the sunsets
      float additionalLight = ${u.float(g)} * pow(dirDotLight, ${u.float(w)}) * (1. - pow(sunsetTransition, ${u.float(P)})) ;

      return vec3(baseCloudColor * (1.0 + additionalLight) + directSunScattering);
    }
  `),t.include(c),a.uniforms.add(new n("readChannelsRG",(o=>o.clouds.readChannels===e.RG)),new h("cubeMap",(o=>o.clouds.data?.cubeMap?.colorTexture))).code.add(u`vec4 sampleCloud(vec3 rayDir, bool readOtherChannel) {
vec4 s = lookupCloudsFromTextureArray(cubeMap, rayDir);
bool readRG = readChannelsRG ^^ readOtherChannel;
s = readRG ? vec4(vec3(s.r), s.g) : vec4(vec3(s.b), s.a);
return length(s) == 0.0 ? vec4(s.rgb, 1.0) : s;
}`),a.uniforms.add(new l("anchorPoint",(o=>o.clouds.parallax.anchorPoint)),new l("anchorPointNew",(o=>o.clouds.parallaxNew.anchorPoint)),new m("rotationClouds",(o=>o.clouds.parallax.transform)),new m("rotationCloudsNew",(o=>o.clouds.parallaxNew.transform)),new s("cloudsOpacity",(o=>o.clouds.opacity)),new s("fadeFactor",(o=>o.clouds.fadeFactor)),new n("crossFade",(o=>o.clouds.fadeState===r.CROSS_FADE))).code.add(u`vec4 renderClouds(vec3 worldRay, vec3 cameraPosition) {
vec3 intersectionPoint = intersectWithCloudLayer(worldRay, cameraPosition, anchorPoint);
vec3 worldRayRotated = rotateDirectionToAnchorPoint(rotationClouds, normalize(intersectionPoint));
vec3 worldRayRotatedCorrected = correctForPlanetCurvature(worldRayRotated);
vec4 cloudData = sampleCloud(worldRayRotatedCorrected, crossFade);
vec3 cameraPositionN = normalize(cameraPosition);
vec4 cloudColor = vec4(calculateCloudColor(cameraPositionN, worldRay, cloudData), cloudData.a);
if(crossFade) {
intersectionPoint = intersectWithCloudLayer(worldRay, cameraPosition, anchorPointNew);
worldRayRotated = rotateDirectionToAnchorPoint(rotationCloudsNew, normalize(intersectionPoint));
worldRayRotatedCorrected = correctForPlanetCurvature(worldRayRotated);
cloudData = sampleCloud(worldRayRotatedCorrected, false);
vec4 cloudColorNew = vec4(calculateCloudColor(cameraPositionN, worldRay, cloudData), cloudData.a);
cloudColor = mix(cloudColor, cloudColorNew, fadeFactor);
}
float totalTransmittance = length(cloudColor.rgb) == 0.0 ?
1.0 :
clamp(cloudColor.a * cloudsOpacity + (1.0 - cloudsOpacity), 0.0 , 1.0);
return vec4(cloudColor.rgb, totalTransmittance);
}`)}const v=(t.radius+a)**2;export{C as CloudsParallaxShading};
