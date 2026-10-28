/* ============================================================
   Privacy-first analytics bridge for Umami.
   Loads the Umami script only when a website ID is configured.
   ============================================================ */
(function () {
  "use strict";

  var config = window.ARCADE_ANALYTICS || {};
  var websiteId = String(config.websiteId || "").trim();
  var scriptSrc = String(config.scriptSrc || "https://cloud.umami.is/script.js").trim();
  var configured = websiteId.length > 8 && !/replace|your[-_ ]?id/i.test(websiteId);
  var queue = [];
  var loading = false;
  var loaded = false;
  var MAX_QUEUE = 40;

  function flush() {
    if (!configured || !window.umami || typeof window.umami.track !== "function") return;
    loaded = true;
    while (queue.length) {
      var event = queue.shift();
      try {
        window.umami.track(event.name, event.data);
      } catch (error) {}
    }
  }

  function track(name, data) {
    if (!configured || !name) return;
    if (loaded && window.umami && typeof window.umami.track === "function") {
      try {
        window.umami.track(name, data || {});
      } catch (error) {}
      return;
    }
    if (queue.length < MAX_QUEUE) {
      queue.push({ name: name, data: data || {} });
    }
  }

  function load() {
    if (!configured || loading || loaded || !scriptSrc) return;
    loading = true;
    var script = document.createElement("script");
    script.src = scriptSrc;
    script.defer = true;
    script.async = true;
    script.setAttribute("data-website-id", websiteId);
    script.setAttribute("data-auto-track", "true");
    script.setAttribute("data-do-not-track", "true");
    script.onload = function () {
      window.setTimeout(flush, 0);
    };
    script.onerror = function () {
      loading = false;
    };
    document.head.appendChild(script);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", load, { once: true });
  } else {
    load();
  }

  window.ArcadeAnalytics = {
    track: track,
    isConfigured: function () {
      return configured;
    },
    flush: flush
  };
})();
