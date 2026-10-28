'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Matter = require('../dist/vendor/matter.min.js');
const C = require('../dist/config.js');
const { Session, randomLevel } = require('../dist/engine.js');
const run = (session, ms) => { for (let t = 0; t < ms; t += 1000 / 60) session.step(1000 / 60); };
const value = session => Array.from(session.entities.values()).reduce((sum, b) => sum + 2 ** (b.plugin.whale.level - 1), 0);
function seeded(seed) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }

test('投放1—4级按50%、30%、15%、5%的边界和分布抽取', () => {
  assert.equal(C.levelOneProbability, 0.5);
  assert.equal(randomLevel(() => 0), 1);
  assert.equal(randomLevel(() => 0.499999), 1);
  assert.equal(randomLevel(() => 0.5), 2);
  assert.equal(randomLevel(() => 0.799999),2);assert.equal(randomLevel(() => 0.8),3);assert.equal(randomLevel(() => 0.949999),3);assert.equal(randomLevel(() => 0.95),4);assert.equal(randomLevel(() => 0.999999),4);
  const rng = seeded(20261025),counts=[0,0,0,0];
  for (let i = 0; i < 100000; i++) { const level = randomLevel(rng); assert.ok(level>=1&&level<=4);counts[level-1]++; }
  for(let i=0;i<4;i++)assert.ok(Math.abs(counts[i]/100000-C.spawnProbabilities[i])<.005);
});

test('投放后产生新的当前角色且冷却阻止连续重叠投放', () => {
  const session = new Session({ random: seeded(3) }); session.start();
  const current = session.currentLevel;
  const body = session.drop(0);
  assert.equal(body.plugin.whale.level, current);
  assert.ok(body.position.x >= C.wall + body.circleRadius);
  assert.ok([1, 2, 3, 4].includes(session.currentLevel)); assert.equal(session.drops, 1);
  assert.equal(session.drop(200), null);
  run(session, 650); assert.ok(session.drop(390)); assert.equal(session.drops, 2);
});

test('真实碰撞将两只1级合成一只2级并计分', () => {
  const events = []; const session = new Session({ onEvent: e => events.push(e.type) }); session.start();
  session.createEntity(1, 192, 580); session.createEntity(1, 228, 580);
  run(session, 700);
  assert.equal(session.entities.size, 1); assert.equal([...session.entities.values()][0].plugin.whale.level, 2);
  assert.equal(session.score, 4); assert.equal(session.merges, 1); assert.equal(value(session), 2);
  assert.equal(events.filter(type => type === 'merge').length, 1);
});

test('同时接触与连锁合成不会重复使用同一只角色', () => {
  const session = new Session(); session.start();
  for (const [x, y] of [[180, 552], [216, 552], [180, 588], [216, 588]]) session.createEntity(1, x, y);
  for (let i = 0; i < 180; i++) { session.step(1000 / 60); assert.equal(value(session), 4); }
  assert.ok(session.merges >= 2); assert.equal(value(session), 4);
  assert.ok(session.entities.size <= 2, '碰撞后允许回弹分开，但不能丢失或重复消耗角色');
  assert.ok([8, 16].includes(session.score));
});

test('不同等级接触不会合成', () => {
  const session = new Session(); session.start(); session.createEntity(1, 180, 570); session.createEntity(2, 222, 570);
  run(session, 900); assert.equal(session.entities.size, 2); assert.equal(session.score, 0);
});

test('两只第10级不会越界生成第11级', () => {
  const session = new Session(); session.start(); session.createEntity(10, 164, 460); session.createEntity(10, 256, 460);
  run(session, 900); assert.equal(session.entities.size, 2); assert.equal(session.merges, 0); assert.equal(value(session), 1024);
});

