/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import e from"../../core/Logger.js";import{EditableFlag as t}from"./interfaces.js";import{interactiveToolKeys as o}from"./keybindings.js";function i(t){return[t.on("before-add",(o=>{const i=o.item;if(null==i||t.includes(i))return e.getLogger("esri.views.interactive.interactiveToolUtils").warn("Tool is either already in the list of tools or tool is `null`. Not adding tool."),void o.preventDefault();i.onAdd()})),t.on("after-remove",(e=>{const t=e.item;t.active&&(t.view.activeTool=null),t.destroy()}))]}function n(e){return e.visible&&null!=e.getEditableFlag&&e.getEditableFlag(t.USER)&&e.getEditableFlag(t.MANAGER)}function r(e){return"key-down"===e.type&&e.key===o.cancel}export{n as areToolManipulatorsEditable,i as getToolCollectionHandles,r as isCancelEvent};
