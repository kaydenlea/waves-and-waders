/*
All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://js.arcgis.com/4.33/esri/copyright.txt for details.
*/
import t from"../GraphApplyEditsResult.js";import{wasmErrorToEsriError as e}from"./wasmUtils.js";function r(r){const s=r.has_error(),_=new t({hasError:s,error:s?e(r.error):null}),o=r.get_edit_results_count();for(let t=0;t<o;t++){const s=r.get_edit_results_at(t),o=r.get_edit_results_type_name_at(t),u=[],d=[],l=[],a=s.get_add_results_count(),i=s.get_update_results_count(),n=s.get_delete_results_count();for(let t=0;t<a;t++){const r=s.get_add_result_at(t);u.push({id:r.id,error:e(r.error)})}for(let t=0;t<i;t++){const r=s.get_update_result_at(t);d.push({id:r.id,error:e(r.error)})}for(let t=0;t<n;t++){const r=s.get_delete_result_at(t);l.push({id:r.id,error:e(r.error)})}_.editResults.push({typeName:o,adds:u,updates:d,deletes:l})}return _}export{r as decoderToApplyEditsResponse};
