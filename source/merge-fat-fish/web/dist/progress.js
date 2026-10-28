(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./config.js'));
  else root.FatFishProgress = factory(root.FatFishConfig);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (config) {
  'use strict';
  // Keep persistence keys independent of asset URLs: the share build embeds
  // images as data URLs, which must never be written into localStorage.
  const assetKey=def=>def.identity?'assets/levels/'+def.identity+'.png':def.asset;
  class Progress {
    constructor(storage) {
      this.storage = storage;
      this.known = new Set([assetKey(config.levels[0])]);
      const saved = storage.get('fatfish.v2.discovered', null);
      if (saved !== null) {
        try {
          const assets = JSON.parse(saved);
          if (Array.isArray(assets)) {
            for (const def of config.levels) if (assets.includes(assetKey(def))||assets.includes(def.asset)) this.known.add(assetKey(def));
            if(assets.some(value=>typeof value==='string'&&value.startsWith('data:')))this.storage.set('fatfish.v2.discovered',JSON.stringify([...this.known]));
          }
        } catch (_) {}
      } else {
        // Preserve previously earned discoveries without unlocking the newly inserted character.
        const oldHighest = Math.max(0, Math.min(8, Number(storage.get('fatfish.v1.discovered', 0)) || 0));
        const previousLevels = config.levels.filter(def => assetKey(def) !== 'assets/levels/02_bubble.png');
        for (const def of previousLevels.slice(0, oldHighest)) this.known.add(assetKey(def));
      }
    }
    has(level) { return !!config.levels[level - 1] && this.known.has(assetKey(config.levels[level - 1])); }
    reveal(level) {
      const def = config.levels[level - 1];
      if (!def || this.known.has(assetKey(def))) return false;
      this.known.add(assetKey(def));
      this.storage.set('fatfish.v2.discovered', JSON.stringify(Array.from(this.known)));
      return true;
    }
    levels() { return config.levels.filter(def => this.has(def.id)).map(def => def.id); }
    get count() { return this.levels().length; }
  }
  return { Progress };
});
