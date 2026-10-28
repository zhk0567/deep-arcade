'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {Leaderboard}=require('./leaderboard.cjs');
const root=path.resolve(__dirname,'../dist');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.txt':'text/plain; charset=utf-8','.mp3':'audio/mpeg'};
function createServer(options={}){
  const store=new Leaderboard(options.dataDir||process.env.FATFISH_DATA_DIR||path.join(__dirname,'../runtime-data'));
  const registrations=new Map();
  return http.createServer(async(request,response)=>{
    const json=(code,data,headers={})=>{response.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});response.end(JSON.stringify(data));};
    let pathname;try{pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);}catch(_){return json(400,{error:'地址无效'});}
    if(pathname.startsWith('/api/')){
      try{
        if(pathname==='/api/health'&&request.method==='GET')return json(200,{ok:true,version:'0.6.6',serviceId:require('node:crypto').createHash('sha256').update(path.resolve(path.dirname(store.file)).toLowerCase()).digest('hex').slice(0,16)});
        const token=(request.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('fatfish_player='))?.slice(15);
        let player=store.player(token);
        if(request.method==='GET'&&pathname==='/api/player'){
          let headers={};if(!player){const ip=request.socket.remoteAddress,now=Date.now();let limit=registrations.get(ip);if(!limit||now-limit.time>600000){limit={time:now,count:0};registrations.set(ip,limit);}if(++limit.count>60)return json(429,{error:'创建玩家过于频繁'});
            const created=store.createPlayer();player=created.player;headers['Set-Cookie']='fatfish_player='+created.token+'; HttpOnly; SameSite=Lax; Path=/api; Max-Age=31536000'+(process.env.FATFISH_SECURE_COOKIE==='1'?'; Secure':'');
          }return json(200,store.view(player).me,headers);
        }
        if(request.method==='GET'&&pathname==='/api/leaderboard')return json(200,store.view(player));
        if(request.method!=='POST')return json(405,{error:'方法不支持'});
        if(!player)return json(401,{error:'请先建立玩家身份'});
        if(request.headers['x-fatfish-request']!=='1'||!String(request.headers['content-type']).startsWith('application/json'))return json(403,{error:'请求来源无效'});
        if(request.headers.origin){let origin;try{origin=new URL(request.headers.origin);}catch(_){return json(403,{error:'来源无效'});}if(origin.host!==request.headers.host)return json(403,{error:'不允许跨站提交'});}
        let raw='';for await(const chunk of request){raw+=chunk;if(Buffer.byteLength(raw)>180000)return json(413,{error:'对局记录过大'});}
        let body;try{body=JSON.parse(raw);}catch(_){return json(400,{error:'数据格式无效'});}if(!body||typeof body!=='object')return json(400,{error:'数据格式无效'});
        if(pathname==='/api/runs')return json(200,store.issue(player));
        if(pathname==='/api/resume'){const previous=store.decode(body.run,player,true);return json(200,store.issue(player,previous.seed));}
        if(pathname==='/api/profile'){store.rename(player,body.name);return json(200,store.view(player).me);}
        if(pathname==='/api/score')return json(200,await store.submit(player,body));
        return json(404,{error:'接口不存在'});
      }catch(error){return json(error.status||400,{error:error.message||'请求未完成'});}
    }
    if(!['GET','HEAD'].includes(request.method)){response.writeHead(405);return response.end();}
    const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!file.startsWith(root+path.sep)){response.writeHead(403);return response.end();}
    fs.stat(file,(error,stat)=>{if(error||!stat.isFile()){response.writeHead(404);return response.end('Not found');}
      response.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Content-Length':stat.size,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
      if(request.method==='HEAD')response.end();else fs.createReadStream(file).pipe(response);
    });
  });
}
function launch(){
  const arg=name=>{const index=process.argv.indexOf(name);return index<0?undefined:process.argv[index+1];};
  let port=Number(arg('--port')||process.env.PORT||4173);const host=arg('--host')||process.env.HOST||'127.0.0.1';
  const dataDir=arg('--data-dir')||process.env.FATFISH_DATA_DIR||path.join(__dirname,'../runtime-data');
  const server=createServer({dataDir});let attempts=0;
  server.on('error',error=>{if(error.code==='EADDRINUSE'&&attempts++<10){port++;server.listen(port,host);}else{console.error(error.message);process.exitCode=1;}});
  server.on('listening',()=>{const url='http://127.0.0.1:'+port+'/';console.log('Local: '+url);console.log('Leaderboard storage: '+path.resolve(dataDir));
    if(process.argv.includes('--open')&&process.platform==='win32')require('node:child_process').spawn('rundll32.exe',['url.dll,FileProtocolHandler',url],{detached:true,windowsHide:true,stdio:'ignore'}).unref();
  });
  server.listen(port,host);process.on('SIGINT',()=>server.close(()=>process.exit(0)));process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
}
module.exports={createServer,launch};
