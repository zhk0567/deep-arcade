'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');const {HomeDialogue,lines}=require('../dist/home-dialogue.js');const {clips}=require('../dist/voice.js');
test('主页卖萌和害羞各自随机且不连续重复，所有台词都有匹配的配音文件',()=>{
 let seed=63;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);const d=new HomeDialogue(random);
 const old=JSON.parse(fs.readFileSync(path.join(__dirname,'../dist/assets/voice/README.json'),'utf8')).lines,newLines=JSON.parse(fs.readFileSync(path.join(__dirname,'../dist/assets/voice/主页语音_v063.json'),'utf8')).lines;
 for(const pose of ['playful','shy']){
  let previous='';const seen=new Set();for(let i=0;i<200;i++){const line=d.next(pose);assert.notEqual(line.clip,previous);previous=line.clip;seen.add(line.clip);}
  assert.equal(seen.size,lines[pose].length);
  for(const line of lines[pose]){const file=clips[line.clip];assert.ok(file);assert.ok(fs.statSync(path.join(__dirname,'../dist',file)).size>1000);const key=path.basename(file,'.mp3');const current=JSON.parse(fs.readFileSync(path.join(__dirname,'../dist/assets/voice/语音_v068_选定G.json'),'utf8')).lines;assert.equal(current[key]||newLines[key]||old[key],line.text);}
 }
 const previous=d.previous.get('playful'),candidate=d.next('playful',false);assert.equal(d.previous.get('playful'),previous);d.remember('playful',candidate);assert.notEqual(d.next('playful').clip,candidate.clip);
});
