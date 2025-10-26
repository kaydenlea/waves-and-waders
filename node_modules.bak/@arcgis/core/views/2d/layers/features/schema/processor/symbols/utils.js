/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{TextureFilter as A}from"../../../../../../../symbols/cim/enums.js";function e(A){return!!(A.visualVariableSizeMinMaxValue||A.visualVariableSizeScaleStops||A.visualVariableSizeStops||A.visualVariableSizeUnitValue||A.visualVariableSizeOutlineScaleStops)}function a(A){return!!A.visualVariableRotation}function i(e){return e.spriteRasterizationParam?e.spriteRasterizationParam:{type:"sprite-rasterization-param",resource:{type:"CIMPictureMarker",url:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAJOgAACToAYJjBRwAAAAsSURBVEhL7c0xAQAwDASh+jf9lcCU7TDA27ECKqACKqACKqACKqACKqDjYPuLVfSmMPfafQAAAABJRU5ErkJggg==",size:16,invertBackfaceTexture:!1,scaleX:1,textureFilter:A.Picture},overrides:[]}}export{i as getAnimatedTechniqueSprite,a as hasRotationVVUniform,e as hasSizeVVUniform};
