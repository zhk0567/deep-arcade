(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.FatFishAudio=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  // Soft, short pentatonic plucks. Frequencies, envelopes and cheer rhythms are
  // separate from game logic so the same cues can later use wx inner audio.
  const cues={
    drop:[[293.66,0,.09,.10,'bubble']],merge:[[392,0,.13,.16],[493.88,.065,.14,.08]],
    discover:[[392,0,.16,.15],[523.25,.12,.2,.12]],
    combo:[[440,0,.15,.15],[587.33,.13,.22,.12]],
    praise:[[440,0,.15,.10]],
    cute:[[392,0,.14,.13],[493.88,.11,.16,.08]],shy:[[440,0,.14,.12],[349.23,.12,.18,.08]],
    end:[[329.63,0,.2,.10]],win:[[392,0,.17,.15],[493.88,.14,.18,.12],[587.33,.29,.24,.10]],
    toggle:[[440,0,.1,.09]]
  };
  class Sound {
    constructor(enabled,contextFactory){this.enabled=enabled;this.contextFactory=contextFactory;this.context=null;this.voices=new Set();this.last=new Map();this.counts={};this.until=0;this.priority=-1;this.lastAccent=-Infinity;this.accentPriority=-1;}
    unlock(){
      if(!this.enabled)return;
      try{if(!this.context){const Audio=typeof window!=='undefined'&&(window.AudioContext||window.webkitAudioContext);this.context=this.contextFactory?this.contextFactory():Audio?new Audio():null;if(!this.context)return;
        this.master=this.context.createGain();this.master.gain.value=.14;const compressor=this.context.createDynamicsCompressor();compressor.threshold.value=-20;compressor.ratio.value=5;this.master.connect(compressor);compressor.connect(this.context.destination);
        if(this.context.createPeriodicWave)this.timbre=this.context.createPeriodicWave(new Float32Array(5),new Float32Array([0,1,.04,.01,0]));
      }if(this.context.state==='suspended')this.context.resume().catch(()=>{});}catch(_){}
    }
    setEnabled(value){this.enabled=!!value;if(!this.enabled){for(const voice of this.voices){try{voice.stop();}catch(_){}}this.voices.clear();this.until=0;this.priority=-1;}else this.unlock();}
    stop(){for(const voice of this.voices){try{voice.stop();}catch(_){}}this.voices.clear();this.until=0;this.priority=-1;}
    play(kind,level){
      if(!this.enabled)return false;this.unlock();const context=this.context;if(!context||context.state!=='running'||!cues[kind])return false;
      const priorities={drop:0,merge:1,toggle:1,cute:2,shy:2,praise:2,discover:3,combo:4,end:4,win:5};
      const now=context.currentTime,priority=priorities[kind],accent=['combo','discover','praise'].includes(kind),interval=accent?1.8:.18;
      if(now-(this.last.get(kind)??-Infinity)<interval)return false;
      if(now<this.until&&priority<=this.priority)return false;
      if(accent&&now-this.lastAccent<2.4&&priority<=this.accentPriority)return false;
      // A cheer replaces the ordinary merge cue. Fade previous voices instead
      // of accumulating arpeggios every time a chain merges several characters.
      for(const voice of this.voices){try{const gain=voice.whaleGain;if(gain&&gain.cancelScheduledValues&&gain.setTargetAtTime){gain.cancelScheduledValues(now);gain.setTargetAtTime(.0001,now,.006);voice.stop(now+.024);}else voice.stop();}catch(_){}}
      this.voices.clear();this.priority=priority;this.until=now+Math.max(...cues[kind].map(note=>note[1]+note[2]))+.025;
      if(accent){this.lastAccent=now;this.accentPriority=priority;}
      this.last.set(kind,now);this.counts[kind]=(this.counts[kind]||0)+1;
      const transpose=kind==='merge'?Math.pow(2,Math.min(2,Math.max(0,(level||2)-2))/12):1;
      try{for(const [hz,delay,duration,volume,type] of cues[kind]){
        const oscillator=context.createOscillator(),gain=context.createGain(),t=now+delay;
        oscillator.type='sine';if(this.timbre&&type!=='bubble')oscillator.setPeriodicWave(this.timbre);oscillator.frequency.setValueAtTime(hz*transpose*(type==='bubble'?1.45:1),t);oscillator.frequency.exponentialRampToValueAtTime(hz*transpose,t+(type==='bubble' ? .1 : duration));
        gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(volume,t+.012);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
        oscillator.connect(gain);gain.connect(this.master);oscillator.whaleGain=gain.gain;oscillator.onended=()=>{this.voices.delete(oscillator);oscillator.disconnect();gain.disconnect();};this.voices.add(oscillator);oscillator.start(t);oscillator.stop(t+duration+.02);
      }return true;}catch(_){return false;}
    }
  }
  return{Sound,cues};
});