test('首次合成沧海女帝触发胜利，继续挑战后不会重复卡在胜利态', () => {
  const events = []; const session = new Session({ onEvent: e => events.push(e.type) }); session.start();
  session.createEntity(9, 150, 470); session.createEntity(9, 270, 470); run(session, 600);
  assert.equal(session.state, 'won'); assert.equal(events.filter(e => e === 'win').length, 1); assert.equal(session.score, 1024);
  assert.ok(session.resume()); session.createEntity(9, 150, 230); session.createEntity(9, 270, 230); run(session, 700);
  assert.equal(events.filter(e => e === 'win').length, 1); assert.equal(session.state, 'playing'); assert.equal(session.score, 2048);
});

test('新投放经过警戒线时不会立即失败', () => {
  const session = new Session({ random: () => 0 }); session.start(); session.drop(); run(session, 700);
  assert.equal(session.state, 'playing'); assert.equal(session.dangerRatio, 0);
});

test('触线只提醒且不按时间判负，低于阈值长期停留仍能投放，离线解除提醒',()=>{
 const session=new Session({random:()=>0});session.start();const r=C.levels[3].radius;
 const body=session.createEntity(4,90,C.dangerY+r,{hasLanded:true});Matter.Body.setStatic(body,true);
 session.checkOverflow();assert.equal(session.dangerActive,true);assert.equal(session.dangerRatio,0);assert.equal(session.state,'playing');
 run(session,6000);assert.equal(session.state,'playing');assert.ok(session.drop(320));
 Matter.Body.setPosition(body,{x:90,y:400});session.checkOverflow();assert.equal(session.dangerActive,false);
});

test('各尺寸球体超出高度三分之一才立即判负，精确边界仅提醒',()=>{
 assert.equal(C.overflowHeightFraction,1/3);
 for(const level of [1,4,7,10]){
  const events=[],session=new Session({onEvent:e=>events.push(e.type)});session.start();const r=C.levels[level-1].radius,limit=2*r/3;
  const body=session.createEntity(level,210,C.dangerY+r-limit+.1,{hasLanded:true});
  session.checkOverflow();assert.equal(session.dangerActive,true);assert.equal(session.state,'playing');
  Matter.Body.setPosition(body,{x:210,y:C.dangerY+r-limit});session.checkOverflow();assert.equal(session.state,'playing');
  Matter.Body.setPosition(body,{x:210,y:C.dangerY+r-limit-.1});session.checkOverflow();assert.equal(session.state,'gameover');assert.equal(events.filter(e=>e==='gameover').length,1);assert.equal(session.drop(),null);
 }
});

test('暂停不检查判负；恢复后越过空间阈值的球立即判负，无倒计时',()=>{
 const session=new Session();session.start();const r=C.levels[3].radius;
 const body=session.createEntity(4,90,C.dangerY+r,{hasLanded:true});Matter.Body.setStatic(body,true);session.checkOverflow();session.pause();
 Matter.Body.setPosition(body,{x:90,y:C.dangerY});const clock=session.clock;run(session,10000);assert.equal(session.state,'paused');assert.equal(session.clock,clock);
 session.resume();session.step(1000/60);assert.equal(session.state,'gameover');
});

test('重新开始清空旧物体、合成队列和对局分数', () => {
  const session = new Session(); session.start(); session.createEntity(1, 192, 580); session.createEntity(1, 228, 580); run(session, 300);
  assert.ok(session.score > 0); session.start(); assert.equal(session.score, 0); assert.equal(session.entities.size, 0); assert.equal(session.mergeQueue.length, 0);
  assert.equal(Matter.Composite.allBodies(session.engine.world).length, 3); assert.equal(session.state, 'playing');
});

test('正常下落在警戒线上方不误判，接触后运动中的球也按超出比例判负',()=>{
 const session=new Session();session.start();const body=session.createEntity(4,210,100);Matter.Body.setStatic(body,true);
 session.checkOverflow();assert.equal(session.state,'playing');assert.equal(session.dangerActive,false);
 body.plugin.whale.hasLanded=true;Matter.Body.setVelocity(body,{x:0,y:3});session.checkOverflow();assert.equal(session.state,'gameover');
});

