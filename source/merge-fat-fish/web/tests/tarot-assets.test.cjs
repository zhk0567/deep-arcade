'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
test('十位角色均有独立可读取的竖版场景背景，且最终女帝的背景映射保持正确',()=>{
 const root=path.resolve(__dirname,'../dist'),context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'tarot-data.js'),'utf8'),context);
 const cards=context.window.FatFishTarot;assert.equal(cards.length,10);const hashes=new Set(),scenes=new Set();
 for(let i=0;i<cards.length;i++){
  const card=cards[i],file=path.resolve(root,card.background);assert.equal(card.id,i+1);assert.ok(file.startsWith(root+path.sep));
  const data=fs.readFileSync(file);assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a');const width=data.readUInt32BE(16),height=data.readUInt32BE(20);
  assert.ok(width>=800&&height>=1200&&height>width);assert.ok(card.sceneName);scenes.add(card.sceneName);hashes.add(crypto.createHash('sha256').update(data).digest('hex'));
 }
 assert.equal(hashes.size,10);assert.equal(scenes.size,10);assert.match(cards[9].background,/10_empress_throne/);assert.match(cards[8].background,/09_astral_sanctum/);
});
test('微信分享图为接近5:4的独立横版PNG，首级使用新蓝汐摇篮背景',()=>{
 const root=path.resolve(__dirname,'../dist'),data=fs.readFileSync(path.join(root,'assets/share/wechat-share-v063.png'));
 assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a');const w=data.readUInt32BE(16),h=data.readUInt32BE(20);assert.ok(w>1000&&Math.abs(w/h-1.25)<.005);
 const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'tarot-data.js'),'utf8'),context);assert.match(context.window.FatFishTarot[0].background,/01_blue_cradle/);
});
