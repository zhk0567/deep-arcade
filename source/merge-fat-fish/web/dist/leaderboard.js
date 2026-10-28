(function(){
  'use strict';
  const $=id=>document.getElementById(id);let connected=false,player=null,busy=false,saveTimer=null;
  const queue=new Map(),outboxKey='fatfish.v05.unsaved';
  function persist(){try{localStorage.setItem(outboxKey,JSON.stringify([...queue.values()]));}catch(_){}}
  const status=message=>{$('leaderboardStatus').textContent=message;};
  async function request(url,body,timeout=18000,keepalive=false){const response=await fetch('/api/'+url,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json','X-FatFish-Request':'1'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(timeout),keepalive});const data=await response.json();if(!response.ok){const error=Error(data.error||'服务暂不可用');error.status=response.status;throw error;}return data;}
  function render(data){
    $('leaderboardRows').replaceChildren();
    for(const entry of data.entries){const row=document.createElement('li');row.className=entry.isMe?'ranking-row is-me':'ranking-row';for(const value of [entry.rank,entry.name,entry.score.toLocaleString('zh-CN')]){const span=document.createElement('span');span.textContent=value;row.append(span);}$('leaderboardRows').append(row);}
    $('leaderboardEmpty').hidden=data.entries.length>0;const me=data.me;
    $('myRank').textContent=me?(me.rank?'我的排名 '+me.rank+' · 最高 '+me.score+' 分':'还没有上榜记录，去合成第一份惊喜吧'):'开始游玩后会建立你的记录';
    if(me){player=me;if(document.activeElement!==$('playerName'))$('playerName').value=me.name;}
    $('leaderboardCount').textContent=data.total+' 位旅人已留下成绩';
  }
  async function refresh(){status('正在寻找海湾的高分…');try{if(!connected){await request('player');connected=true;}render(await request('leaderboard'));status('每位玩家只保留最高分 · 同分按先达成排序');}catch(_){connected=false;status('排行榜尚未连接。请通过“开始游戏.cmd”启动后台，再刷新。');}}
  async function startRound(){
    if(location.protocol==='file:')return null;
    try{if(!connected){player=await request('player',undefined,2500);connected=true;}const round=await request('runs',{},2500);if(round.rulesVersion!=='0.6.6')throw Error('请重新启动新版后台');return round;}catch(_){connected=false;return null;}
  }
  async function flush(keepalive=false){
    if(busy||!queue.size)return;busy=true;const record=queue.values().next().value;let success=false;
    try{const result=await request('score',record,18000,keepalive);render(result);status('最高分已保存');success=true;if(queue.get(record.run)?.ticks===record.ticks)queue.delete(record.run);}
    catch(error){if(error.status===400){queue.delete(record.run);status('这份对局记录未通过核算：'+error.message+'。其它有效记录会继续保留。');}else status('成绩暂未保存：'+error.message+'。连接恢复后可重试。');}
    finally{busy=false;persist();if(queue.size&&success){clearTimeout(saveTimer);saveTimer=setTimeout(flush,1800);}}
  }
  function save(record){if(!record||!record.run||!record.moves.length)return;queue.set(record.run,{...structuredClone(record),savedAt:Date.now()});persist();clearTimeout(saveTimer);saveTimer=setTimeout(flush,1600);}
  function initialize(){
    if(!new URLSearchParams(location.search).has('qa'))try{for(const record of JSON.parse(localStorage.getItem(outboxKey)||'[]'))if(record.run&&Date.now()-record.savedAt<86400000)queue.set(record.run,record);if(queue.size)saveTimer=setTimeout(flush,1800);}catch(_){}
    $('leaderboardButton').addEventListener('click',()=>{$('leaderboardDialog').showModal();refresh();});
    $('leaderboardRefresh').addEventListener('click',async()=>{await flush();await refresh();});
    $('nicknameForm').addEventListener('submit',async event=>{event.preventDefault();try{await request('profile',{name:$('playerName').value});await refresh();}catch(error){status(error.message);}});
  }
  async function resumeRound(run){try{if(!connected){await request('player',undefined,2500);connected=true;}const result=await request('resume',{run},2500);return result.rulesVersion==='0.6.6'?result:null;}catch(_){return null;}}
  window.FatFishLeaderboard={initialize,startRound,resumeRound,save,flush};
})();
