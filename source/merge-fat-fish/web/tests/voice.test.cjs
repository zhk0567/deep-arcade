'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');const{Voice,clips}=require('../dist/voice.js');
test('应援短句不叠加，有间隔，静音立即停止并阻止播放',()=>{
 let now=0;const audios=[],voice=new Voice(true,{now:()=>now,factory:()=>{const a={paused:true,ended:false,pause(){this.paused=true;},play(){this.paused=false;return Promise.resolve();}};audios.push(a);return a;}});
 assert.ok(voice.play('praise'));now=100;assert.equal(voice.play('combo'),false);voice.setEnabled(false);assert.ok(audios.every(a=>a.paused));assert.equal(voice.play('cute'),false);voice.setEnabled(true);now=4000;assert.ok(voice.play('cute'));now=4100;assert.ok(voice.play('shy'));assert.equal(audios.at(-2).paused,true);
});
test('所有互动、鼓励、无存档和失败提示都有可打包的本地MP3',()=>{for(const [key,file]of Object.entries(clips)){const bytes=fs.readFileSync(path.join(__dirname,'../dist',file));assert.ok(bytes.length>1000,key);assert.ok(bytes.includes(Buffer.from([0xff,0xf3]))||bytes.includes(Buffer.from([0xff,0xfb]))||bytes.toString('ascii',0,3)==='ID3',key);}});
test('新增互动音色使用指定台词音频，害羞可以打断卖萌但不会叠加，保留音量限制',()=>{
 let now=0;const audios=[],voice=new Voice(true,{now:()=>now,factory:()=>{const a={paused:true,ended:false,pause(){this.paused=true;},play(){this.paused=false;}};audios.push(a);return a;}});
 assert.ok(voice.play('cute',{clip:'cute4'}));assert.equal(audios.at(-1).src,clips.cute4);assert.ok(audios.at(-1).volume<=.32);
 now=100;assert.ok(voice.play('shy',{clip:'shy3'}));assert.equal(audios[0].paused,true);assert.equal(audios.at(-1).src,clips.shy3);
 now=200;assert.equal(voice.play('cute',{clip:'cute2'}),false);voice.setEnabled(false);assert.equal(audios.at(-1).paused,true);
});
