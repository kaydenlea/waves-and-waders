/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import r from"../../../core/Error.js";class o extends r{constructor(r){super("InvalidDirectionError",`cannot navigate in direction: ${r}`)}}class e extends r{constructor(r){super("NavigationManagerLoadError",`cannot load navigation manager for mode: ${r}`)}}class t extends r{constructor(r){super("FeatureSectorNotFoundError",`cannot find feature sector of node: ${r}`)}}class n extends r{constructor(){super("NoActiveViewerError","no active viewer")}}class s extends r{constructor(){super("NoImageLoadedError","no image loaded")}}class a extends r{constructor(r){super("NoFeatureFoundWithObjectIdError",`no feature found with objectId: ${r}`)}}export{t as FeatureSectorNotFoundError,o as InvalidDirectionError,e as NavigationManagerLoadError,n as NoActiveViewerError,a as NoFeatureFoundWithObjectIdError,s as NoImageLoadedError};