test('暂停后返回首页会清空本局并回到待开始状态', () => {
  const session = new Session(); session.start(); session.drop(); run(session, 120); session.pause(); session.goHome();
  assert.equal(session.state, 'ready'); assert.equal(session.drops, 0); assert.equal(session.score, 0);
  assert.equal(session.entities.size, 0); assert.equal(session.canDrop(), false); assert.equal(session.drop(), null);
  assert.equal(Matter.Composite.allBodies(session.engine.world).length, 3);
  session.start(); assert.equal(session.state, 'playing'); assert.ok(session.drop());
});

test('落地有反弹和短暂挤压，随后回到圆形', () => {
  const session = new Session(); session.start(); const body = session.createEntity(4, 210, 180);
  let peak = 0; let bounced = false;
  for (let frame = 0; frame < 240; frame++) {
    session.step(1000 / 60);
    peak = Math.max(peak, body.plugin.whale.squash);
    if (body.position.y > 450 && body.velocity.y < -1) bounced = true;
  }
  assert.ok(bounced, '落地后应出现向上的回弹');
  assert.ok(peak > 0.025 && peak <= 0.145, '形变应可见且幅度受限');
  assert.ok(Math.abs(body.plugin.whale.squash) < 0.001, '静止后不应留下永久形变或间隙');
});

test('不同尺寸圆形落稳后保持贴合，碰撞边界和绘制半径一致', () => {
  const session = new Session(); session.start();
  session.engine.gravity.x = 1; session.engine.gravity.y = 0;
  const lower = session.createEntity(7, 300, 350);
  Matter.Body.setAngle(lower, 0); Matter.Body.setAngularVelocity(lower, 0);
  Matter.Body.setStatic(lower, true);
  const upper = session.createEntity(5, 90, 350);
  Matter.Body.setAngle(upper, 0); Matter.Body.setAngularVelocity(upper, 0);
  run(session, 6000);
  const distance = Math.hypot(lower.position.x - upper.position.x, lower.position.y - upper.position.y);
  const gap = distance - lower.circleRadius - upper.circleRadius;
  assert.ok(gap <= 0.6 && gap >= -1.5, '接触误差：' + gap);
  const floorSession = new Session(); floorSession.start();
  const grounded = floorSession.createEntity(7, 210, 250); run(floorSession, 4000);
  assert.ok(Math.abs(C.floorY - grounded.position.y - grounded.circleRadius) < 0.6);
});

test('十级尺寸逐级增加，高等级在相同海湾中有明显占位压力', () => {
  assert.equal(C.levels.length, 10);
  for (let i = 1; i < C.levels.length; i++) assert.ok(C.levels[i].radius > C.levels[i - 1].radius);
  assert.ok(C.levels[6].radius >= 80);
  assert.ok(C.levels[8].radius * 2 > (C.width - 2 * C.wall) * 0.60);
  assert.ok(C.levels[9].radius * 2 > (C.width - 2 * C.wall) * 0.65);
  assert.equal(C.levels[8].identity,'09_starsea');
  assert.equal(C.levels[9].name,'沧海女帝');
});

test('拥挤球堆稳定后大球不再持续震颤，受到新冲击仍可移动',()=>{
  const session=new Session({random:()=>0});session.start();session.checkOverflow=()=>{};
  for(const item of [[8,285,500],[6,140,580],[3,50,560],[1,390,590],[2,70,585],[4,65,425],[5,155,400],[2,245,320],[3,385,370],[1,230,290]])session.createEntity(...item);
  const ranges=new Map();
  for(let tick=0;tick<1200;tick++){
    session.step(1000/60);if(tick<900)continue;
    for(const body of session.entities.values())if(body.circleRadius>=C.levels[5].radius){
      const r=ranges.get(body.id)||{x0:body.position.x,x1:body.position.x,y0:body.position.y,y1:body.position.y};
      r.x0=Math.min(r.x0,body.position.x);r.x1=Math.max(r.x1,body.position.x);r.y0=Math.min(r.y0,body.position.y);r.y1=Math.max(r.y1,body.position.y);ranges.set(body.id,r);
    }
  }
  assert.ok(ranges.size>=2);
  for(const r of ranges.values()){assert.ok(r.x1-r.x0<.25,'横向静置抖动');assert.ok(r.y1-r.y0<.25,'纵向静置抖动');}
  const b=[...session.entities.values()].find(b=>b.plugin.whale.level===8),before={...b.position};
  Matter.Body.setVelocity(b,{x:-5,y:-8});run(session,350);
  assert.ok(Math.hypot(b.position.x-before.x,b.position.y-before.y)>1,'稳定并不锁住球体，冲击仍能引起位移');
});

