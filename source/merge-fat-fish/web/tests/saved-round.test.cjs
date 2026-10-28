'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {SavedRound}=require('../dist/saved-round.js'),C=require('../dist/config.js'),{Session}=require('../dist/engine.js'),{seeded,createReplay}=require('../dist/replay.js');
const storage=()=>{const map=new Map();return {get:(key,fallback)=>map.has(key)?map.get(key):fallback,set:(key,value)=>map.set(key,String(value))};};
test('存档跨实例保存，空记录和失败记录不能继续，存储失败不冒充保存成功',()=>{
 const values=storage(),save=new SavedRound(values);assert.equal(save.load(),null);
 save.save({version:C.rulesVersion,seed:17,ticks:0,moves:[],state:'paused',score:0,currentLevel:1});assert.equal(new SavedRound(values).load().seed,17);
 values.set('fatfish.v06.savedRound',JSON.stringify({version:'0.6.0',seed:17,ticks:0,moves:[],state:'paused'}));assert.equal(save.load(),null);assert.equal(save.outcome,'outdated');
 save.clear('failed');assert.equal(save.load(),null);assert.equal(new SavedRound(values).outcome,'failed');
 assert.throws(()=>save.save({version:C.rulesVersion,seed:1,ticks:0,moves:[],state:'gameover'}));
 assert.throws(()=>new SavedRound({get:(_,fallback)=>fallback,set(){}}).save({version:C.rulesVersion,seed:1,ticks:0,moves:[],state:'paused'}),/没有允许保存/);
});
test('分段重放精确恢复球堆、分数、随机序列，继续投放仍与原局一致',()=>{
 const original=new Session({random:()=>0});original.random=seeded(73);original.start();const moves=[];
 for(let tick=0;tick<900;tick++){if(tick%75===0){const body=original.drop(95+tick%3*90);if(body)moves.push([tick,body.position.x]);}original.step(1000/60);}
 const task=createReplay(73,moves,900);while(!task.done)task.advance(73);const restored=task.session;
 function compare(){assert.equal(restored.score,original.score);assert.equal(restored.currentLevel,original.currentLevel);const a=original.snapshot().bodies,b=restored.snapshot().bodies;assert.equal(a.length,b.length);for(let i=0;i<a.length;i++){assert.equal(a[i].level,b[i].level);assert.ok(Math.hypot(a[i].x-b[i].x,a[i].y-b[i].y)<1e-8);}}
 compare();for(let tick=0;tick<300;tick++){if(tick%70===0){original.drop(210);restored.drop(210);}original.step(1000/60);restored.step(1000/60);}compare();
});
