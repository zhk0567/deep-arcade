'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {CheerDirector,HomeTaps}=require('../dist/companion.js');
test('发现新形态会触发花球应援',()=>{const director=new CheerDirector();const message=director.merge({newForm:true,totalMerges:1,comboCount:1,turnId:1},0);assert.equal(message.kind,'discover');assert.equal(message.pose,'cheer');});
test('一次投放两次连锁会欢呼，不重复播报同一次连锁',()=>{const director=new CheerDirector();const event={newForm:false,totalMerges:2,comboCount:2,turnId:1};assert.equal(director.merge(event,0).kind,'combo');assert.equal(director.merge(event,100),null);assert.match(director.merge({...event,comboCount:3,totalMerges:3},200).text,/3/);});
test('普通鼓励不会打断正在播出的连锁应援',()=>{const director=new CheerDirector();director.merge({comboCount:2,turnId:1,totalMerges:2},0);assert.equal(director.merge({comboCount:1,turnId:2,totalMerges:4},100),null);assert.equal(director.merge({comboCount:1,turnId:3,totalMerges:8},3000).kind,'praise');});
test('重新开始后可再次播报连锁',()=>{const director=new CheerDirector();const event={comboCount:2,turnId:1,totalMerges:2};director.merge(event,0);director.reset();assert.equal(director.merge(event,1).kind,'combo');});
test('单击卖萌，短时间连击害羞，较慢的点击仍是单击',()=>{const taps=new HomeTaps();assert.equal(taps.tap(0),'playful');assert.equal(taps.tap(200),'shy');assert.equal(taps.tap(250),'playful');assert.equal(taps.tap(1000),'playful');taps.reset();assert.equal(taps.tap(1010),'playful');});
