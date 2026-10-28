(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./config.js'));else root.FatFishSavedRound=factory(root.FatFishConfig);})(typeof globalThis!=='undefined'?globalThis:this,function(config){
 'use strict';
 const key='fatfish.v06.savedRound',outcomeKey='fatfish.v06.lastOutcome';
 class SavedRound {
  constructor(storage){this.storage=storage;}
  save(record){
   if(!record||record.version!==config.rulesVersion||!Number.isInteger(record.seed)||!Array.isArray(record.moves)||!Number.isInteger(record.ticks)||record.ticks<0||record.ticks>108000||record.moves.length>4000||!['playing','paused','won'].includes(record.state))throw Error('这份对局暂时无法保存');
   const value=JSON.stringify({...record,savedAt:Date.now()});this.storage.set(key,value);
   if(this.storage.get(key,null)!==value)throw Error('浏览器没有允许保存，请检查是否处于无痕或禁止存储模式');
   this.storage.set(outcomeKey,'saved');return true;
  }
  load(){try{const value=JSON.parse(this.storage.get(key,'null'));if(!value||value.version!==config.rulesVersion||!Number.isInteger(value.seed)||!Number.isInteger(value.ticks)||value.ticks<0||value.ticks>108000||!Array.isArray(value.moves)||value.moves.length>4000||!['playing','paused','won'].includes(value.state))return null;return value;}catch(_){return null;}}
  clear(reason){this.storage.set(key,'null');this.storage.set(outcomeKey,reason||'none');}
  get outcome(){try{const record=JSON.parse(this.storage.get(key,'null'));if(record&&record.version!==config.rulesVersion)return 'outdated';}catch(_){}return this.storage.get(outcomeKey,'none');}
 }
 return {SavedRound};
});
