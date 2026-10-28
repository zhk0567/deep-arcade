'use strict';
const backend=require('./backend/http.cjs');
if(require.main===module)backend.launch();
module.exports=backend;
