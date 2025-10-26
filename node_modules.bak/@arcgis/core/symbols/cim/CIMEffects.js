/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{GeometryCursor as t}from"../../geometry/GeometryCursor.js";import{GeometryType as e,TileClipper as o}from"../../geometry/support/TileClipper.js";const r=512;let n;class s{constructor(t){this._geometry=t}next(){const t=this._geometry;return this._geometry=null,t}}function i(s,i,l){if(!s)return null;n||(n=new o(0,0,0,1));const y=l?-1:1,m="esriGeometryPolygon"===s.geometryType,c=m?e.Polygon:e.LineString,p=m?3:2;let u,f;for(n.reset(c),n.setPixelMargin(i+1),n.setExtent(r);s.nextPath();)if(!(s.pathSize<p)){for(s.nextPoint(),u=s.x,f=y*s.y,n.moveTo(u,f);s.nextPoint();)u=s.x,f=y*s.y,n.lineTo(u,f);m&&n.close()}const g=n.result(!1);if(g){const e=t.createEmptyOptimizedCIM(s.geometryType);for(const t of g){e.startPath();for(const o of t)e.pushXY(o.x,y*o.y)}return e.reset(),e}return null}export{s as SimpleEffectCursor,i as clipCursorToTileExtent};
