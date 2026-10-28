'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{keys,backupKey,reset,restore}=require('../dist/local-reset.js');
function memory(){const data=new Map();return {data,getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};}
test('本机重置先备份，仅清理游戏进度；排行榜待提交、测试数据和其它应用保留，可完整恢复',()=>{
 const s=memory();s.setItem(keys[0],'1024');s.setItem(keys[3],'["assets/levels/01.png","assets/levels/04.png"]');s.setItem('fatfish.v05.unsaved','score');s.setItem('other-app','keep');s.setItem('fatfish.qa.persist.fatfish.v1.best','88');
 assert.equal(reset(s),2);for(const k of keys)assert.equal(s.getItem(k),null);assert.ok(s.getItem(backupKey));assert.equal(s.getItem('fatfish.v05.unsaved'),'score');assert.equal(s.getItem('other-app'),'keep');assert.equal(s.getItem('fatfish.qa.persist.fatfish.v1.best'),'88');
 assert.equal(reset(s),0);restore(s);assert.equal(s.getItem(keys[0]),'1024');assert.ok(s.getItem(keys[3]).includes('04.png'));assert.equal(s.getItem(keys[1]),null);
});
test('备份写入失败时不删除任何游戏记录',()=>{const s=memory();s.setItem(keys[0],'99');s.setItem=()=>{throw Error('quota')};assert.throws(()=>reset(s));assert.equal(s.getItem(keys[0]),'99');});
