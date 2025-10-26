/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{_ as e}from"../../../chunks/tslib.es6.js";import"../../../core/Logger.js";import"../../../core/has.js";import"../../../core/RandomLCG.js";import"../../../core/Error.js";import{subclass as r}from"../../../core/accessorSupport/decorators/subclass.js";import t from"./NavigationManager.js";let a=class extends t{async afterNavigate(e,r,t){return await this.viewModel.selectBestFeature(r.id,t),this.viewModel.setCurrentPanoramaView(e.currentHeading-r.heading,e.currentPitch-r.pitch),r}};a=e([r("esri.widgets.OrientedImageryViewer.navigation.NavigationManagerPanoramic")],a);const i=a;export{i as default};
