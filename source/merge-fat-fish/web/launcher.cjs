'use strict';
const {spawn}=require('node:child_process');
const open=url=>spawn('rundll32.exe',['url.dll,FileProtocolHandler',url],{detached:true,windowsHide:true,stdio:'ignore'}).unref();
(async()=>{
  // Reuse this project's running backend instead of launching competing writers.
  const serviceId=require('node:crypto').createHash('sha256').update(require('node:path').resolve(__dirname,'runtime-data').toLowerCase()).digest('hex').slice(0,16);
  const ports=Array.from({length:11},(_,i)=>4173+i);
  const results=await Promise.allSettled(ports.map(async port=>{const response=await fetch('http://127.0.0.1:'+port+'/api/health',{signal:AbortSignal.timeout(400)});const data=await response.json();return data.serviceId===serviceId?{port,version:data.version}:null;}));
  const found=results.find(result=>result.status==='fulfilled'&&result.value);
  if(found){if(found.value.version!=='0.6.6')throw Error('检测到此游戏的旧版后台。请关闭旧的游戏启动窗口，再重新双击开始游戏。排行榜数据会保留。');open('http://127.0.0.1:'+found.value.port+'/');return;}
  process.argv.push('--open');require('./backend/http.cjs').launch();
})().catch(error=>{console.error(error.message);process.exitCode=1;});
