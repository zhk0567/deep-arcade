(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.FatFishHomeDialogue=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const lines={
  playful:[
   {clip:'cute',text:'就再陪我一小会儿嘛，好不好？'},
   {clip:'cute2',text:'今天也想和你一起玩。'},
   {clip:'cute3',text:'嘿嘿，给你一点好运。'},
   {clip:'cute4',text:'给你一个小小的拥抱。'},
   {clip:'cute5',text:'再陪我一会儿，好不好？'},
   {clip:'cute6',text:'见到你就很开心呀。'},
   {clip:'cute7',text:'准备好了？一起出发吧。'}
  ],
  shy:[
   {clip:'shy',text:'哎呀，有一点害羞。'},
   {clip:'shy2',text:'这样会脸红的呀。'},
   {clip:'shy3',text:'再靠近一点点，好不好？'},
   {clip:'shy4',text:'被你发现啦，嘿嘿。'},
   {clip:'shy5',text:'最喜欢和你玩啦。'}
  ]
 };
 class HomeDialogue {
  constructor(random=Math.random){this.random=random;this.previous=new Map();}
  next(pose,commit=true){const kind=pose==='shy'?'shy':'playful',choices=lines[kind].filter(line=>line.clip!==this.previous.get(kind));const choice=choices[Math.min(choices.length-1,Math.floor(this.random()*choices.length))];if(commit)this.remember(pose,choice);return choice;}
  remember(pose,choice){this.previous.set(pose==='shy'?'shy':'playful',choice.clip);}
 }
 return {HomeDialogue,lines};
});
