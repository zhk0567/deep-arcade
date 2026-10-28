(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FatFishCompanion = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  class CheerDirector {
    constructor() { this.reset(); }
    reset() { this.until = 0; this.priority = 0; this.lastAt = -Infinity; this.combos = new Map(); }
    merge(event, now) {
      let message;
      if (event.turnId && event.comboCount >= 2 && event.comboCount > (this.combos.get(event.turnId) || 1)) {
        this.combos.set(event.turnId, event.comboCount);
        message = { kind: 'combo', pose: 'cheer', priority: 4, text: '一投连锁 ' + event.comboCount + ' 次！太厉害啦！', duration: 2600 };
      } else if (event.newForm) {
        message = { kind: 'discover', pose: 'cheer', priority: 3, text: '新模样出现啦！给你鼓掌～', duration: 2600 };
      } else if (event.totalMerges % 4 === 0) {
        message = { kind: 'praise', pose: 'playful', priority: 1, text: '合得漂亮，我一直在为你加油！', duration: 2000 };
      }
      if (!message || (now < this.until && message.priority < this.priority)) return null;
      if (message.priority <= 1 && now - this.lastAt < 1400) return null;
      this.priority = message.priority; this.lastAt = now; this.until = now + message.duration;
      return message;
    }
  }
  class HomeTaps {
    constructor() { this.lastTap = -Infinity; }
    tap(now) {
      if (now - this.lastTap <= 320) { this.lastTap = -Infinity; return 'shy'; }
      this.lastTap = now; return 'playful';
    }
    reset() { this.lastTap = -Infinity; }
  }
  return { CheerDirector, HomeTaps };
});
