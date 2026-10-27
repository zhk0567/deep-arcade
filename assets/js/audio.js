/* Simple WebAudio sound kit for the arcade. No external assets. */
(function () {
  "use strict";

  var STORAGE_KEY = "ds-arcade-sound";
  var enabled = true;
  var context = null;

  try {
    enabled = window.localStorage.getItem(STORAGE_KEY) !== "off";
  } catch (error) {
    enabled = true;
  }

  function ensure() {
    if (!enabled) return null;
    var AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!context) {
      try {
        context = new AudioContextClass();
      } catch (error) {
        return null;
      }
    }
    if (context.state === "suspended") {
      context.resume().catch(function () {});
    }
    return context;
  }

  function tone(frequency, options) {
    if (!enabled) return;
    var ctx = ensure();
    if (!ctx) return;

    var config = options || {};
    var duration = config.duration || 0.12;
    var gainValue = config.gain == null ? 0.035 : config.gain;
    var startAt = ctx.currentTime + (config.delay || 0);
    var oscillator = ctx.createOscillator();
    var gain = ctx.createGain();
    var filter = ctx.createBiquadFilter();

    oscillator.type = config.type || "sine";
    oscillator.frequency.setValueAtTime(frequency, startAt);
    if (config.to && config.to !== frequency) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, config.to), startAt + duration);
    }
    filter.type = "lowpass";
    filter.frequency.value = config.cutoff || 3800;
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(gainValue, startAt + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.03);
  }

  var audio = {
    isEnabled: function () {
      return enabled;
    },

    setEnabled: function (value) {
      enabled = Boolean(value);
      try {
        window.localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
      } catch (error) {}
      if (enabled) {
        ensure();
        tone(540, { to: 720, duration: 0.1, gain: 0.025 });
      }
    },

    unlock: function () {
      ensure();
    },

    click: function () {
      tone(720, { to: 560, duration: 0.05, type: "triangle", gain: 0.02 });
    },

    charge: function (ratio) {
      tone(180 + ratio * 260, { duration: 0.06, type: "sine", gain: 0.012 });
    },

    jump: function () {
      tone(300, { to: 760, duration: 0.18, type: "triangle", gain: 0.035 });
    },

    land: function (perfect) {
      if (perfect) {
        tone(660, { duration: 0.12, type: "sine", gain: 0.035, delay: 0 });
        tone(990, { duration: 0.2, type: "sine", gain: 0.025, delay: 0.08 });
        tone(1320, { duration: 0.2, type: "sine", gain: 0.018, delay: 0.15 });
      } else {
        tone(320, { to: 220, duration: 0.13, type: "triangle", gain: 0.03 });
      }
    },

    fail: function () {
      tone(220, { to: 70, duration: 0.55, type: "sawtooth", gain: 0.03, cutoff: 1100 });
    },

    drop: function () {
      tone(440, { to: 210, duration: 0.09, type: "sine", gain: 0.02 });
    },

    merge: function (level) {
      var base = 360 + Math.min(level, 9) * 58;
      tone(base, { duration: 0.12, type: "sine", gain: 0.03 });
      tone(base * 1.5, { duration: 0.18, type: "sine", gain: 0.02, delay: 0.05 });
      if (level >= 5) {
        tone(base * 2, { duration: 0.23, type: "sine", gain: 0.015, delay: 0.1 });
      }
    },

    gameOver: function () {
      tone(330, { to: 240, duration: 0.2, type: "triangle", gain: 0.03 });
      tone(230, { to: 130, duration: 0.4, type: "sine", gain: 0.025, delay: 0.15 });
    }
  };

  window.ArcadeAudio = audio;
})();
