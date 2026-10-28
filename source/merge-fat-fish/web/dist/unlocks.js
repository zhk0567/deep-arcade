(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.FatFishUnlocks=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 class UnlockQueue {
  constructor(maxLevel,options={}){
   this.maxLevel=maxLevel;this.storage=options.storage;this.identity=options.identity||(level=>String(level));this.key='fatfish.v1.lifetimeUnlockEffects';this.seen=new Set();
   const valid=new Set(Array.from({length:Math.max(0,maxLevel-4)},(_,i)=>this.identity(i+5)));
   try{const saved=JSON.parse(this.storage?.get(this.key,'[]')||'[]');if(Array.isArray(saved))for(const id of saved)if(valid.has(id))this.seen.add(id);}catch(_){}
   // Existing discoveries predate this effect and should never be replayed.
   for(const level of options.known||[])if(level>=5&&level<=maxLevel)this.seen.add(this.identity(level));
   this.persist();this.reset();
  }
  persist(){if(this.storage)try{this.storage.set(this.key,JSON.stringify([...this.seen]));}catch(_){} }
  reset(){this.pending=[];this.active=null;}
  offer(level,firstDiscovery,source='merge'){
   if(!firstDiscovery||source!=='merge'||!Number.isInteger(level)||level<5||level>this.maxLevel||this.seen.has(this.identity(level)))return false;
   this.seen.add(this.identity(level));this.persist();this.pending.push(level);return true;
  }
  next(){if(this.active!==null)return null;this.active=this.pending.shift()??null;return this.active;}
  finish(){const level=this.active;this.active=null;return level;}
  get waiting(){return this.pending.length>0;}
 }
 return {UnlockQueue};
});
