'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { Progress } = require('../dist/progress.js');
function storage(initial) {
  const values = new Map(Object.entries(initial || {}));
  return { get: (key, fallback) => values.has(key) ? values.get(key) : fallback, set: (key, value) => values.set(key, String(value)) };
}
test('新玩家仅见起始形态，不会提前解锁后续立绘', () => {
  const progress = new Progress(storage());
  assert.deepEqual(progress.levels(), [1]); assert.equal(progress.count, 1);
  assert.equal(progress.has(2), false); assert.equal(progress.has(9), false);
});
test('只记录实际发现的形态，图鉴不能借高等级解锁低等级', () => {
  const saved = storage(); const progress = new Progress(saved);
  assert.equal(progress.reveal(4), true); assert.equal(progress.reveal(4), false);
  assert.deepEqual(progress.levels(), [1, 4]); assert.equal(progress.has(2), false);
  assert.deepEqual(new Progress(saved).levels(), [1, 4]);
});
test('旧版发现记录按原图片迁移，不会错误解锁新增形态', () => {
  const progress = new Progress(storage({ 'fatfish.v1.discovered': '4' }));
  assert.deepEqual(progress.levels(), [1, 3, 4, 5]); assert.equal(progress.has(2), false);
  progress.reveal(2); assert.deepEqual(progress.levels(), [1, 2, 3, 4, 5]);
});
test('损坏或不属于当前游戏的记录不会泄漏额外形态', () => {
  assert.deepEqual(new Progress(storage({ 'fatfish.v2.discovered': '{bad' })).levels(), [1]);
  assert.deepEqual(new Progress(storage({ 'fatfish.v2.discovered': '["not-an-asset"]' })).levels(), [1]);
});

test('女帝和星海形态调序后按图片身份保留各自发现记录',()=>{
  const oldEmpress=new Progress(storage({'fatfish.v2.discovered':'["assets/levels/08.png"]'}));
  assert.equal(oldEmpress.has(10),true);assert.equal(oldEmpress.has(9),false);
  const oldStar=new Progress(storage({'fatfish.v2.discovered':'["assets/levels/09_starsea.png"]'}));
  assert.equal(oldStar.has(9),true);assert.equal(oldStar.has(10),false);
});

test('单文件版内置图片时只保存短编号，并迁移旧的图片数据记录',()=>{
 const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),C=require('../dist/config.js');
 const levels=C.levels.map(def=>({...def,asset:'data:image/png;base64,'+String(def.id).repeat(2000)})),context={FatFishConfig:{levels}};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist/progress.js'),'utf8'),context);
 const values=storage({'fatfish.v2.discovered':JSON.stringify([levels[0].asset,levels[3].asset])}),Progress=context.FatFishProgress.Progress,progress=new Progress(values);
 assert.deepEqual(Array.from(progress.levels()),[1,4]);for(let id=1;id<=10;id++)progress.reveal(id);
 const saved=values.get('fatfish.v2.discovered','');assert.ok(saved.length<1000);assert.ok(!saved.includes('data:'));assert.equal(new Progress(values).count,10);
});