test('低等级尺寸保持，高等级适量缩小，释放空间但仍保持逐级增长',()=>{
 assert.deepEqual(C.levels.slice(0,4).map(x=>x.radius),[20,27,35,45]);
 const previous=[58,73,90,109,130,147];
 for(let i=0;i<previous.length;i++){
  const ratio=C.levels[i+4].radius/previous[i],area=1-ratio*ratio;
  assert.ok(ratio>=.92&&ratio<=.955,'半径缩小约5%—8%');assert.ok(area>=.085&&area<=.16,'占位面积适量降低');
 }
});

test('合成继承接触前的移动和旋转，不把下落速度重置成常量', () => {
  const session = new Session(); session.start(); session.engine.gravity.y = 0;
  const a = session.createEntity(2, 165, 300); const b = session.createEntity(2, 220, 300);
  Matter.Body.setVelocity(a, { x: 4, y: 5 }); Matter.Body.setVelocity(b, { x: 1, y: 3 });
  Matter.Body.setAngularVelocity(a, 0.04); Matter.Body.setAngularVelocity(b, 0.02);
  let merged;
  session.onEvent = event => { if (event.type === 'merge') merged = event.body; };
  for (let tick = 0; tick < 60 && !merged; tick++) session.step(1000 / 60);
  assert.ok(merged); assert.ok(merged.velocity.x > 2); assert.ok(merged.velocity.y > 1);
  assert.ok(merged.angularVelocity > 0.02); assert.ok(Number.isFinite(merged.inertia));
});

test('合成后的形变连续衰减并回弹，不会生成新角色后突然清零', () => {
  const session = new Session(); session.start(); session.engine.gravity.y = 0;
  const a = session.createEntity(1, 195, 300); const b = session.createEntity(1, 225, 300);
  a.plugin.whale.squash = b.plugin.whale.squash = 0.045;
  let merged; session.onEvent = event => { if (event.type === 'merge') merged = event.body; };
  session.step(1000 / 60); assert.ok(merged); assert.ok(merged.plugin.whale.squash > 0.045);
  let peak = 0; let trough = 0; let after200ms = 0;
  for (let tick = 0; tick < 120; tick++) {
    session.step(1000 / 60);
    peak = Math.max(peak, merged.plugin.whale.squash); trough = Math.min(trough, merged.plugin.whale.squash);
    if (tick === 11) after200ms = Math.abs(merged.plugin.whale.squash);
  }
  assert.ok(peak > 0.06); assert.ok(trough < -0.003, '需要经过回弹阶段');
  assert.ok(after200ms > 0.01, '合成后应持续可见一段时间');
  assert.ok(Math.abs(merged.plugin.whale.squash) < 0.001, '最终仍应稳定下来');
});

test('大角色落在单个小角色上会失稳滚落，不能形成悬空塔', () => {
  for (const offset of [0, -1, 1]) {
    const session = new Session(); session.start();
    session.createEntity(1, 210, C.floorY - C.levels[0].radius);
    const upper = session.createEntity(7, 210 + offset, 310);
    run(session, 4000);
    assert.ok(Number.isFinite(upper.inertia));
    assert.ok(upper.position.y > C.floorY - upper.circleRadius - 3, '大角色应滚落至地面');
    assert.ok(Math.abs(upper.position.x - (210 + offset)) > 8, '应出现自然侧向位移');
  }
});

