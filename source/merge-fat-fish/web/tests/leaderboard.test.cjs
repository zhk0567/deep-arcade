'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {Leaderboard}=require('../backend/leaderboard.cjs'),{createServer}=require('../server.cjs');
const {Session}=require('../dist/engine.js'),{seeded,replay}=require('../dist/replay.js');
function recording(seed){const session=new Session({random:()=>0});session.random=seeded(seed);session.start();const moves=[];let tick=0;for(;tick<2000&&session.state==='playing';tick++){if(tick%40===0&&session.canDrop()){const body=session.drop(160+(tick%3)*20);moves.push([tick,body.position.x]);}session.step(1000/60);}return {moves,ticks:tick,score:session.score};}
test('投放记录可确定重放，且不依赖其它对局产生的全局物体ID',()=>{const a=recording(342);recording(173);assert.equal(replay(342,a.moves,a.ticks).score,a.score);assert.ok(a.score>0);assert.throws(()=>replay(342,[[0,160],[0,160]],1),/时机/);assert.throws(()=>replay(1,[[2,-10]],2),/无效/);});
test('每人最高分只增不减，同昵称仍是不同玩家，重启保留记录且不泄露身份凭证',t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fatfish-store-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const store=new Leaderboard(dir),a=store.createPlayer(),b=store.createPlayer();store.rename(a.player,'同一个昵称');store.rename(b.player,'同一个昵称');store.upsert(a.player,100);store.upsert(a.player,20);store.upsert(b.player,80);
  const reloaded=new Leaderboard(dir);assert.equal(reloaded.player(a.token).best,100);assert.equal(reloaded.view(a.player).total,2);assert.equal(reloaded.view(a.player).entries[0].score,100);assert.ok(!JSON.stringify(reloaded.view(a.player)).includes('tokenHash'));assert.ok(!JSON.stringify(reloaded.view(a.player)).includes(a.token));
  assert.throws(()=>store.rename(a.player,'a'.repeat(13)),/昵称/);assert.throws(()=>store.decode(store.issue(a.player).run,b.player),/失效/);
});
test('HTTP完整对局：真实重放入榜、伪造分数不采信、低分不覆盖、重启和跨用户隔离',async t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fatfish-api-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));let server=createServer({dataDir:dir});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
  let base='http://127.0.0.1:'+server.address().port;
  const identity=await fetch(base+'/api/player');const cookie=identity.headers.get('set-cookie').split(';')[0];
  const post=async(url,body,extra={})=>fetch(base+'/api/'+url,{method:'POST',headers:{'Content-Type':'application/json','X-FatFish-Request':'1',Cookie:cookie,...extra},body:JSON.stringify(body)});
  const round=await(await post('runs',{})).json();const record=recording(round.seed);
  const renewed=await(await post('resume',{run:round.run})).json();assert.equal(renewed.seed,round.seed);assert.equal(renewed.rulesVersion,'0.6.6');
  const result=await(await post('score',{run:round.run,moves:record.moves,ticks:record.ticks,score:999999999})).json();assert.equal(result.me.score,record.score);assert.equal(result.entries.length,1);
  const otherIdentity=await fetch(base+'/api/player'),otherCookie=otherIdentity.headers.get('set-cookie').split(';')[0];
  assert.equal((await post('score',{run:round.run,moves:[],ticks:0},{Cookie:otherCookie})).status,400);
  assert.equal((await post('profile',{name:'跨站'},{Origin:'https://evil.example'})).status,403);
  assert.equal((await fetch(base+'/api/profile',{method:'POST',headers:{Cookie:cookie,'Content-Type':'application/json'},body:'{"name":"绕过"}'})).status,403);
  assert.equal((await fetch(base+'/runtime-data/leaderboard.ndjson')).status,404);
  await new Promise(r=>setTimeout(r,1550));const lower=await(await post('score',{run:round.run,moves:[],ticks:0})).json();assert.equal(lower.me.score,record.score);
  await new Promise(r=>server.close(r));server=createServer({dataDir:dir});await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;
  const restored=await(await fetch(base+'/api/leaderboard',{headers:{Cookie:cookie}})).json();assert.equal(restored.me.score,record.score);assert.equal(restored.total,1);
});

test('同一玩家可以续签存档凭证，无法借续签更换种子或身份',t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fatfish-renew-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const store=new Leaderboard(dir),a=store.createPlayer(),b=store.createPlayer();
  const expired=store.sign({seed:391,playerId:a.player.id,issued:Date.now()-3*86400000,version:'0.6.6'});assert.throws(()=>store.decode(expired,a.player),/失效/);const decoded=store.decode(expired,a.player,true);const renewed=store.issue(a.player,decoded.seed);assert.equal(renewed.seed,391);assert.equal(store.decode(renewed.run,a.player).seed,391);assert.throws(()=>store.decode(expired,b.player,true),/失效/);
});

test('中断写入只忽略末尾不完整记录，完整损坏记录会报错而不覆盖数据',t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fatfish-journal-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const store=new Leaderboard(dir),a=store.createPlayer();store.rename(a.player,'小鲸娘');store.upsert(a.player,512);
  fs.appendFileSync(store.file,'{"player":');const recovered=new Leaderboard(dir);assert.equal(recovered.player(a.token).best,512);recovered.upsert(recovered.player(a.token),1024);
  assert.equal(new Leaderboard(dir).player(a.token).best,1024);fs.appendFileSync(store.file,'bad data\n');assert.throws(()=>new Leaderboard(dir));assert.ok(fs.readFileSync(store.file,'utf8').endsWith('bad data\n'));
});
