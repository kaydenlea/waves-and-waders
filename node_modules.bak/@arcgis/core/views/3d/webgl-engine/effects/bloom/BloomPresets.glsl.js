/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
const n=2.6,s={sunny:.0022,cloudy:.0022,rainy:.0022,snowy:.0022,foggy:.0022};class o{constructor(n,s){this.near=n,this.far=s,this.near=r(n),this.far=r(s)}}const t={sunny:new o([.15,.05,.01,0,0],[1,.8,.6,.4,.2]),cloudy:new o([.15,.05,.01,0,0],[1,.8,.6,.4,.2]),rainy:new o([.15,.05,.01,0,0],[1,.8,.6,.4,.2]),snowy:new o([.15,.05,.01,0,0],[1,.8,.6,.4,.2]),foggy:new o([.15,.05,.01,0,0],[1,.8,.6,.4,.2])};function r(n,s=1){const o=n[0]+n[1]+n[2]+n[3]+n[4];return o<s?n:[n[0]/o,n[1]/o,n[2]/o,n[3]/o,n[4]/o]}export{s as blurRadiusPresets,n as defaultExposure,t as lodFactorsPresets,r as normalizePreset};
