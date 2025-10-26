/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import{Effect as e}from"./Effect.js";import{FramebufferBit as t,TextureSamplingMode as s}from"../../../../webgl/enums.js";class r extends e{constructor(e){super(),this.name=this.constructor.name,this.defines=[e]}dispose(){}bind({context:e,painter:s}){this._prev=e.getBoundFramebufferObject();const r=s.getFbos().effect0;e.bindFramebuffer(r),e.setColorMask(!0,!0,!0,!0),e.setClearColor(0,0,0,0),e.clear(t.COLOR)}unbind(){}draw(e,t){const{context:r,painter:o}=e,n=o.getPostProcessingEffects(t),c=r.getBoundFramebufferObject();for(const{postProcessingEffect:s,effect:f}of n)s.draw(e,c,f);r.bindFramebuffer(this._prev),r.setStencilTestEnabled(!1),o.blitTexture(r,c.colorTexture,s.NEAREST),r.setStencilTestEnabled(!0)}}export{r as FeatureEffect};
