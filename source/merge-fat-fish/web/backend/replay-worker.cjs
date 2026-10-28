'use strict';
const {parentPort,workerData}=require('node:worker_threads');
try{parentPort.postMessage({result:require('../dist/replay.js').replay(workerData.seed,workerData.moves,workerData.ticks)});}catch(error){parentPort.postMessage({error:error.message});}
