/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{_ as t}from"../../../../chunks/tslib.es6.js";import{ShaderTechniqueConfiguration as e,parameter as o}from"../core/shaderTechnique/ShaderTechniqueConfiguration.js";var i;!function(t){t[t.None=0]="None",t[t.Alpha=1]="Alpha",t[t.PremultipliedAlpha=2]="PremultipliedAlpha",t[t.Depth=3]="Depth",t[t.COUNT=4]="COUNT"}(i||(i={}));class r extends e{constructor(){super(...arguments),this.blitMode=i.None,this.hasOpacityFactor=!1}}t([o({count:i.COUNT})],r.prototype,"blitMode",void 0),t([o()],r.prototype,"hasOpacityFactor",void 0);export{i as BlitMode,r as CompositingTechniqueConfiguration};
