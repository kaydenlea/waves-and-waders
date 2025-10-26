/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{_ as r}from"../../../chunks/tslib.es6.js";import{property as e}from"../../../core/accessorSupport/decorators/property.js";import"../../../core/has.js";import"../../../core/Logger.js";import"../../../core/RandomLCG.js";import{subclass as o}from"../../../core/accessorSupport/decorators/subclass.js";import{SketchHandlerMixin as s}from"./SketchHandlerMixin.js";const t=t=>{let i=class extends(s(t)){get sketch(){return this.viewModel?.sketchTriangular}};return r([e()],i.prototype,"sketch",null),i=r([o("esri.widgets.OrientedImageryViewer.mixins.TriangulatedSketchHandlerMixin")],i),i};export{t as TriangulatedSketchHandlerMixin};
