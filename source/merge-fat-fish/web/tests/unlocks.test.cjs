'use strict';
const test=require('node:test'),assert=require('node:assert/strict');const {UnlockQueue}=require('../dist/unlocks.js');
test('解锁仪式只接受首次实际合成的五级及以上，重复发现和低等级不弹出',()=>{
 const q=new UnlockQueue(10);for(const level of [1,2,3,4])assert.equal(q.offer(level,true),false);
 assert.equal(q.offer(5,false),false);assert.equal(q.offer(5,true,'fixture'),false);assert.equal(q.offer(11,true),false);
 assert.equal(q.offer(5,true),true);assert.equal(q.offer(5,true),false);assert.equal(q.next(),5);assert.equal(q.next(),null);assert.equal(q.finish(),5);assert.equal(q.offer(5,true),false);
});
test('连续首次解锁按顺序逐张展示，包括女帝，不覆盖正在展示的卡',()=>{
 const q=new UnlockQueue(10);for(const level of [5,6,9,10])assert.ok(q.offer(level,true));
 for(const level of [5,6,9,10]){assert.equal(q.next(),level);assert.equal(q.next(),null);q.finish();}
 assert.equal(q.waiting,false);assert.equal(q.next(),null);
});
test('新局或返回首页能清空待展示队列，不把旧局弹窗带入新局',()=>{
 const q=new UnlockQueue(10);q.offer(5,true);q.offer(6,true);q.next();q.reset();assert.equal(q.active,null);assert.equal(q.waiting,false);assert.equal(q.next(),null);assert.equal(q.offer(5,false),false);
 assert.equal(q.offer(5,true),false,'即使调用方再次报告首次出现，重开对局也不重复播出');
});
test('首次展示记录按角色身份持久化，刷新或新实例不会再次展示',()=>{
 const map=new Map(),storage={get:(k,f)=>map.has(k)?map.get(k):f,set:(k,v)=>map.set(k,String(v))},identity=l=>'character-'+l;
 const first=new UnlockQueue(10,{storage,identity});assert.equal(first.offer(5,true),true);first.finish();
 const refreshed=new UnlockQueue(10,{storage,identity});assert.equal(refreshed.offer(5,true),false);assert.equal(refreshed.offer(6,true),true);
 const migrated=new UnlockQueue(10,{storage,identity,known:[1,7,9]});assert.equal(migrated.offer(7,true),false);assert.equal(migrated.offer(9,true),false);assert.equal(migrated.offer(8,true),true);
 const stored=JSON.parse(storage.get('fatfish.v1.lifetimeUnlockEffects','[]'));assert.ok(stored.every(id=>id.startsWith('character-')));
});
