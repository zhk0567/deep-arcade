(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.FatFishLocalReset=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 // Deliberately excludes player cookies, the score outbox, other apps and QA data.
 const keys=Object.freeze(['fatfish.v1.best','fatfish.v1.sound','fatfish.v1.discovered','fatfish.v2.discovered','fatfish.v1.lifetimeUnlockEffects','fatfish.v06.savedRound','fatfish.v06.lastOutcome']);
 const backupKey='fatfish.local-reset.backup.v1';
 function reset(storage){
  const items=keys.map(key=>[key,storage.getItem(key)]),value=JSON.stringify({at:new Date().toISOString(),items});
  if(items.every(([,value])=>value===null)&&storage.getItem(backupKey)!==null)return 0;
  storage.setItem(backupKey,value);
  if(storage.getItem(backupKey)!==value)throw Error('未能保存备份，没有清理记录。');
  try{for(const key of keys)storage.removeItem(key);if(keys.some(key=>storage.getItem(key)!==null))throw Error('清理未完成');}
  catch(error){for(const [key,item]of items)if(item===null)storage.removeItem(key);else storage.setItem(key,item);throw error;}
  return items.filter(([,value])=>value!==null).length;
 }
 function restore(storage){const backup=JSON.parse(storage.getItem(backupKey)||'null');if(!backup||!Array.isArray(backup.items))throw Error('没有可恢复的备份');for(const [key,value]of backup.items)if(keys.includes(key)){if(value===null)storage.removeItem(key);else storage.setItem(key,value);}return backup.at;}
 return {keys,backupKey,reset,restore};
});
