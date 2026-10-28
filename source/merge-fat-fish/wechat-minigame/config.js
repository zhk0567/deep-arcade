(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FatFishConfig = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  return {
    title: '合成大肥鱼',
    version: '0.6.5',
    rulesVersion: '0.6.5',
    width: 420,
    height: 640,
    wall: 17,
    floorY: 610,
    spawnY: 65,
    dangerY: 126,
    overflowGraceMs: 3200,
    dropSettleGraceMs: 1200,
    dropCooldownMs: 420,
    levelOneProbability: 0.5,
    spawnProbabilities: [0.50, 0.30, 0.15, 0.05],
    levels: [
      { id: 1, name: '蓝鲸团子', radius: 20, color: '#6cc9d2', pale: '#e0f7f7', identity: '01', asset: 'assets/levels/01.png', portrait: [0.5, 0.39, 0.91], description: '圆滚滚的小鲸宝，把每一朵浪花都当成新朋友。最喜欢被轻轻戳一下，也会抱着小小的心意陪你出发。' },
      { id: 2, name: '泡泡鲸宝', radius: 27, color: '#7ea3d7', pale: '#e8f1fb', identity: '02_bubble', asset: 'assets/levels/02_bubble.png', portrait: [0.5, 0.4, 0.97], description: '喜欢躲在泡泡里，悄悄观察热闹的海湾。看起来安安静静，心里却装着一整片海的奇思妙想。' },
      { id: 3, name: '见习鲸侍', radius: 35, color: '#7fabe7', pale: '#e7f1fc', identity: '02', asset: 'assets/levels/02.png', portrait: [0.51, 0.23, 0.73], description: '第一次换上整齐的侍装，总怕把蝴蝶结系歪。她会认真记住每位旅人的喜好，再递上一声有点害羞的问候。' },
      { id: 4, name: '灵尾鲸侍', radius: 45, color: '#8c91df', pale: '#ecebfc', identity: '03', asset: 'assets/levels/03.png', portrait: [0.5, 0.23, 0.73], description: '灵巧的鲸尾轻轻一摆，就能追上远处的浪花。比起得到夸奖，她更喜欢在伙伴需要时第一个出现。' },
      { id: 5, name: '王庭侍长', radius: 55, color: '#a38bd2', pale: '#f1eafa', identity: '04', asset: 'assets/levels/04.png', portrait: [0.51, 0.23, 0.73], description: '长裙掠过王庭走廊，连忙碌的脚步都变得从容。她把照顾伙伴当成日常的小事，却总能让整个海湾安心。' },
      { id: 6, name: '海月鲸姬', radius: 68, color: '#85bdca', pale: '#edf8fc', identity: '05', asset: 'assets/levels/05.png', portrait: [0.52, 0.23, 0.73], description: '蓝白礼服接住海面的月光，仿佛一场安静的潮汐。她喜欢把心事说给星星听，也愿意倾听旅途中每一个小小的愿望。' },
      { id: 7, name: '夜宴贵姬', radius: 84, color: '#b49a65', pale: '#eee8df', identity: '06', asset: 'assets/levels/06.png', portrait: [0.52, 0.23, 0.73], description: '黑色礼服与流动的蓝发，点亮了海中的夜宴。舞曲响起时，她会向熟悉的旅人伸出手，邀请你共度这一刻的欢喜。' },
      { id: 8, name: '凤仪王女', radius: 101, color: '#bd6d7a', pale: '#f8e7e9', identity: '07', asset: 'assets/levels/07.png', portrait: [0.51, 0.23, 0.68], description: '绛红宫装映着金色凤饰，步履间多了几分坚定。即使加冕的日子越来越近，她仍记得第一次与你相遇的那朵浪花。' },
      { id: 9, name: '星海鲸神', radius: 120, color: '#92beca', pale: '#f1f8ec', identity: '09_starsea', asset: 'assets/levels/09_starsea.png', portrait: [0.50, 0.25, 0.74], description: '当潮汐与星轨相逢，鲸娘将整片星海轻轻托在掌心。她终于听见万千浪花的愿望，也依然记得你为她留的那个小小位置。' },
      { id: 10, name: '沧海女帝', radius: 136, color: '#d8af55', pale: '#f8efd9', identity: '08', asset: 'assets/levels/08.png', portrait: [0.51, 0.23, 0.65], description: '凤冠加冕，沧海为她奏响悠长的潮声。走过漫长的进化，她最珍惜的依然是一路相伴的你，而海湾的故事还会继续。' }
    ]
  };
});
