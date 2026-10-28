(function () {
  'use strict';
  const C = window.FatFishConfig;
  const { Session } = window.FatFishEngine;
  const { CheerDirector, HomeTaps } = window.FatFishCompanion;
  const $ = id => document.getElementById(id);
  const canvas = $('gameCanvas'), ctx = canvas.getContext('2d');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const qaMode = new URLSearchParams(location.search).has('qa');
  const qaPersistent=qaMode&&new URLSearchParams(location.search).get('persist')==='1';
  const qaStorage=new Map();
  const storage = {
    get(key, fallback) { if (qaMode&&!qaPersistent) return qaStorage.has(key)?qaStorage.get(key):fallback; try { const value = localStorage.getItem(qaPersistent?'fatfish.qa.persist.'+key:key); return value === null ? fallback : value; } catch (_) { return fallback; } },
    set(key, value) { if (qaMode&&!qaPersistent) {qaStorage.set(key,String(value));return;} try { localStorage.setItem(qaPersistent?'fatfish.qa.persist.'+key:key, String(value)); } catch (_) {} }
  };
  const keys = { best: 'fatfish.v1.best', sound: 'fatfish.v1.sound' };
  const progress = new window.FatFishProgress.Progress(storage), MAX_LEVEL = C.levels.length;
  const unlocks=new window.FatFishUnlocks.UnlockQueue(MAX_LEVEL,{storage,identity:level=>C.levels[level-1].identity,known:progress.levels()}),homeDialogue=new window.FatFishHomeDialogue.HomeDialogue();
  const cheer = new CheerDirector(), homeTaps = new HomeTaps();
  const images = new Map(), sprites = new Map(), newlyFound = new Set();
  let best = Math.max(0, Number(storage.get(keys.best, 0)) || 0), soundEnabled = storage.get(keys.sound, '1') !== '0';
  const sound = new window.FatFishAudio.Sound(soundEnabled);
  const savedRound = new window.FatFishSavedRound.SavedRound(storage);
  const voice = new window.FatFishVoice.Voice(soundEnabled,{onStatus:(status,clip)=>{canvas.dataset.voiceStatus=status;canvas.dataset.voiceClip=clip;}});
  let activeRun = null, roundTrace = null, starting = false, parkedRound = null;
  let loaded = false, loadFailed = false, galleryLevel = 1, activePointer = null;
  let particles = [], floatingScores = [], shakeUntil = 0, toastTimer, buddyTimer, homeTimer;
  let session = new Session({ onEvent: onGameEvent });
  let unlockPhase='idle',unlockSerial=0,unlockFallback,unlockHide;
  const roundKey = record => JSON.stringify([record.seed,record.ticks,record.moves]);
  function ensureAudio(){ sound.unlock(); }
  function saveRound(){if(qaMode||!activeRun)return;window.FatFishLeaderboard.save({run:activeRun.run,moves:activeRun.moves,ticks:Math.round(session.clock/(1000/60))});}
  function say(kind,options){const played=voice.play(kind,options);if(played)sound.stop();return played;}
  function storeCurrentRound(){
    if(!roundTrace||!['playing','paused','won'].includes(session.state))throw Error('当前没有可以保存的对局');
    savedRound.save({version:C.rulesVersion,seed:roundTrace.seed,moves:roundTrace.moves,run:roundTrace.run||null,ticks:Math.round(session.clock/(1000/60)),aimX:session.aimX,state:session.state,score:session.score,currentLevel:session.currentLevel});
  }
  function homeFeedback(text,clip){clearTimeout(homeTimer);$('homeSpeech').textContent=text;$('homeSprite').dataset.pose='playful';say(clip);homeTimer=setTimeout(()=>{if(session.state==='ready'){$('homeSpeech').textContent='今天也想和你一起玩～';$('homeSprite').dataset.pose='idle';}},3600);}
  async function continueSavedRound(){
    if(!loaded||starting)return;ensureAudio();const record=savedRound.load();
    if(!record){const outcome=savedRound.outcome,failed=outcome==='failed';homeFeedback(outcome==='outdated'?'海湾规则更新啦，旧对局需要重新开始哦～':failed?'上局已经结束啦，我们再来一局吧～':'还没有上一局呢，来玩一局吧～',failed?'failedSave':'noSave');return;}
    starting=true;$('startButton').disabled=$('continueButton').disabled=true;
    try{
      const warm=parkedRound&&parkedRound.key===roundKey(record)?parkedRound:null;
      const task=warm?{session:warm.session,encountered:[],done:true}:window.FatFishReplay.createReplay(record.seed,record.moves,record.ticks);
      while(!task.done){
        const until=performance.now()+12;let state;
        do{state=task.advance(32);}while(!state.done&&performance.now()<until);
        $('homeSpeech').textContent='正在恢复上次的球堆… '+Math.round(state.tick/Math.max(1,record.ticks)*100)+'%';
        if(!state.done)await new Promise(requestAnimationFrame);
      }
      if(task.session.state==='gameover'||task.session.score!==record.score||task.session.currentLevel!==record.currentLevel)throw Error('对局记录不完整，暂时无法继续');
      session=task.session;session.onEvent=onGameEvent;session.state='playing';session.setAim(record.aimX);roundTrace=warm?warm.trace:{seed:record.seed,moves:record.moves.map(move=>move.slice()),run:record.run};
      activeRun=warm?warm.activeRun:null;parkedRound=null;for(const level of task.encountered)progress.reveal(level);cheer.reset();particles=[];floatingScores=[];hideOverlay();showScreen(false);setBuddy('playful','回来啦，刚才的旅程还在等你～','idle');updateUI();say('welcome');canvas.focus({preventScroll:true});
      // Network renewal is independent of restoring the board. A slow or offline
      // leaderboard must not leave the player waiting on the home screen.
      if(!warm&&record.run&&!qaMode){const trace=roundTrace;window.FatFishLeaderboard.resumeRound(record.run).then(renewed=>{if(roundTrace===trace&&renewed){trace.run=renewed.run;activeRun={run:renewed.run,moves:trace.moves};}});}
    }catch(error){homeFeedback(error.message,'noSave');}
    finally{starting=false;$('startButton').disabled=$('continueButton').disabled=false;$('continueButtonText').textContent='继续上一局';}
  }
  function toast(message) {
    clearTimeout(toastTimer);
    $('boardToast').textContent = message;
    $('boardToast').classList.add('visible');
    toastTimer = setTimeout(() => $('boardToast').classList.remove('visible'), 1900);
    $('liveAnnouncement').textContent = message;
  }

  function createSprite(level) {
    const def = C.levels[level - 1];
    const image = images.get(level);
    const size = 512;
    const output = document.createElement('canvas');
    output.width = output.height = size;
    const s = output.getContext('2d');
    s.save(); s.beginPath(); s.arc(256, 256, 256, 0, Math.PI * 2); s.clip();
    const gradient = s.createLinearGradient(70, 20, 420, 495);
    gradient.addColorStop(0, '#ffffff'); gradient.addColorStop(0.4, def.pale); gradient.addColorStop(1, def.color);
    s.fillStyle = gradient; s.fillRect(0, 0, 512, 512);
    const side = Math.min(image.width * def.portrait[2], image.height);
    const sx = Math.max(0, Math.min(image.width - side, image.width * def.portrait[0] - side / 2));
    const sy = Math.max(0, Math.min(image.height - side, image.height * def.portrait[1] - side / 2));
    s.drawImage(image, sx, sy, side, side, 0, 0, 512, 512);
    const bottom = s.createLinearGradient(0, 390, 0, 490);
    bottom.addColorStop(0, 'rgba(25,61,68,0)'); bottom.addColorStop(1, 'rgba(25,61,68,.18)');
    s.fillStyle = bottom; s.fillRect(0, 350, 512, 162); 
    s.beginPath(); s.arc(256, 256, 253, 0, Math.PI * 2); s.strokeStyle = 'rgba(255,255,255,.9)'; s.lineWidth = 5; s.stroke();
    s.beginPath(); s.arc(215, 211, 210, Math.PI * 1.08, Math.PI * 1.54); s.strokeStyle = 'rgba(255,255,255,.55)'; s.lineWidth = 5; s.lineCap = 'round'; s.stroke();
    s.restore();
    return output;
  }

  function drawSmall(target, level) {
    if (!target || !sprites.has(level)) return;
    const s = target.getContext('2d');
    s.clearRect(0, 0, target.width, target.height);
    s.drawImage(sprites.get(level), 0, 0, target.width, target.height);
  }


  function updateResumeStatus(){
    const record=savedRound.load(),status=record?Math.max(0,Number(record.score)||0).toLocaleString('zh-CN')+' 分 · 已保存':({failed:'上局已结束',outdated:'规则已更新'})[savedRound.outcome]||'暂无存档';
    $('continueStatus').textContent=status;$('continueButton').setAttribute('aria-description',status);
  }
  function showScreen(home) {
    $('homeScreen').hidden = !home; $('playScreen').hidden = home;
    $('appShell').dataset.screen = home ? 'home' : 'play';
    clearTimeout(homeTimer); homeTaps.reset(); $('homeSprite').dataset.pose = 'idle'; $('homeMascot').dataset.mood = 'idle';
    $('homeSpeech').textContent = '今天也想和你一起玩～';
    if(home)updateResumeStatus();
  }
  function updateCollection(){ $('discoveryCount').textContent=progress.count+' / '+MAX_LEVEL; }
  function updateUI() {
    $('scoreValue').textContent = session.score.toLocaleString('zh-CN');
    $('bestValue').textContent = $('homeBestValue').textContent = best.toLocaleString('zh-CN');
    $('roundStatus').textContent = ({ready:'准备出发',playing:'海湾合成中',paused:'休息片刻',gameover:'本局已结束',won:'新旅程达成'})[session.state];
    $('pauseButton').disabled = !loaded || !['playing','paused'].includes(session.state);
    $('pauseButton').setAttribute('aria-label', session.state === 'paused' ? '继续游戏' : '暂停游戏');
    $('restartButton').disabled = !loaded;
    Object.assign(canvas.dataset, {state:session.state,score:String(session.score),drops:String(session.drops),merges:String(session.merges),highestLevel:String(session.highestLevel),currentLevel:String(session.currentLevel),discoveredCount:String(progress.count),bodyCount:String(session.entities.size),canDrop:String(session.canDrop())});
    canvas.setAttribute('aria-description','当前得分'+session.score+'，已经投放'+session.drops+'次，合成'+session.merges+'次。');
    updateCollection();
  }
  function hideOverlay() { $('boardOverlay').classList.add('is-hidden'); }
  function showOverlay(options) {
    $('boardOverlay').classList.remove('is-hidden');
    $('pauseSoundButton').hidden=$('saveRoundButton').hidden=session.state!=='paused';
    $('overlayKicker').textContent=options.kicker; $('overlayTitle').textContent=options.title; $('overlayText').textContent=options.text;
    $('primaryButtonText').textContent=options.primary; $('secondaryButton').hidden=!options.secondary; $('secondaryButton').textContent=options.secondary||'';
    $('welcomeFootnote').textContent=options.footnote||''; drawSmall($('welcomeCanvas'),session.highestLevel);
    $('resultStats').hidden=!options.stats;
    $('resultStats').replaceChildren();
    if(options.stats) for(const [name,value] of [['本局得分',session.score],['投放次数',session.drops],['合成次数',session.merges]]){
      const cell=document.createElement('div'),strong=document.createElement('strong'),label=document.createElement('span');strong.textContent=value;label.textContent=name;cell.append(strong,label);$('resultStats').append(cell);
    }
  }
  function setBuddy(pose,text,kind,duration) {
    clearTimeout(buddyTimer); $('buddySprite').dataset.pose=pose; $('buddySpeech').textContent=text; $('companion').dataset.reaction=kind||'idle';
    $('buddySprite').getAnimations().forEach(animation=>{if(!('animationName' in animation))animation.cancel();});
    if(!reducedMotion && pose==='cheer'){
      $('buddySprite').animate([{transform:'translateY(0) rotate(0)'},{transform:'translateY(-10px) rotate(-7deg)',offset:.28},{transform:'translateY(-2px) rotate(6deg)',offset:.64},{transform:'translateY(0) rotate(0)'}],{duration:650,iterations:3,easing:'ease-in-out'});
    }
    if(duration) buddyTimer=setTimeout(()=>{if(session.state==='playing')setBuddy('idle','放心投吧，我会为你加油～','idle');},duration);
  }
  function onGameEvent(event) {
    if(event.type==='impact')return;
    if(event.type==='start'||event.type==='home'){
      resetUnlocks();activePointer=null;particles=[];floatingScores=[];newlyFound.clear();cheer.reset();clearTimeout(toastTimer);$('boardToast').classList.remove('visible');hideOverlay();
      showScreen(event.type==='home');
      if(event.type==='start'){progress.reveal(session.currentLevel);setBuddy('idle','准备好啦？我来给你加油～','idle');}
    }else if(event.type==='encounter'){
      const firstDiscovery=progress.reveal(event.level);
      if(firstDiscovery&&event.source==='merge')newlyFound.add(event.level);
      unlocks.offer(event.level,firstDiscovery,event.source);
    }else if(event.type==='drop'){
      progress.reveal(session.currentLevel);if(!voice.speaking)sound.play('drop',event.level);
      if(roundTrace)roundTrace.moves.push([Math.round(session.clock/(1000/60)),event.body.position.x]);
    }else if(event.type==='merge'){
      if(session.score>best){best=session.score;storage.set(keys.best,best);}
      addMergeEffects(event);
      if(session.merges%8===0)saveRound();
      const message=cheer.merge({turnId:event.turnId,comboCount:event.comboCount,newForm:newlyFound.has(event.level),totalMerges:session.merges},performance.now());
      newlyFound.delete(event.level);
      if(message){setBuddy(message.pose,message.text,message.kind,message.duration);if(!unlocks.pending.includes(event.level))say(message.kind);canvas.dataset.lastCheerSound=message.kind;}
      else if(!voice.speaking)sound.play('merge',event.level);
      $('liveAnnouncement').textContent='合成了'+C.levels[event.level-1].name+'，增加'+event.points+'分。';
    }else if(event.type==='pause'){
      saveRound();voice.stop();
      setBuddy('idle','歇一歇，我等你回来～','idle');
      showOverlay({kicker:'海潮也需要歇一歇',title:'好好休息，再出发',text:event.reason,primary:'继续合成',secondary:'重新开始',footnote:'休息时，海湾里的时间也会暂停。'});
    }else if(event.type==='resume'){hideOverlay();setBuddy('idle','回来啦，我们继续～','idle');}
    else if(event.type==='gameover'){
      savedRound.clear('failed');saveRound();voice.stop();
      setBuddy('shy','没关系，下一局我也陪着你。','comfort');
      showOverlay({kicker:'每一次相遇，都算数',title:'上下文溢出，下局再见',text:'这次最高发现了「'+C.levels[session.highestLevel-1].name+'」。',primary:'再来一局',secondary:'回主页看图鉴',stats:true,footnote:'发现记录和最高分已经保留。'});
      sound.play('end');
    }else if(event.type==='win'){
      saveRound();
      setBuddy('cheer','最终形态出现啦！你超棒！','combo');
      showOverlay({kicker:'鲸娘的终极进化',title:'恭喜，唤醒'+C.levels[MAX_LEVEL-1].name+'！',text:'小小的相遇，终于汇成一片海。',primary:'继续挑战高分',secondary:'重新开始',stats:true});
      if(!unlocks.pending.includes(MAX_LEVEL))say('win');
    }
    updateUI();
  }
  function openDialog(dialog){
    if(dialog.open)return;dialog.dataset.resumeOnClose=session.state==='playing'?'1':'0';
    if(session.state==='playing')session.pause('慢慢看，随时可以回来继续。');dialog.showModal();
  }
  function openGallery(){if(session.state!=='ready')return;galleryLevel=1;renderGallery();openDialog($('galleryDialog'));}
  function renderGallery(){
    const def=C.levels[galleryLevel-1],card=window.FatFishTarot[galleryLevel-1];
    $('galleryImage').src=def.asset;$('galleryImage').alt=def.name+'完整立绘';$('tarotFront').style.backgroundImage='url("'+card.background+'")';
    $('galleryCard').setAttribute('aria-label',def.name+'角色立绘卡');
    $('tarotArcana').textContent=card.title;$('tarotName').textContent=def.name;$('tarotSubtitle').textContent=card.subtitle;
    $('galleryTitle').textContent=def.name;$('galleryRank').textContent=card.title+' · '+card.sceneName;
    $('galleryDescription').textContent=def.description;
    $('tarotBlessing').textContent=card.blessing;
    $('tarotBlessing').hidden=$('portraitButton').hidden=false;
    $('galleryRule').textContent='已发现 '+progress.count+' / '+MAX_LEVEL+'。未相遇的鲸娘，留在旅途中亲手发现。';
    const known=progress.levels();$('galleryIndex').textContent=(known.indexOf(galleryLevel)+1)+' / '+known.length+' 张已发现';$('galleryPrev').disabled=$('galleryNext').disabled=known.length<2;
  }
  function resetUnlocks(){
    unlockSerial++;clearTimeout(unlockFallback);clearTimeout(unlockHide);unlockPhase='idle';unlocks.reset();
    $('unlockNotice').hidden=true;$('unlockNotice').classList.remove('is-leaving');$('companion').dataset.unlocking='false';
  }
  function dismissUnlock(){
    if(unlocks.active===null||unlockPhase==='leaving')return;
    if(unlockPhase!=='revealed')return;
    clearTimeout(unlockFallback);unlockPhase='leaving';$('unlockNotice').classList.add('is-leaving');
    unlockHide=setTimeout(()=>{unlocks.finish();unlockPhase='idle';$('unlockNotice').hidden=true;$('unlockNotice').classList.remove('is-leaving');$('companion').dataset.unlocking='false';},260);
  }
  function finishUnlock(){
    if(unlocks.active===null||unlockPhase==='revealed')return;
    clearTimeout(unlockFallback);unlockPhase='revealed';const def=C.levels[unlocks.active-1];
    $('unlockInner').classList.remove('is-spinning');$('unlockInner').classList.add('is-unlocked');
    $('unlockTitle').textContent='成功解锁 · '+def.name;
    $('unlockClose').disabled=false;$('unlockClose').textContent='收下这份礼遇';
    $('liveAnnouncement').textContent='成功解锁'+def.name+'，已经收入人物图鉴。';
    if(!say(unlocks.active===MAX_LEVEL?'win':'discover')&&!voice.speaking)sound.play('discover',unlocks.active);
    // The player keeps the reveal open as long as they like; the board keeps
    // simulating, and only the card itself intercepts pointer input.
  }
  function processUnlocks(){
    if(unlocks.active!==null||!unlocks.waiting||session.state==='ready'||document.querySelector('dialog[open]'))return;
    const level=unlocks.next(),def=C.levels[level-1],card=window.FatFishTarot[level-1],ticket=++unlockSerial;
    unlockPhase='loading';clearTimeout(unlockFallback);
    $('unlockClose').disabled=true;$('unlockClose').textContent='新的相遇即将揭晓…';
    $('unlockInner').classList.remove('is-spinning','is-unlocked');
    $('unlockImage').src=def.asset;$('unlockImage').alt=def.name;
    $('unlockFront').style.backgroundImage='url("'+card.background+'")';$('unlockArcana').textContent=card.title;
    $('unlockName').textContent=def.name;$('unlockSubtitle').textContent=card.subtitle;
    $('unlockTitle').textContent='遇见新的鲸娘';
    $('unlockNotice').hidden=false;$('unlockNotice').dataset.level=String(level);
    // Load the scene before spinning, so the first reveal is never a blank face.
    const scene=new Image();const begin=()=>{
      if(ticket!==unlockSerial||$('unlockNotice').hidden||unlockPhase!=='loading')return;
      if(reducedMotion){finishUnlock();return;}
      unlockPhase='spinning';$('unlockInner').classList.add('is-spinning');
      clearTimeout(unlockFallback);unlockFallback=setTimeout(finishUnlock,2500);
    };
    scene.onload=scene.onerror=begin;scene.src=card.background;
    unlockFallback=setTimeout(begin,2500);
  }
  function addMergeEffects(event) {
    const now = performance.now(); const color = C.levels[event.level - 1].color;
    const count = reducedMotion ? 3 : 14;
    for (let i = 0; i < count; i++) {
      const angle = Math.PI * 2 * i / count; const speed = 25 + Math.random() * 35;
      particles.push({ x: event.x, y: event.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 18, color, born: now, duration: 600 + Math.random() * 250, size: 1.4 + Math.random() * 2.2 });
    }
    particles = particles.slice(-120); floatingScores.push({ x: event.x, y: event.y, text: '+' + event.points, born: now });
    if (!reducedMotion && event.level >= 5) shakeUntil = now + 160;
  }

  function drawBackground(now) {
    const time = reducedMotion ? 0 : now / 1000;
    const gradient = ctx.createLinearGradient(0, 0, 0, C.height);
    gradient.addColorStop(0, '#eaf6ed'); gradient.addColorStop(0.45, '#d6efe5'); gradient.addColorStop(1, '#9dcac4');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, C.width, C.height);
    ctx.save();
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(40 + i * 88, 0); ctx.lineTo(100 + i * 104, 0); ctx.lineTo(30 + i * 118, 640); ctx.lineTo(-60 + i * 115, 640); ctx.closePath();
      ctx.fillStyle = 'rgba(255,255,255,' + (0.035 + i * 0.008) + ')'; ctx.fill();
    }
    for (let layer = 0; layer < 3; layer++) {
      const y = 400 + layer * 74; ctx.beginPath(); ctx.moveTo(0, C.height);
      for (let x = 0; x <= C.width; x += 7) ctx.lineTo(x, y + Math.sin(x / 85 + time * 0.22 + layer * 2) * 16);
      ctx.lineTo(C.width, C.height); ctx.closePath(); ctx.fillStyle = ['rgba(108,177,164,.04)', 'rgba(92,164,155,.045)', 'rgba(84,151,146,.055)'][layer]; ctx.fill();
    }
    for (let i = 0; i < 15; i++) {
      const y = C.height - ((i * 53 + time * (6 + i % 4)) % (C.height + 50));
      const x = 25 + ((i * 71) % 370) + Math.sin(time * 0.3 + i) * 4;
      ctx.beginPath(); ctx.arc(x, y, 2 + i % 4, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255,255,255,.38)'; ctx.lineWidth = 0.7; ctx.stroke();
    }
    const floor = ctx.createLinearGradient(0, C.floorY - 7, 0, C.height); floor.addColorStop(0, 'rgba(221,226,199,.25)'); floor.addColorStop(1, '#cbd9bd');
    ctx.fillStyle = floor; ctx.beginPath(); ctx.moveTo(0, C.floorY + 2); ctx.bezierCurveTo(130, C.floorY - 8, 260, C.floorY + 6, 420, C.floorY); ctx.lineTo(420, 640); ctx.lineTo(0, 640); ctx.fill();
    for (const [x, height, direction] of [[28, 33, -1], [36, 23, 1], [389, 29, 1], [377, 20, -1]]) {
      ctx.beginPath(); ctx.moveTo(x, 622); ctx.bezierCurveTo(x + direction * 15, 612, x - direction * 10, 615 - height, x + direction * 6, 622 - height);
      ctx.strokeStyle = 'rgba(116,162,139,.35)'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.stroke();
    }
    ctx.restore();
  }

  function drawBoard(now) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.round(C.width * dpr), height = Math.round(C.height * dpr);
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, C.width, C.height);
    ctx.save();
    if (now < shakeUntil) ctx.translate(Math.sin(now * 0.13) * 1.3, Math.cos(now * 0.1) * 0.7);
    drawBackground(now);
    const danger = session.dangerRatio;
    ctx.save(); ctx.setLineDash([4, 6]); ctx.strokeStyle = danger > 0 ? 'rgba(186,107,85,' + (0.35 + danger * 0.5) + ')' : 'rgba(100,153,137,.2)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(24, C.dangerY); ctx.lineTo(C.width - 24, C.dangerY); ctx.stroke(); ctx.restore();
    ctx.font = '9px "Microsoft YaHei",sans-serif'; ctx.textAlign = 'right'; ctx.fillStyle = danger > 0 ? '#b27662' : '#9bb8a7'; ctx.fillText('警戒线', C.width - 25, C.dangerY - 7);
    if (loaded && session.state === 'playing') {
      const radius = C.levels[session.currentLevel - 1].radius;
      const ready = session.canDrop();
      ctx.save(); ctx.globalAlpha = ready ? 0.95 : 0.42;
      const bob = reducedMotion ? 0 : Math.sin(now / 330) * 1.2;
      ctx.drawImage(sprites.get(session.currentLevel), session.aimX - radius, C.spawnY - radius + bob, radius * 2, radius * 2);
      ctx.font = '8px "Microsoft YaHei",sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#8ea995'; ctx.fillText('本次', session.aimX, C.spawnY - radius - 9); ctx.restore();
    }
    if (loaded) {
      for (const body of session.entities.values()) {
        const data = body.plugin.whale;
        const radius = body.circleRadius;
        const squash = reducedMotion ? 0 : data.squash;
        // Keep the elastic outline inside its solved collision disk: a crowded
        // pile must never paint over neighbours or beyond a wall during a bounce.
        const major = Math.max(1+squash,1/(1+squash));
        ctx.save(); ctx.translate(body.position.x,body.position.y);
        ctx.rotate(data.squashAngle); ctx.scale((1+squash)/major,1/(1+squash)/major); ctx.rotate(-data.squashAngle);
        ctx.drawImage(sprites.get(data.level), -radius, -radius, radius * 2, radius * 2);
        ctx.restore();
      }
    }
    particles = particles.filter(p => now - p.born < p.duration);
    for (const p of particles) {
      const age = (now - p.born) / 1000; const fraction = (now - p.born) / p.duration;
      ctx.globalAlpha = (1 - fraction) * 0.8; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x + p.vx * age, p.y + p.vy * age + 26 * age * age, p.size * (1 - fraction * 0.5), 0, Math.PI * 2); ctx.fill();
    }
    floatingScores = floatingScores.filter(p => now - p.born < 950);
    ctx.textAlign = 'center'; ctx.font = '600 15px system-ui';
    for (const p of floatingScores) { const fraction = (now - p.born) / 950; ctx.globalAlpha = 1 - fraction; ctx.fillStyle = '#4d887d'; ctx.strokeStyle = '#f9fff2d9'; ctx.lineWidth = 3; const y = p.y - 22 - fraction * 32; ctx.strokeText(p.text, p.x, y); ctx.fillText(p.text, p.x, y); }
    ctx.globalAlpha = 1; ctx.restore();
    $('boardFrame').classList.toggle('danger', session.dangerActive);
    $('dangerMessage').hidden = !session.dangerActive || session.state !== 'playing';
    $('dangerMessage').textContent='有鲸娘碰到警戒线啦，试着合成腾出空间';
    canvas.dataset.danger=String(session.dangerActive);
    canvas.dataset.bodyCount = String(session.entities.size);
    canvas.dataset.canDrop = String(session.canDrop());
  }


  function aimFromEvent(event){const rect=canvas.getBoundingClientRect();session.setAim((event.clientX-rect.left)*C.width/rect.width);}
  canvas.addEventListener('pointerdown',event=>{if(session.state!=='playing'||!event.isPrimary||event.button!==0)return;event.preventDefault();ensureAudio();canvas.focus({preventScroll:true});activePointer=event.pointerId;canvas.setPointerCapture(event.pointerId);aimFromEvent(event);});
  canvas.addEventListener('pointermove',event=>{if(session.state==='playing'&&(activePointer===null||activePointer===event.pointerId))aimFromEvent(event);});
  canvas.addEventListener('pointerup',event=>{if(activePointer!==event.pointerId)return;aimFromEvent(event);session.drop();activePointer=null;if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);});
  canvas.addEventListener('pointercancel',()=>{activePointer=null;});canvas.addEventListener('contextmenu',event=>event.preventDefault());
  async function start(){
    if(loadFailed){location.reload();return;}if(!loaded||starting)return;
    saveRound();if(session.state==='playing')session.pause();starting=true;$('startButton').disabled=$('continueButton').disabled=true;ensureAudio();voice.stop();
    const run=qaMode?null:await window.FatFishLeaderboard.startRound();const seed=run?run.seed:crypto.getRandomValues(new Uint32Array(1))[0];
    parkedRound=null;savedRound.clear('new');roundTrace={seed,moves:[],run:run?.run||null};activeRun=run?{run:run.run,moves:roundTrace.moves}:null;session.random=window.FatFishReplay.seeded(seed);
    session.start();starting=false;$('startButton').disabled=$('continueButton').disabled=false;canvas.focus({preventScroll:true});
  }
  function goHome(){
    saveRound();let saveError='';if(roundTrace&&['playing','paused','won'].includes(session.state))try{storeCurrentRound();}catch(error){saveError=error.message;}
    if(!saveError&&roundTrace&&['playing','paused','won'].includes(session.state)){
      session.state='paused';session.onEvent=()=>{};
      parkedRound={session,trace:roundTrace,activeRun,key:roundKey(savedRound.load())};
      session=new Session({onEvent:onGameEvent});
    }
    activeRun=null;roundTrace=null;voice.stop();session.goHome();if(saveError)$('homeSpeech').textContent=saveError;
  }
  $('startButton').addEventListener('click',start);
  $('continueButton').addEventListener('click',continueSavedRound);
  $('saveRoundButton').addEventListener('click',()=>{try{storeCurrentRound();goHome();homeFeedback('存好啦，等你回来继续～','saved');}catch(error){$('overlayText').textContent=error.message;}});
  $('primaryButton').addEventListener('click',()=>{ensureAudio();if(['paused','won'].includes(session.state))session.resume();else start();canvas.focus({preventScroll:true});});
  $('secondaryButton').addEventListener('click',()=>{if(session.state==='gameover'){goHome();openGallery();}else start();});
  $('homeButton').addEventListener('click',goHome);$('restartButton').addEventListener('click',start);
  $('pauseButton').addEventListener('click',()=>{if(session.state==='paused')session.resume();else session.pause();});
  document.querySelector('.brand').addEventListener('click',event=>{event.preventDefault();if(loaded)goHome();});
  $('collectionToggle').addEventListener('click',openGallery);
  function navigateGallery(direction){const known=progress.levels();galleryLevel=known[(known.indexOf(galleryLevel)+direction+known.length)%known.length];renderGallery();}
  $('galleryPrev').addEventListener('click',()=>navigateGallery(-1));$('galleryNext').addEventListener('click',()=>navigateGallery(1));
  $('portraitButton').addEventListener('click',()=>{if(!progress.has(galleryLevel))return;const def=C.levels[galleryLevel-1];$('portraitImage').src=def.asset;$('portraitImage').alt=def.name+'高清完整立绘';$('portraitDialog').showModal();});
  $('homeMascot').addEventListener('click',()=>{
    clearTimeout(homeTimer);const pose=homeTaps.tap(performance.now());$('homeSprite').dataset.pose=pose;$('homeMascot').dataset.mood=pose;
    const line=homeDialogue.next(pose,false),played=say(pose==='shy'?'shy':'cute',{clip:line.clip});
    if(played||!soundEnabled){homeDialogue.remember(pose,line);$('homeSpeech').textContent=line.text;}
    homeTimer=setTimeout(()=>{$('homeSprite').dataset.pose='idle';$('homeMascot').dataset.mood='idle';$('homeSpeech').textContent='今天也想和你一起玩～';homeTaps.reset();},4300);
  });
  function updateSoundButton(){
    $('soundButton').setAttribute('aria-pressed',String(soundEnabled));$('soundButton').setAttribute('aria-label',soundEnabled?'关闭音效':'开启音效');
    $('pauseSoundButton').setAttribute('aria-pressed',String(soundEnabled));$('pauseSoundButton').textContent=soundEnabled?'音效：已开启 · 点击关闭':'音效：已关闭 · 点击开启';
  }
  function toggleSound(){soundEnabled=!soundEnabled;storage.set(keys.sound,soundEnabled?'1':'0');sound.setEnabled(soundEnabled);voice.setEnabled(soundEnabled);updateSoundButton();if(soundEnabled)sound.play('toggle');}
  $('soundButton').addEventListener('click',toggleSound);$('pauseSoundButton').addEventListener('click',toggleSound);
  window.FatFishLeaderboard.initialize();
  $('unlockInner').addEventListener('animationend',event=>{if(event.animationName==='whale-unlock-turn')finishUnlock();});
  $('unlockClose').addEventListener('click',event=>{event.stopPropagation();dismissUnlock();canvas.focus({preventScroll:true});});
  document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>$(button.dataset.close).close()));
  document.querySelectorAll('dialog').forEach(dialog=>{
    dialog.addEventListener('close',()=>{if(dialog.dataset.resumeOnClose==='1'&&session.state==='paused')session.resume();});
    dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
  });
  window.addEventListener('keydown',event=>{
    if(document.querySelector('dialog[open]'))return;
    if(event.target.closest('button,a')&&['Space','Enter'].includes(event.code))return;
    if(event.code==='KeyP'&&['playing','paused'].includes(session.state)){event.preventDefault();session.state==='paused'?session.resume():session.pause();}
    if(event.code==='KeyR'&&loaded&&session.state!=='ready'&&!event.repeat){event.preventDefault();start();}
    if(session.state!=='playing')return;
    if(event.code==='ArrowLeft'||event.code==='ArrowRight'){event.preventDefault();session.setAim(session.aimX+(event.code==='ArrowLeft'?-20:20));}
    if(['Space','ArrowDown'].includes(event.code)&&!event.repeat){event.preventDefault();ensureAudio();session.drop();}
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden){voice.stop();session.pause('刚刚离开海湾，回来后可以继续。');}});
  window.addEventListener('pagehide',()=>{if(roundTrace&&['playing','paused','won'].includes(session.state))try{storeCurrentRound();}catch(_){}saveRound();window.FatFishLeaderboard.flush(true);});
  function loadImage(def){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{images.set(def.id,image);resolve();};image.onerror=()=>reject(new Error('无法读取'+def.name));image.src=def.asset;});}
  updateSoundButton();updateUI();showScreen(true);
  Promise.all([...C.levels.map(loadImage),new Promise((resolve,reject)=>{const sheet=new Image();sheet.onload=resolve;sheet.onerror=()=>reject(new Error('应援表情读取失败'));sheet.src='assets/mascot/expressions.png';})]).then(()=>{
    for(const def of C.levels)sprites.set(def.id,createSprite(def.id));loaded=true;updateUI();$('startButton').disabled=$('continueButton').disabled=false;$('startButtonText').textContent='开始合成';canvas.dataset.loaded='true';
    const fixture=qaMode&&new URLSearchParams(location.search).get('fixture');
    if(fixture==='tarot'){for(const def of C.levels)progress.reveal(def.id);updateUI();}
    if(fixture&&fixture!=='tarot'){session.start();
      if(fixture==='failed'){const body=session.createEntity(4,210,100,{hasLanded:true});Matter.Body.setStatic(body,true);}
      if(fixture==='warning'){const radius=C.levels[3].radius;const body=session.createEntity(4,100,C.dangerY+radius-radius/3,{hasLanded:true});Matter.Body.setStatic(body,true);}
      if(fixture==='crowded')for(const [level,x,y] of [[8,285,500],[6,140,580],[3,50,560],[1,390,590],[2,70,585],[4,65,425],[5,155,400],[2,245,320],[3,385,370],[1,230,290]])session.createEntity(level,x,y);
      if(fixture==='contact')for(const [level,x,y] of [[7,107,510],[6,269,520],[4,355,540],[5,195,350],[3,330,365],[2,70,350]])session.createEntity(level,x,y);
      if(fixture==='rolling'){session.createEntity(1,210,590);session.createEntity(7,210,310);}
      if(fixture==='merge'){session.createEntity(1,195,560,{turnId:1});session.createEntity(1,225,560,{turnId:1});session.createEntity(2,210,520);}
      if(fixture==='unlock'||fixture==='unlock-known'){if(fixture==='unlock-known')progress.reveal(5);session.createEntity(4,165,560,{turnId:1});session.createEntity(4,245,560,{turnId:1});}
      if(fixture==='unlock-win'){session.createEntity(9,150,450,{turnId:1});session.createEntity(9,270,450,{turnId:1});}
      if(fixture==='unsupported'){session.createEntity(4,100,565);session.createEntity(4,180,565);const sleeper=session.createEntity(1,40,540);Matter.Sleeping.set(sleeper,true);}
      updateUI();}
  }).catch(error=>{console.error(error);loadFailed=true;$('startButtonText').textContent='重新加载';$('startButton').disabled=false;$('homeSpeech').textContent='素材还没到齐，请重新加载一下。';});
  let lastFrame=performance.now(),accumulator=0;const STEP=1000/60;
  function frame(now){const delta=Math.max(0,Math.min(80,now-lastFrame));lastFrame=now;
    if(session.state==='playing'){accumulator+=delta;let steps=0;while(accumulator>=STEP&&steps<5){session.step(STEP);accumulator-=STEP;steps++;if(session.state!=='playing'){accumulator=0;break;}}}else accumulator=0;
    processUnlocks();if(session.state!=='ready')drawBoard(now);requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
