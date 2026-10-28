'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {Worker}=require('node:worker_threads');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
class Leaderboard {
  constructor(directory){
    fs.mkdirSync(directory,{recursive:true});this.file=path.join(directory,'leaderboard.ndjson');
    this.data={version:1,secret:crypto.randomBytes(32).toString('hex'),players:[]};
    if(fs.existsSync(this.file)){
      const raw=fs.readFileSync(this.file,'utf8'),complete=raw.lastIndexOf('\n')+1;
      if(!complete)throw Error('排行榜文件头损坏，请保留数据并检查备份');
      const lines=raw.slice(0,complete).trimEnd().split('\n'),header=JSON.parse(lines.shift());
      if(header.version!==1||typeof header.secret!=='string')throw Error('排行榜数据格式无效');this.data.secret=header.secret;
      const players=new Map();for(const line of lines){const event=JSON.parse(line);if(!event.player?.id)throw Error('排行榜日志损坏，请保留数据并检查备份');players.set(event.player.id,event.player);}this.data.players=[...players.values()];
      // Only an incomplete final append can be truncated after an interrupted write.
      if(complete!==raw.length)fs.truncateSync(this.file,Buffer.byteLength(raw.slice(0,complete)));
    }else this.append({version:1,secret:this.data.secret});
    this.active=0;this.lastSubmit=new Map();
  }
  append(event){const fd=fs.openSync(this.file,'a',0o600);try{fs.writeFileSync(fd,JSON.stringify(event)+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}}
  player(token){return token&&this.data.players.find(p=>p.tokenHash===hash(token));}
  createPlayer(){const token=crypto.randomBytes(32).toString('base64url');const id=crypto.randomUUID();const player={id,tokenHash:hash(token),name:'海湾旅人'+id.slice(0,4),best:0,achievedAt:null};this.append({player});this.data.players.push(player);return{player,token};}
  rename(player,name){name=typeof name==='string'?name.trim().replace(/[\u0000-\u001f\u007f]/g,''):'';if(!name||Array.from(name).length>12)throw Error('昵称请填写1至12个字');this.append({player:{...player,name}});player.name=name;}
  sign(payload){const encoded=Buffer.from(JSON.stringify(payload)).toString('base64url');return encoded+'.'+crypto.createHmac('sha256',this.data.secret).update(encoded).digest('base64url');}
  issue(player,seed=crypto.randomBytes(4).readUInt32LE()){return{seed,rulesVersion:'0.6.6',run:this.sign({seed,playerId:player.id,issued:Date.now(),version:'0.6.6'})};}
  decode(run,player,allowExpired=false){
    if(typeof run!=='string'||run.length>1000)throw Error('对局凭证无效');const parts=run.split('.');if(parts.length!==2)throw Error('对局凭证无效');
    const expected=crypto.createHmac('sha256',this.data.secret).update(parts[0]).digest();let actual;try{actual=Buffer.from(parts[1],'base64url');}catch(_){throw Error('对局凭证无效');}
    if(actual.length!==expected.length||!crypto.timingSafeEqual(actual,expected))throw Error('对局凭证无效');
    const payload=JSON.parse(Buffer.from(parts[0],'base64url').toString());
    if(payload.playerId!==player.id||payload.version!=='0.6.6'||(!allowExpired&&Date.now()-payload.issued>86400000)||payload.issued>Date.now()+60000)throw Error('对局凭证已失效');return payload;
  }
  upsert(player,score){if(!Number.isSafeInteger(score)||score<0)throw Error('分数无效');if(score>player.best){const achievedAt=Date.now();this.append({player:{...player,best:score,achievedAt}});player.best=score;player.achievedAt=achievedAt;}return this.view(player);}
  view(player){const sorted=this.data.players.filter(p=>p.best>0).slice().sort((a,b)=>b.best-a.best||a.achievedAt-b.achievedAt||a.id.localeCompare(b.id));const publicRow=(p,index)=>({rank:index+1,name:p.name,score:p.best,isMe:!!player&&p.id===player.id});const myIndex=player?sorted.findIndex(p=>p.id===player.id):-1;return{entries:sorted.slice(0,50).map(publicRow),total:sorted.length,me:player?{name:player.name,score:player.best,rank:myIndex<0?null:myIndex+1}:null};}
  async submit(player,body){
    const payload=this.decode(body.run,player);
    if(this.active>=2){const e=Error('正在核算对局，请稍后重试');e.status=429;throw e;}
    const now=Date.now();if(now-(this.lastSubmit.get(player.id)||0)<1500){const e=Error('保存太频繁，请稍后再试');e.status=429;throw e;}
    this.lastSubmit.set(player.id,now);this.active++;
    try{const result=await new Promise((resolve,reject)=>{
      const worker=new Worker(path.join(__dirname,'replay-worker.cjs'),{workerData:{seed:payload.seed,moves:body.moves,ticks:body.ticks}});
      const timer=setTimeout(()=>{worker.terminate();reject(Error('对局核算超时，请重试'));},15000);
      worker.once('message',message=>{clearTimeout(timer);message.error?reject(Error(message.error)):resolve(message.result);});
      worker.once('error',error=>{clearTimeout(timer);reject(error);});worker.once('exit',code=>{clearTimeout(timer);if(code)reject(Error('对局核算中断'));});
    });return this.upsert(player,result.score);}finally{this.active--;}
  }
}
module.exports={Leaderboard};