test('回弹后再次接触仍能继续连锁合成', () => {
  const session = new Session(); session.start();
  session.createEntity(1, 195, 560); session.createEntity(1, 225, 560); session.createEntity(2, 210, 520);
  run(session, 1800);
  assert.equal(value(session), 4); assert.equal(session.entities.size, 1);
  assert.equal([...session.entities.values()][0].plugin.whale.level, 3); assert.equal(session.score, 12);
});

test('支撑球合成后，原本休眠的角色不再悬空', () => {
  const session = new Session(); session.start();
  session.createEntity(4, 100, 565); session.createEntity(4, 180, 565);
  const sleeper = session.createEntity(1, 40, 540); Matter.Sleeping.set(sleeper, true);
  run(session, 4000);
  assert.ok(session.merges >= 1); assert.equal(sleeper.isSleeping, false);
  assert.ok(sleeper.position.y > 580, '失去支撑后必须继续受到重力作用');
});

test('拥挤和连续合成不能把可见圆挤出侧壁或地面', () => {
  const session = new Session(); session.start();
  for (const [level,x,y] of [[6,45,580],[6,155,580],[7,285,590],[3,405,590],[4,210,680]]) session.createEntity(level,x,y);
  const units = value(session);
  for (let frame = 0; frame < 180; frame++) {
    session.step(1000 / 60); assert.equal(value(session), units);
    for (const body of session.entities.values()) {
      assert.ok(body.position.x-body.circleRadius >= C.wall-0.41);
      assert.ok(body.position.x+body.circleRadius <= C.width-C.wall+0.41);
      assert.ok(body.position.y+body.circleRadius <= C.floorY+0.41);
    }
  }
});

test('一次投放的连锁合成计数沿合成结果传递', () => {
  const session = new Session(); const merges = []; session.start();
  session.onEvent = event => { if(event.type==='merge') merges.push({turnId:event.turnId,count:event.comboCount}); };
  session.createEntity(1,195,560,{turnId:1});session.createEntity(1,225,560,{turnId:1});session.createEntity(2,210,520);
  run(session,1800);
  assert.deepEqual(merges,[{turnId:1,count:1},{turnId:1,count:2}]);
  session.start(); assert.equal(session.turnMerges.size,0);
});

test('两次独立投放的合成不能相加成一次连锁', () => {
  const session = new Session(); const merges = []; session.start();
  session.onEvent = event => { if(event.type==='merge') merges.push({turnId:event.turnId,count:event.comboCount}); };
  session.createEntity(1,85,570,{turnId:1});session.createEntity(1,115,570,{turnId:1});
  session.createEntity(1,305,570,{turnId:2});session.createEntity(1,335,570,{turnId:2});
  run(session,700);
  assert.deepEqual(merges,[{turnId:1,count:1},{turnId:2,count:1}]);
});

test('极端挤压、合成增大与角落受困时实际圆不能互相穿透',()=>{
  for(const layout of [
    [[8,285,500],[6,140,580],[3,50,560],[1,390,590],[2,70,585],[4,65,425],[5,155,400],[2,245,320],[3,385,370],[1,230,290]],
    [[6,45,580],[6,155,580],[7,285,590],[3,405,590],[4,210,680]],
    [[9,134,480],[9,286,480]],
    Array.from({length:36},(_,i)=>[1+i%7,30+i%6*65,590-Math.floor(i/6)*65])
  ]){
    const session=new Session();session.start();for(const [level,x,y] of layout)session.createEntity(level,x,y);
    let worst=0;
    for(let tick=0;tick<240;tick++){
      session.step(1000/60);const bodies=[...session.entities.values()];
      for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){const a=bodies[i],b=bodies[j];worst=Math.max(worst,a.circleRadius+b.circleRadius-Math.hypot(a.position.x-b.position.x,a.position.y-b.position.y));}
      for(const b of bodies){assert.ok(b.position.x-b.circleRadius>=C.wall-.03);assert.ok(b.position.x+b.circleRadius<=C.width-C.wall+.03);assert.ok(b.position.y+b.circleRadius<=C.floorY+.03);}
    }
    assert.ok(worst<.45,'最大圆形穿透 '+worst.toFixed(3)+' px');
  }
});
