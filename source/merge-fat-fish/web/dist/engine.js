(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./vendor/matter.min.js'), require('./config.js'));
  } else root.FatFishEngine = factory(root.Matter, root.FatFishConfig);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Matter, config) {
  'use strict';
  const { Engine, Bodies, Body, Composite, Events, Sleeping } = Matter;
  const MAX_LEVEL = config.levels.length;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  function randomLevel(random) {
    const value=(random||Math.random)()*10000;let cumulative=0;
    for(let i=0;i<config.spawnProbabilities.length;i++){cumulative+=Math.round(config.spawnProbabilities[i]*10000);if(value<cumulative||i===config.spawnProbabilities.length-1)return i+1;}
  }

  class Session {
    constructor(options) {
      options = options || {};
      this.random = options.random || Math.random;
      this.onEvent = options.onEvent || function () {};
      this.engine = Engine.create({ positionIterations: 14, velocityIterations: 10, constraintIterations: 4, enableSleeping: false });
      this.engine.gravity.y = 1.25;
      this.entities = new Map();
      this.entitySequence = 0;
      this.mergeQueue = [];
      this.turnMerges = new Map();
      this.state = 'ready';
      this.clock = 0;
      this.score = 0;
      this.drops = 0;
      this.merges = 0;
      this.highestLevel = 1;
      this.wonOnce = false;
      this.dangerRatio = 0;
      this.dangerActive = false;
      this.lastDropAt = -Infinity;
      this.lastDropped = null;
      this.aimX = config.width / 2;
      this.currentLevel = randomLevel(this.random);
      this.boundaries = [
        Bodies.rectangle(config.wall / 2 - 8, config.height / 2, config.wall + 16, config.height * 4, { isStatic: true, label: 'wall-left', friction: 0.1 }),
        Bodies.rectangle(config.width - config.wall / 2 + 8, config.height / 2, config.wall + 16, config.height * 4, { isStatic: true, label: 'wall-right', friction: 0.1 }),
        Bodies.rectangle(config.width / 2, config.floorY + 30, config.width + 80, 60, { isStatic: true, label: 'floor', friction: 0.15 })
      ];
      Composite.add(this.engine.world, this.boundaries);
      this._collisionHandler = event => this.handleContacts(event.pairs);
      Events.on(this.engine, 'collisionStart', this._collisionHandler);
      Events.on(this.engine, 'collisionActive', this._collisionHandler);
    }

    emit(type, data) { this.onEvent(Object.assign({ type, clock: this.clock }, data || {})); }

    reset(state) {
      for (const body of this.entities.values()) Composite.remove(this.engine.world, body);
      this.entities.clear();
      this.entitySequence = 0;
      this.mergeQueue.length = 0;
      this.turnMerges.clear();
      Engine.clear(this.engine);
      this.clock = 0;
      this.score = this.drops = this.merges = 0;
      this.highestLevel = 1;
      this.wonOnce = false;
      this.dangerRatio = 0;
      this.dangerActive = false;
      this.lastDropAt = -Infinity;
      this.lastDropped = null;
      this.currentLevel = randomLevel(this.random);
      this.aimX = config.width / 2;
      this.state = state;
    }

    start() {
      this.reset('playing');
      this.emit('start');
    }

    goHome() {
      this.reset('ready');
      this.emit('home');
    }

    pause(reason) {
      if (this.state !== 'playing') return false;
      this.state = 'paused';
      this.emit('pause', { reason: reason || '休息一下，再出发。' });
      return true;
    }

    resume() {
      if (this.state !== 'paused' && this.state !== 'won') return false;
      this.state = 'playing';
      this.emit('resume');
      return true;
    }

    setAim(x) {
      const radius = config.levels[this.currentLevel - 1].radius;
      this.aimX = clamp(x, config.wall + radius + 2, config.width - config.wall - radius - 2);
      return this.aimX;
    }

    canDrop() {
      if (this.state !== 'playing' || this.clock - this.lastDropAt < config.dropCooldownMs) return false;
      if (!this.lastDropped || !this.entities.has(this.lastDropped.id)) return true;
      return this.lastDropped.position.y > config.dangerY + this.lastDropped.circleRadius || this.clock - this.lastDropAt > 780;
    }

    drop(x) {
      if (!this.canDrop()) return null;
      if (Number.isFinite(x)) this.setAim(x);
      const level = this.currentLevel;
      const body = this.createEntity(level, this.aimX, config.spawnY, { source: 'drop', turnId: this.drops + 1 });
      this.lastDropped = body;
      this.lastDropAt = this.clock;
      this.drops++;
      this.currentLevel = randomLevel(this.random);
      this.setAim(this.aimX);
      this.emit('drop', { level, body });
      return body;
    }

    createEntity(level, x, y, options) {
      if (!Number.isInteger(level) || level < 1 || level > MAX_LEVEL) throw new RangeError('Unknown character level');
      options = options || {};
      const radius = config.levels[level - 1].radius;
      const body = Bodies.circle(x, y, radius, {
        label: 'whale-' + level,
        restitution: 0.3,
        friction: 0.025,
        frictionStatic: 0.055,
        frictionAir: 0.004,
        density: 0.002,
        sleepThreshold: 150,
        slop: 0.025
      }, 96);
      // Free rotation and non-aligned polygon faces avoid artificial flat ledges.
      const sequence = ++this.entitySequence;
      Body.setAngle(body, ((sequence * 0.61803398875) % 1) * Math.PI * 2);
      Body.setAngularVelocity(body, (sequence % 2 ? 1 : -1) * 0.008);
      body.plugin.whale = {
        level, bornAt: this.clock, hasLanded: !!options.hasLanded,
        mergeLock: false, canMergeAt: this.clock + (options.source === 'merge' ? 100 : 0),
        visualBirth: this.clock, source: options.source || 'fixture', turnId: options.turnId || 0,
        squash: 0, squashVelocity: 0,
        squashAngle: 0, squashNormal: { x: 0, y: 1 }, lastImpactAt: -Infinity
      };
      this.entities.set(body.id, body);
      Composite.add(this.engine.world, body);
      if (level > this.highestLevel) {
        this.highestLevel = level;
        this.emit('discover', { level });
      }
      this.emit('encounter', { level, source: options.source || 'fixture' });
      return body;
    }

    impact(body, speed, normal) {
      const data = body.plugin.whale;
      if (!data || speed < 0.8 || this.clock - data.lastImpactAt < 100) return;
      data.lastImpactAt = this.clock;
      data.squashAngle = Math.atan2(normal.y, normal.x) - Math.PI / 2;
      data.squashNormal = { x: normal.x, y: normal.y };
      data.squashVelocity = Math.min(2.2, data.squashVelocity + speed * 0.25);
      this.emit('impact', { level: data.level, speed });
    }

    updateElasticity(dt) {
      const seconds = dt / 1000;
      for (const body of this.entities.values()) {
        const data = body.plugin.whale;
        data.squashVelocity += (-125 * data.squash - 10.5 * data.squashVelocity) * seconds;
        data.squash = clamp(data.squash + data.squashVelocity * seconds, -0.055, 0.145);
        if (Math.abs(data.squash) < 0.0001 && Math.abs(data.squashVelocity) < 0.001) {
          data.squash = data.squashVelocity = 0;
        }
      }
    }

    handleContacts(pairs) {
      if (this.state !== 'playing') return;
      for (const pair of pairs) {
        const a = pair.bodyA;
        const b = pair.bodyB;
        const aa = a.plugin.whale;
        const bb = b.plugin.whale;
        const normal = pair.collision.normal;
        const speed = Math.abs((a.velocity.x - b.velocity.x) * normal.x + (a.velocity.y - b.velocity.y) * normal.y);
        this.impact(a, speed, { x: -normal.x, y: -normal.y });
        this.impact(b, speed, normal);
        if (aa && this.clock - aa.bornAt > 90) aa.hasLanded = true;
        if (bb && this.clock - bb.bornAt > 90) bb.hasLanded = true;
        if (!aa || !bb || aa.level !== bb.level || aa.level >= MAX_LEVEL || aa.mergeLock || bb.mergeLock) continue;
        if (aa.canMergeAt > this.clock || bb.canMergeAt > this.clock) continue;
        // Lock inside the callback; mutate the world only after Engine.update returns.
        aa.mergeLock = bb.mergeLock = true;
        const massA = Number.isFinite(a.mass) ? a.mass : 1;
        const massB = Number.isFinite(b.mass) ? b.mass : 1;
        const totalMass = massA + massB;
        const velocityA = Body.getVelocity(a), velocityB = Body.getVelocity(b);
        // collisionStart runs before the solver removes the approaching velocity.
        this.mergeQueue.push({ a, b, motion: {
          x: (velocityA.x * massA + velocityB.x * massB) / totalMass,
          y: (velocityA.y * massA + velocityB.y * massB) / totalMass,
          spin: (Body.getAngularVelocity(a) * massA + Body.getAngularVelocity(b) * massB) / totalMass,
          impact: Math.hypot(a.velocity.x - b.velocity.x, a.velocity.y - b.velocity.y),
          squash: (Math.abs(aa.squash) + Math.abs(bb.squash)) / 2,
          squashVelocity: (Math.abs(aa.squashVelocity) + Math.abs(bb.squashVelocity)) / 2
        } });
      }
    }

    processMerges() {
      const queue = this.mergeQueue.splice(0);
      let victory = false;
      for (const { a, b, motion } of queue) {
        if (!this.entities.has(a.id) || !this.entities.has(b.id)) continue;
        const level = a.plugin.whale.level + 1;
        const radius = config.levels[level - 1].radius;
        const turnId = Math.max(a.plugin.whale.turnId, b.plugin.whale.turnId);
        const firstInRound = level > this.highestLevel;
        const x = clamp((a.position.x + b.position.x) / 2, config.wall + radius, config.width - config.wall - radius);
        const y = Math.min((a.position.y + b.position.y) / 2, config.floorY - radius - 1);
        Composite.remove(this.engine.world, a);
        Composite.remove(this.engine.world, b);
        this.entities.delete(a.id);
        this.entities.delete(b.id);
        const result = this.createEntity(level, x, y, { source: 'merge', hasLanded: true, turnId });
        const rebound = clamp(1.65 + motion.impact * 0.08, 1.65, 2.8);
        Body.setVelocity(result, { x: clamp(motion.x, -10, 10), y: clamp(motion.y - rebound, -9, 12) });
        Body.setAngularVelocity(result, clamp(motion.spin, -0.12, 0.12));
        result.plugin.whale.squash = clamp(motion.squash + 0.02, 0.02, 0.08);
        result.plugin.whale.squashVelocity = clamp(motion.squashVelocity + 0.8, 1.4, 2.1);
        // Removed supports can affect a whole pile, not only immediate neighbours.
        for (const neighbour of this.entities.values()) if (!neighbour.isStatic) Sleeping.set(neighbour, false);
        const points = Math.pow(2, level);
        this.score += points;
        this.merges++;
        const comboCount = turnId ? (this.turnMerges.get(turnId) || 0) + 1 : 1;
        if (turnId) this.turnMerges.set(turnId, comboCount);
        this.emit('merge', { level, x, y, points, body: result, turnId, comboCount, firstInRound });
        if (level === MAX_LEVEL && !this.wonOnce) {
          this.wonOnce = true;
          victory = true;
        }
      }
      if (victory) {
        this.state = 'won';
        this.emit('win', { score: this.score });
      }
    }

    checkOverflow() {
      let penetrationRatio = 0, touching = false;
      for (const body of this.entities.values()) {
        const data = body.plugin.whale;
        const eligible = data.hasLanded && !data.mergeLock;
        // Ignore the ordinary descent from above the line. Once a ball contacts
        // the pile, defeat depends on the fraction of its height above the line.
        if (!eligible) continue;
        const depth = config.dangerY - (body.position.y - body.circleRadius);
        if (depth >= 0) touching = true;
        penetrationRatio = Math.max(penetrationRatio, depth / (2 * body.circleRadius * config.overflowHeightFraction));
      }
      this.dangerRatio = clamp(penetrationRatio, 0, 1);
      this.dangerActive = touching;
      if (penetrationRatio > 1 + 1e-9) {
        this.state = 'gameover';
        this.emit('gameover', { score: this.score, drops: this.drops, merges: this.merges, highestLevel: this.highestLevel });
      }
    }

    constrainBodies() {
      // Matter uses polygons for circles. Project the actual visible disks together
      // with walls, rather than clamping one body into its neighbour after a merge.
      const items = [...this.entities.values()].map(body => ({body, x:body.position.x, y:body.position.y, r:body.circleRadius, w:body.isStatic ? 0 : body.inverseMass}));
      for (let iteration = 0; iteration < 96; iteration++) {
        let worst = 0;
        for (const p of items) if (p.w) {
          p.x = clamp(p.x, config.wall+p.r, config.width-config.wall-p.r);
          p.y = Math.min(p.y, config.floorY-p.r);
        }
        for (let i=0;i<items.length;i++) for (let j=i+1;j<items.length;j++) {
          const a=items[i], b=items[j], sum=a.r+b.r;
          let dx=b.x-a.x, dy=b.y-a.y, distance=Math.hypot(dx,dy);
          if (distance > sum+0.12) continue;
          // Exactly horizontal, oversized pairs cannot separate sideways in a bin.
          if (Math.abs(dy)<0.01 && sum*2>config.width-2*config.wall && a.w+b.w) {
            if(b.w)b.y-=0.1;else if(a.w)a.y-=0.1;
            dy=b.y-a.y; distance=Math.hypot(dx,dy);
          }
          const nx=distance>0.00001?dx/distance:0, ny=distance>0.00001?dy/distance:-1;
          const penetration=sum-distance, weight=a.w+b.w;
          worst=Math.max(worst,penetration);
          if(penetration<=0.015||!weight)continue;
          const correction=(penetration-0.008)/weight;
          a.x-=nx*correction*a.w; a.y-=ny*correction*a.w;
          b.x+=nx*correction*b.w; b.y+=ny*correction*b.w;
        }
        if(worst<0.025)break;
      }
      // If a newly expanded disk starts inside an exceptionally full pile, lift
      // the unresolved upper disks into free space. The top is deliberately open:
      // a full bay should rise over the danger line, never tunnel through a wall.
      let unresolved=false;
      for(const p of items)if(p.w){p.x=clamp(p.x,config.wall+p.r,config.width-config.wall-p.r);p.y=Math.min(p.y,config.floorY-p.r);}
      for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++)if(items[i].r+items[j].r-Math.hypot(items[i].x-items[j].x,items[i].y-items[j].y)>.15)unresolved=true;
      if(unresolved){
        const placed=items.filter(p=>!p.w);
        for(const p of items.filter(p=>p.w).sort((a,b)=>b.y-a.y||a.body.id-b.body.id)){
          p.x=clamp(p.x,config.wall+p.r,config.width-config.wall-p.r);p.y=Math.min(p.y,config.floorY-p.r);
          for(const other of placed){const dx=p.x-other.x, sum=p.r+other.r;if(Math.abs(dx)<sum)p.y=Math.min(p.y,other.y-Math.sqrt(sum*sum-dx*dx));}
          placed.push(p);
        }
      }
      for(const p of items) if(p.w) {
        p.x=clamp(p.x,config.wall+p.r,config.width-config.wall-p.r);p.y=Math.min(p.y,config.floorY-p.r);
        const vx=p.body.velocity.x, vy=p.body.velocity.y;
        if(Math.hypot(p.x-p.body.position.x,p.y-p.body.position.y)>0.001){
          Body.setPosition(p.body,{x:p.x,y:p.y});
          p.body.positionImpulse.x=p.body.positionImpulse.y=0;
        }
        if((p.x<=config.wall+p.r+0.01&&vx<0)||(p.x>=config.width-config.wall-p.r-0.01&&vx>0))Body.setVelocity(p.body,{x:Math.abs(vx)<0.8?0:-vx*0.2,y:vy});
        if(p.y>=config.floorY-p.r-0.01&&vy>0)Body.setVelocity(p.body,{x:p.body.velocity.x,y:vy<0.8?0:-vy*0.2});
      }
      // Analytic contacts also merge: projecting polygons apart must not leave
      // equal characters touching forever without a collision event.
      const contacts=[];
      for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){
        const a=items[i].body,b=items[j].body,dx=a.position.x-b.position.x,dy=a.position.y-b.position.y,distance=Math.hypot(dx,dy);
        if(distance<=a.circleRadius+b.circleRadius+0.2)contacts.push({bodyA:a,bodyB:b,collision:{normal:{x:distance?dx/distance:0,y:distance?dy/distance:-1}}});
      }
      this.handleContacts(contacts);
      // Projection repairs geometry; also remove approaching normal velocities.
      // Otherwise gravity and cached solver impulses keep driving a packed pile
      // into itself every frame. Tangential motion and separating bounces survive.
      for(let pass=0;pass<16;pass++){
      for(const {bodyA:a,bodyB:b,collision:{normal:n}} of contacts){
        const weight=a.inverseMass+b.inverseMass;if(!weight)continue;
        const va=Body.getVelocity(a),vb=Body.getVelocity(b);
        const approach=(va.x-vb.x)*n.x+(va.y-vb.y)*n.y;
        if(approach>=0)continue;
        const impulse=-approach/weight;
        if(!a.isStatic)Body.setVelocity(a,{x:va.x+n.x*impulse*a.inverseMass,y:va.y+n.y*impulse*a.inverseMass});
        if(!b.isStatic)Body.setVelocity(b,{x:vb.x-n.x*impulse*b.inverseMass,y:vb.y-n.y*impulse*b.inverseMass});
      }
      for(const p of items)if(p.w){
        const v=Body.getVelocity(p.body);
        const x=((p.x<=config.wall+p.r+.05&&v.x<0)||(p.x>=config.width-config.wall-p.r-.05&&v.x>0))?0:v.x;
        const y=p.y>=config.floorY-p.r-.05&&v.y>0?0:v.y;
        if(x!==v.x||y!==v.y)Body.setVelocity(p.body,{x,y});
      }
      }
    }

    step(milliseconds) {
      if (this.state !== 'playing') return;
      const dt = Math.min(milliseconds || 1000 / 60, 1000 / 60);
      this.clock += dt;
      for (const body of this.entities.values()) if (!body.isStatic && body.isSleeping) Sleeping.set(body, false);
      for(let substep=0;substep<2;substep++) {
        Engine.update(this.engine, dt/2);
        this.processMerges();
        this.constrainBodies();
        // Consume analytic contacts now so a full new disk is separated before paint.
        if(this.mergeQueue.length){this.processMerges();this.constrainBodies();}
      }
      this.updateElasticity(dt);
      if (this.state === 'playing') this.checkOverflow();
    }

    snapshot() {
      return {
        state: this.state, score: this.score, drops: this.drops, merges: this.merges,
        highestLevel: this.highestLevel, currentLevel: this.currentLevel,
        dangerRatio: this.dangerRatio, bodies: Array.from(this.entities.values()).map(body => ({
          id: body.id, level: body.plugin.whale.level, x: body.position.x, y: body.position.y, radius: body.circleRadius
        }))
      };
    }
  }
  return { Session, randomLevel, MAX_LEVEL };
});
