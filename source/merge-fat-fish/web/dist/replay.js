(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./engine.js'));else root.FatFishReplay=factory(root.FatFishEngine);})(typeof globalThis!=='undefined'?globalThis:this,function(engine){
  'use strict';
  function seeded(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
  function createReplay(seed,moves,ticks){
    if(!Number.isInteger(ticks)||ticks<0||ticks>108000||!Array.isArray(moves)||moves.length>4000)throw Error('对局记录超出范围');
    let previous=-1;
    for(const move of moves){if(!Array.isArray(move)||move.length!==2||!Number.isInteger(move[0])||move[0]<previous||move[0]<0||move[0]>ticks||!Number.isFinite(move[1])||move[1]<0||move[1]>420)throw Error('投放记录无效');previous=move[0];}
    const session=new engine.Session({random:()=>0}),encountered=new Set();session.random=seeded(seed);
    session.onEvent=event=>{if(event.type==='encounter')encountered.add(event.level);if(event.type==='start'||event.type==='drop')encountered.add(session.currentLevel);};
    session.start();let cursor=0,tick=0,done=false;
    function advance(budget=500){
    for(let used=0;!done&&used<budget;used++){
      // Winning opens a modal in the client. Continuing has no simulated time cost.
      if(session.state==='won')session.resume();
      while(cursor<moves.length&&moves[cursor][0]===tick){if(!session.drop(moves[cursor][1]))throw Error('投放时机无效');cursor++;}
      if(tick===ticks){done=true;break;}
      if(session.state!=='playing')throw Error('对局已经结束');
      session.step(1000/60);
      tick++;
    }
    return {done,tick,total:ticks};
    }
    return {session,encountered,advance,get done(){return done;}};
  }
  function replay(seed,moves,ticks){
    const task=createReplay(seed,moves,ticks);while(!task.done)task.advance(1000);const session=task.session;
    return {score:session.score,drops:session.drops,highestLevel:session.highestLevel};
  }
  return {seeded,replay,createReplay};
});
