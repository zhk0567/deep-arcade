(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.FatFishVoice=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const clips={cute:'assets/voice/home-cute-v068.mp3',cute2:'assets/voice/home-cute-2-v068.mp3',cute3:'assets/voice/home-cute-3-v068.mp3',cute4:'assets/voice/home-cute-4-v068.mp3',cute5:'assets/voice/home-cute-5-v068.mp3',cute6:'assets/voice/home-cute-6-v068.mp3',cute7:'assets/voice/home-cute-7-v068.mp3',shy:'assets/voice/home-shy-v068.mp3',shy2:'assets/voice/home-shy-2-v068.mp3',shy3:'assets/voice/home-shy-3-v068.mp3',shy4:'assets/voice/home-shy-4-v068.mp3',shy5:'assets/voice/home-shy-5-v068.mp3',praise:'assets/voice/praise-v068.mp3',discover:'assets/voice/discover-v068.mp3',combo:'assets/voice/combo-v068.mp3',comboAlt:'assets/voice/combo-alt-v068.mp3',noSave:'assets/voice/no-save-v068.mp3',failedSave:'assets/voice/failed-save-v068.mp3',saved:'assets/voice/saved-v068.mp3',welcome:'assets/voice/welcome-back-v068.mp3',win:'assets/voice/win-v068.mp3'};
 const interactionClips={cute:['cute','cute2','cute3','cute4','cute5','cute6','cute7'],shy:['shy','shy2','shy3','shy4','shy5']};
 class Voice {
  constructor(enabled,options={}){this.enabled=enabled;this.factory=options.factory||(()=>new Audio());this.now=options.now||(()=>performance.now());this.onStatus=options.onStatus||(()=>{});this.audio=null;this.lastCheer=-Infinity;this.lastInteraction=-Infinity;this.comboIndex=0;}
  stop(){if(this.audio){this.audio.pause();try{this.audio.currentTime=0;}catch(_){}this.audio=null;this.onStatus('stopped','');}}
  setEnabled(value){this.enabled=!!value;if(!this.enabled)this.stop();}
  get speaking(){return !!this.audio&&!this.audio.ended&&!this.audio.paused;}
  play(kind,options={}){
   if(!this.enabled||!clips[kind])return false;const now=this.now(),cheer=['praise','discover','combo'].includes(kind),interaction=['cute','shy'].includes(kind);
   if(cheer&&(now-this.lastCheer<3500||this.audio&&!this.audio.ended&&!this.audio.paused))return false;
   if(interaction&&kind!=='shy'&&now-this.lastInteraction<1000)return false;
   if(cheer)this.lastCheer=now;if(interaction)this.lastInteraction=now;
   this.stop();const audio=this.factory();this.audio=audio;audio.preload='auto';audio.volume=.28;
   const clip=interactionClips[kind]?.includes(options.clip)?options.clip:kind==='combo'&&this.comboIndex++%2?'comboAlt':kind;audio.src=clips[clip];
   audio.onended=()=>{if(this.audio===audio){this.audio=null;this.onStatus('ended',clip);}};
   audio.onerror=()=>{if(this.audio===audio){this.audio=null;this.onStatus('unavailable',clip);}};
   this.onStatus('requested',clip);try{const result=audio.play();if(result?.then)result.then(()=>{if(this.audio===audio)this.onStatus('playing',clip);}).catch(()=>{if(this.audio===audio){this.audio=null;this.onStatus('blocked',clip);}});}catch(_){this.audio=null;this.onStatus('blocked',clip);return false;}
   return true;
  }
 }
 return {Voice,clips};
});
