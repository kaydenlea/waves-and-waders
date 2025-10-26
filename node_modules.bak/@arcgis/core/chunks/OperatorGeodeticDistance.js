/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{b as e,c as r}from"./tslib.es6.js";import{a as t,c as o}from"./Geometry.js";import{G as s,m as a}from"./GeodeticDistanceCalculator-Ce-woMPw.js";class u{getOperatorType(){return 10316}supportsCurves(){return!0}accelerateGeometry(e,r,t){return!1}canAccelerateGeometry(e){return!1}execute(e,r,t,o,s){return this.executeEx(e,r,t,o,s,null,null,Number.NaN)}executeEx(u,n,c,i,m,l,p,y){const N={stack:[],error:void 0,hasError:!1};try{if(0===c.getCoordinateSystemType()&&t(""),o(u),o(n),u.isEmpty()||n.isEmpty())return Number.NaN;Number.isNaN(y)&&(y=Number.MAX_VALUE);const r=e(N,new s(c,i,m,y,1),!1),E=a(),b=a(),x=r.calculate(u,n,E,b);return l&&l.outPoint.assign(E.outPoint),p&&p.outPoint.assign(b.outPoint),x}catch(E){N.error=E,N.hasError=!0}finally{r(N)}}}export{u as OperatorGeodeticDistance,a as makeOutput};
