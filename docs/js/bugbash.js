// Bug Bash — squash the bugs before they reach production.
//
// A canvas game over a fake `production.ts`: bugs crawl across the code, and every one
// that leaves the board escapes to production and costs SLA. Heisenbugs move when they
// are observed, memory leaks grow, race conditions come in pairs, and features are not
// bugs at all. Coffee, an AI pair programmer and a test suite help. Plus one stray bug
// that wanders across the page once per visit.
(function () {
  "use strict";

  var eschgi = window.eschgi || {};
  function reduced() {
    return !!eschgi.reducedMotion;
  }
  function formatNumber(value) {
    return eschgi.formatNumber ? eschgi.formatNumber(value) : String(value);
  }

  // ------------------------------------------------------------------ artwork
  // Every critter is drawn at the origin facing +x with "radius" r (half its length).
  var PALETTE = {
    bug: { body: "#f05252", dark: "#7f1d1d", legs: "#fca5a5" },
    race: { body: "#f59e0b", dark: "#78350f", legs: "#fde68a" },
    heisen: { body: "#c4b5fd", dark: "#4c1d95", legs: "#ddd6fe" },
    leak: { body: "#38bdf8", dark: "#0c4a6e", legs: "#bae6fd" },
    feature: { body: "#a3e635", dark: "#1a2e05", legs: "#d9f99d" },
  };
  var POWER_COLORS = { coffee: "#f59e0b", ai: "#c4b5fd", tests: "#2cb67d" };
  var FONT = '"Inter Variable", ui-sans-serif, system-ui, sans-serif';

  function dot(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function roundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawBeetle(ctx, r, t, colors, options) {
    options = options || {};
    var gait = t * (options.gait || 16);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Six legs in a tripod gait: two knees and a foot each.
    ctx.strokeStyle = colors.legs;
    ctx.lineWidth = Math.max(1.1, r * 0.1);
    for (var i = 0; i < 3; i++) {
      var rootX = (i - 1) * r * 0.34;
      for (var side = -1; side <= 1; side += 2) {
        var phase = gait + i * Math.PI + (side > 0 ? Math.PI : 0);
        var swing = Math.sin(phase) * r * 0.22;
        ctx.beginPath();
        ctx.moveTo(rootX, side * r * 0.3);
        ctx.lineTo(rootX + swing * 0.6 + (i - 1) * r * 0.14, side * r * 0.76);
        ctx.lineTo(rootX + swing + (i - 1) * r * 0.34, side * r * 1.02);
        ctx.stroke();
      }
    }

    // Antennae.
    var wiggle = Math.sin(t * 7) * r * 0.08;
    ctx.lineWidth = Math.max(1, r * 0.07);
    for (var s = -1; s <= 1; s += 2) {
      ctx.beginPath();
      ctx.moveTo(r * 0.86, s * r * 0.1);
      ctx.quadraticCurveTo(r * 1.15, s * (r * 0.2 + wiggle), r * 1.32, s * (r * 0.5 + wiggle));
      ctx.stroke();
    }

    // Shell, with a soft glow and a shine.
    ctx.save();
    if (!options.flat) {
      ctx.shadowColor = colors.body;
      ctx.shadowBlur = r * 0.9;
    }
    ctx.fillStyle = colors.body;
    ctx.beginPath();
    ctx.ellipse(-r * 0.12, 0, r * 0.7, r * 0.56, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    var shine = ctx.createRadialGradient(-r * 0.32, -r * 0.26, 0, -r * 0.32, -r * 0.26, r * 0.72);
    shine.addColorStop(0, "rgba(255,255,255,0.38)");
    shine.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = shine;
    ctx.beginPath();
    ctx.ellipse(-r * 0.12, 0, r * 0.7, r * 0.56, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = colors.dark;
    ctx.lineWidth = Math.max(1, r * 0.07);
    ctx.beginPath();
    ctx.moveTo(r * 0.36, 0);
    ctx.lineTo(-r * 0.8, 0);
    ctx.stroke();

    ctx.fillStyle = colors.dark;
    dot(ctx, -r * 0.28, -r * 0.27, r * 0.11);
    dot(ctx, -r * 0.28, r * 0.27, r * 0.11);
    dot(ctx, -r * 0.58, -r * 0.16, r * 0.08);
    dot(ctx, -r * 0.58, r * 0.16, r * 0.08);
    dot(ctx, r * 0.04, -r * 0.24, r * 0.07);
    dot(ctx, r * 0.04, r * 0.24, r * 0.07);

    // Thorax, head and two bright eyes.
    ctx.beginPath();
    ctx.ellipse(r * 0.52, 0, r * 0.2, r * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
    dot(ctx, r * 0.8, 0, r * 0.21);
    ctx.fillStyle = "#ffffff";
    dot(ctx, r * 0.89, -r * 0.09, r * 0.055);
    dot(ctx, r * 0.89, r * 0.09, r * 0.055);
  }

  function drawButterfly(ctx, r, t, colors) {
    var flap = 0.3 + 0.7 * Math.abs(Math.sin(t * 8));
    ctx.save();
    ctx.shadowColor = colors.body;
    ctx.shadowBlur = r * 0.8;
    for (var side = -1; side <= 1; side += 2) {
      ctx.fillStyle = colors.body;
      ctx.beginPath();
      ctx.ellipse(r * 0.16, side * r * 0.56 * flap, r * 0.52, r * 0.56 * flap + 0.5, side * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#84cc16";
      ctx.beginPath();
      ctx.ellipse(-r * 0.34, side * r * 0.42 * flap, r * 0.38, r * 0.4 * flap + 0.5, -side * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.fillStyle = "rgba(255,255,255,0.85)";
    dot(ctx, r * 0.3, -r * 0.66 * flap, r * 0.1);
    dot(ctx, r * 0.3, r * 0.66 * flap, r * 0.1);
    dot(ctx, -r * 0.4, -r * 0.46 * flap, r * 0.07);
    dot(ctx, -r * 0.4, r * 0.46 * flap, r * 0.07);

    ctx.fillStyle = colors.dark;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.64, r * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = colors.legs;
    ctx.lineWidth = Math.max(1, r * 0.07);
    ctx.lineCap = "round";
    for (var s = -1; s <= 1; s += 2) {
      ctx.beginPath();
      ctx.moveTo(r * 0.58, 0);
      ctx.quadraticCurveTo(r * 0.86, s * r * 0.1, r * 1.04, s * r * 0.36);
      ctx.stroke();
      ctx.fillStyle = colors.legs;
      dot(ctx, r * 1.04, s * r * 0.36, r * 0.07);
    }
  }

  function drawSparkle(ctx, x, y, size, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.quadraticCurveTo(x, y, x + size, y);
    ctx.quadraticCurveTo(x, y, x, y + size);
    ctx.quadraticCurveTo(x, y, x - size, y);
    ctx.quadraticCurveTo(x, y, x, y - size);
    ctx.fill();
  }

  function drawCritter(ctx, kind, r, t, extra) {
    extra = extra || {};
    var colors = PALETTE[kind];
    if (kind === "feature") {
      drawButterfly(ctx, r, t, colors);
      if (Math.sin(t * 5 + (extra.seed || 0)) > 0.35) drawSparkle(ctx, -r * 0.9, -r * 0.85, r * 0.28, "#ecfccb");
      return;
    }
    if (kind === "race") {
      // Speed lines behind it.
      ctx.strokeStyle = "rgba(245, 158, 11, 0.45)";
      ctx.lineWidth = Math.max(1, r * 0.12);
      ctx.lineCap = "round";
      for (var i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(-r * 1.05, i * r * 0.34);
        ctx.lineTo(-r * (1.6 + Math.abs(i) * 0.2), i * r * 0.34);
        ctx.stroke();
      }
    }
    if (kind === "heisen") {
      // An uncertainty ring: you never quite know where it is.
      ctx.save();
      ctx.setLineDash([3, 4]);
      ctx.lineDashOffset = -t * 18;
      ctx.strokeStyle = "rgba(196, 181, 253, 0.55)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.55, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    drawBeetle(ctx, r, t, colors, { gait: kind === "race" ? 26 : kind === "leak" ? 10 : 16, flat: extra.flat });
    if (kind === "leak" && r >= 13) {
      ctx.fillStyle = colors.dark;
      ctx.font = "800 " + Math.round(r * 0.42) + "px " + FONT;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("MB", -r * 0.16, r * 0.02);
    }
  }

  function drawPowerUp(ctx, kind, r, t) {
    var color = POWER_COLORS[kind];
    var pulse = 1 + Math.sin(t * 4) * 0.06;
    ctx.save();
    ctx.scale(pulse, pulse);
    ctx.shadowColor = color;
    ctx.shadowBlur = r * 0.9;
    ctx.fillStyle = "rgba(12, 12, 14, 0.94)";
    dot(ctx, 0, 0, r);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.5, r * 0.1);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.lineWidth = Math.max(1.4, r * 0.11);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (kind === "coffee") {
      roundedRect(ctx, -r * 0.44, -r * 0.08, r * 0.62, r * 0.52, r * 0.1);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(r * 0.2, r * 0.16, r * 0.15, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      for (var i = 0; i < 2; i++) {
        var x = -r * 0.27 + i * r * 0.27;
        var drift = Math.sin(t * 5 + i) * r * 0.05;
        ctx.beginPath();
        ctx.moveTo(x, -r * 0.2);
        ctx.bezierCurveTo(x - r * 0.1 + drift, -r * 0.32, x + r * 0.1 + drift, -r * 0.42, x + drift, -r * 0.56);
        ctx.stroke();
      }
    } else if (kind === "ai") {
      roundedRect(ctx, -r * 0.44, -r * 0.24, r * 0.88, r * 0.62, r * 0.16);
      ctx.stroke();
      var blink = Math.sin(t * 3) > 0.92 ? 0.25 : 1;
      ctx.save();
      ctx.scale(1, blink);
      dot(ctx, -r * 0.17, (r * 0.06) / blink, r * 0.08);
      dot(ctx, r * 0.17, (r * 0.06) / blink, r * 0.08);
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.24);
      ctx.lineTo(0, -r * 0.44);
      ctx.stroke();
      dot(ctx, 0, -r * 0.5, r * 0.08);
    } else {
      ctx.lineWidth = Math.max(2, r * 0.16);
      ctx.beginPath();
      ctx.moveTo(-r * 0.36, r * 0.02);
      ctx.lineTo(-r * 0.08, r * 0.3);
      ctx.lineTo(r * 0.4, -r * 0.26);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Draws on a small canvas at the device's pixel density (the start panel's legend).
  function paintIcon(canvas, painter) {
    var size = canvas.getBoundingClientRect().width || canvas.width;
    var ratio = Math.min(3, window.devicePixelRatio || 1);
    canvas.width = Math.round(size * ratio);
    canvas.height = Math.round(size * ratio);
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.translate(size / 2, size / 2);
    painter(ctx, size);
  }

  // ------------------------------------------------------------------- helpers
  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function pickOne(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function pickWeighted(weights) {
    var total = 0;
    var key;
    for (key in weights) total += Math.max(0, weights[key]);
    var roll = Math.random() * total;
    for (key in weights) {
      roll -= Math.max(0, weights[key]);
      if (roll <= 0) return key;
    }
    return key;
  }

  function angleDiff(a, b) {
    var d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  // ====================================================================== game
  var api = { isRunning: false, isOnScreen: false };

  function initGame(root) {
    var board = root.querySelector("[data-bb-board]");
    var canvas = root.querySelector("[data-bb-canvas]");
    var code = root.querySelector("[data-bb-code]");
    var panel = root.querySelector("[data-bb-panel]");
    var panelContent = root.querySelector("[data-bb-panel-content]");
    var ctx = canvas && canvas.getContext ? canvas.getContext("2d") : null;
    if (!board || !canvas || !panel || !panelContent || !ctx) return;

    var hud = {
      score: root.querySelector("[data-bb-score]"),
      combo: root.querySelector("[data-bb-combo]"),
      comboWrap: root.querySelector("[data-bb-combo-wrap]"),
      time: root.querySelector("[data-bb-time]"),
      sla: root.querySelector("[data-bb-sla]"),
      shield: root.querySelector("[data-bb-shield]"),
      shieldCount: root.querySelector("[data-bb-shield-count]"),
    };
    var bestElements = document.querySelectorAll("[data-bb-best]");
    var coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;

    // The code lines are blocks; the newlines between them in the markup would double them.
    if (code) {
      Array.prototype.slice.call(code.childNodes).forEach(function (node) {
        if (node.nodeType === 3 && !node.nodeValue.trim()) node.remove();
      });
    }
    var lineElements = code ? Array.prototype.slice.call(code.querySelectorAll(".bb-line")) : [];
    var lineBoxes = [];

    // --- best score -------------------------------------------------------
    var BEST_KEY = "eschgi.bugbash.best";
    function readBest() {
      try {
        return parseInt(window.localStorage.getItem(BEST_KEY), 10) || 0;
      } catch (error) {
        return 0;
      }
    }
    function writeBest(value) {
      try {
        window.localStorage.setItem(BEST_KEY, String(value));
      } catch (error) {
        /* private mode: the best lives as long as the page */
      }
    }
    function showBest() {
      var best = readBest();
      Array.prototype.forEach.call(bestElements, function (element) {
        element.textContent = formatNumber(best);
      });
    }
    showBest();

    // --- the legend in the start panel ------------------------------------
    function paintLegend() {
      Array.prototype.forEach.call(root.querySelectorAll("[data-kind] canvas"), function (icon) {
        var kind = icon.parentNode.getAttribute("data-kind");
        paintIcon(icon, function (iconCtx, size) {
          iconCtx.rotate(-Math.PI / 2);
          drawCritter(iconCtx, kind, size * 0.27, 0.35, { flat: false, seed: 1 });
        });
      });
      Array.prototype.forEach.call(root.querySelectorAll("canvas[data-power]"), function (icon) {
        var kind = icon.getAttribute("data-power");
        paintIcon(icon, function (iconCtx, size) {
          drawPowerUp(iconCtx, kind, size * 0.4, 0);
        });
      });
    }
    paintLegend();

    // --- sizing -----------------------------------------------------------
    var width = 0;
    var height = 0;
    function resize() {
      var rect = board.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      if (width && height && (rect.width !== width || rect.height !== height)) {
        var sx = rect.width / width;
        var sy = rect.height / height;
        critters.concat(powerUps).forEach(function (item) {
          item.x *= sx;
          item.y *= sy;
          if (item.tx !== undefined) {
            item.tx *= sx;
            item.ty *= sy;
          }
        });
      }
      width = rect.width;
      height = rect.height;
      var ratio = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      lineBoxes = lineElements.map(function (line) {
        return { element: line, top: line.offsetTop, bottom: line.offsetTop + line.offsetHeight };
      });
      if (state !== "running") drawFrame(performance.now() / 1000);
    }

    // --- state ------------------------------------------------------------
    var ROUND_SECONDS = 45;
    var CROSS_TIME = { bug: 6.4, race: 3.4, heisen: 6.2, leak: 10.5, feature: 7 };
    var RADIUS = { bug: 15, race: 11, heisen: 15, leak: 15, feature: 17 };
    var POINTS = { bug: 10, race: 20, heisen: 30, leak: 25 };
    var FIX_LINES = ["Fixed!", "LGTM ✓", "Resolved", "Closed", "Squashed!", "fix: bug", "Ship it!"];
    var ESCAPE_LINES = ["Escaped to prod!", "A customer found it", "Hotfix needed 🔥", "📟 On-call paged", "Works on my machine", "Reopened"];
    var MISS_LINES = ["miss", "false positive", "can't reproduce", "not a bug"];
    var RANKS = [
      [0, "Intern with a flyswatter"],
      [150, "Junior Debugger"],
      [400, "Senior Bug Hunter"],
      [700, "Staff Exterminator"],
      [1100, "Principal Debugger"],
      [1600, "10x Engineer 🦄"],
    ];

    var state = "idle";
    var critters = [];
    var powerUps = [];
    var particles = [];
    var popups = [];
    var zaps = [];
    var raceKills = {};
    var score, streak, multiplier, bestMultiplier, clock, sla, shield;
    var fixedCount, escapedCount, hits, misses, featuresSquashed, featuresShipped;
    var slowUntil, aiActive, aiUntil, aiNextZap, aiZaps, spawnIn, powerIn, lastPower, lastHitAt, nextId;
    var pointer = null;
    var frameId = 0;
    var lastTime = 0;
    var shownTime = -1;

    function resetGame() {
      critters = [];
      powerUps = [];
      particles = [];
      popups = [];
      zaps = [];
      raceKills = {};
      score = 0;
      streak = 0;
      multiplier = 1;
      bestMultiplier = 1;
      clock = 0;
      sla = 100;
      shield = 0;
      fixedCount = 0;
      escapedCount = 0;
      hits = 0;
      misses = 0;
      featuresSquashed = 0;
      featuresShipped = 0;
      slowUntil = 0;
      aiActive = false;
      aiUntil = 0;
      aiNextZap = 0;
      aiZaps = 0;
      spawnIn = 0.5;
      powerIn = rand(6.5, 9);
      lastPower = "";
      lastHitAt = -10;
      nextId = 1;
      shownTime = -1;
      updateHud();
    }

    function sizeScale() {
      return Math.max(0.82, Math.min(1.12, Math.min(width, height * 1.6) / 760));
    }

    function progress() {
      return Math.min(1, clock / ROUND_SECONDS);
    }

    // --- spawning ---------------------------------------------------------
    function spawn(kind, options) {
      options = options || {};
      var r = RADIUS[kind] * sizeScale();
      var margin = r * 2 + 6;
      var side = Math.floor(Math.random() * 4);
      var x, y, tx, ty;
      if (side === 0) {
        x = -margin;
        y = rand(0.12, 0.88) * height;
        tx = width + margin;
        ty = rand(0.1, 0.9) * height;
      } else if (side === 1) {
        x = width + margin;
        y = rand(0.12, 0.88) * height;
        tx = -margin;
        ty = rand(0.1, 0.9) * height;
      } else if (side === 2) {
        x = rand(0.1, 0.9) * width;
        y = -margin;
        tx = rand(0.1, 0.9) * width;
        ty = height + margin;
      } else {
        x = rand(0.1, 0.9) * width;
        y = height + margin;
        tx = rand(0.1, 0.9) * width;
        ty = -margin;
      }
      if (options.x !== undefined) {
        x = options.x;
        y = options.y;
      }
      if (options.tx !== undefined) {
        tx = options.tx;
        ty = options.ty;
      }
      var cross = CROSS_TIME[kind] * (1 - 0.32 * progress()) * rand(0.88, 1.12);
      var critter = {
        id: nextId++,
        kind: kind,
        x: x,
        y: y,
        tx: tx,
        ty: ty,
        r: r,
        baseR: r,
        angle: Math.atan2(ty - y, tx - x),
        speed: Math.max(width, height) / cross,
        hp: kind === "leak" ? 3 : 1,
        blinks: kind === "heisen" ? 2 : 0,
        blinkCooldown: 0,
        wander: rand(0, 10),
        wanderFreq: kind === "race" ? 7 : rand(1.2, 2.2),
        wanderAmp: kind === "race" ? 0.8 : rand(0.25, 0.5),
        age: 0,
        maxAge: cross * 2.8,
        entered: !!options.inside,
        group: options.group || 0,
        seed: rand(0, 100),
        flash: 0,
      };
      critters.push(critter);
      return critter;
    }

    function spawnWave() {
      var p = progress();
      var kind = pickWeighted({
        bug: 5 - 2.2 * p,
        race: 0.5 + 1.6 * p,
        heisen: 0.35 + 1.3 * p,
        leak: 0.25 + 1.1 * p,
        feature: 0.85,
      });
      if (kind !== "race") {
        spawn(kind);
        return;
      }
      // A race condition never comes alone: its twin is right behind it.
      var group = nextId;
      var first = spawn("race", { group: group });
      var back = first.r * 2.6;
      var across = first.angle + Math.PI / 2;
      spawn("race", {
        group: group,
        x: first.x - Math.cos(first.angle) * back + Math.cos(across) * back * 0.6,
        y: first.y - Math.sin(first.angle) * back + Math.sin(across) * back * 0.6,
        tx: first.tx + Math.cos(across) * back,
        ty: first.ty + Math.sin(across) * back,
      });
    }

    function spawnPowerUp() {
      var kinds = ["coffee", "ai", "tests"].filter(function (kind) {
        return kind !== lastPower;
      });
      var kind = pickOne(kinds);
      lastPower = kind;
      var r = 15 * sizeScale();
      powerUps.push({
        kind: kind,
        x: rand(0.12, 0.88) * width,
        y: rand(0.18, 0.82) * height,
        r: r,
        age: 0,
        life: 5.5,
      });
    }

    // --- effects ------------------------------------------------------------
    function popup(x, y, text, color) {
      popups.push({
        x: Math.max(90, Math.min(width - 90, x)),
        y: Math.max(48, Math.min(height - 12, y)),
        text: text,
        color: color,
        age: 0,
        life: 1.1,
      });
    }

    function burst(x, y, color, count, speed) {
      var n = reduced() ? Math.ceil(count / 2) : count;
      for (var i = 0; i < n; i++) {
        var angle = rand(0, Math.PI * 2);
        var velocity = rand(0.3, 1) * (speed || 200);
        particles.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity,
          size: rand(1.5, 3.2),
          color: color,
          age: 0,
          life: rand(0.35, 0.7),
        });
      }
    }

    function ring(x, y, color, size) {
      particles.push({ ring: true, x: x, y: y, size: size || 30, color: color, age: 0, life: 0.4 });
    }

    function flashLine(y, className) {
      for (var i = 0; i < lineBoxes.length; i++) {
        var box = lineBoxes[i];
        if (y >= box.top && y < box.bottom) {
          var element = box.element;
          element.classList.add(className);
          window.setTimeout(function () {
            element.classList.remove(className);
          }, 450);
          return;
        }
      }
    }

    function restartAnimation(className) {
      board.classList.remove(className);
      void board.offsetWidth;
      board.classList.add(className);
    }

    function hurt() {
      restartAnimation("is-hurt");
    }

    function shake() {
      if (!reduced()) restartAnimation("is-shake");
    }

    // --- scoring ------------------------------------------------------------
    function addScore(points, withMultiplier) {
      var gained = withMultiplier ? points * multiplier : points;
      score = Math.max(0, score + gained);
      return gained;
    }

    function setStreak(value) {
      streak = value;
      var next = Math.min(4, 1 + Math.floor(streak / 4));
      if (next !== multiplier) {
        multiplier = next;
        bestMultiplier = Math.max(bestMultiplier, multiplier);
        if (hud.comboWrap && multiplier > 1) {
          hud.comboWrap.classList.remove("is-bump");
          void hud.comboWrap.offsetWidth;
          hud.comboWrap.classList.add("is-bump");
        }
      }
    }

    function removeCritter(critter) {
      var index = critters.indexOf(critter);
      if (index >= 0) critters.splice(index, 1);
    }

    function kill(critter, byPlayer) {
      removeCritter(critter);
      fixedCount++;
      var colors = PALETTE[critter.kind];
      if (byPlayer) {
        setStreak(streak + 1);
        var gained = addScore(POINTS[critter.kind], true);
        popup(critter.x, critter.y - critter.r - 6, Math.random() < 0.22 ? pickOne(FIX_LINES) : "+" + gained, colors.body);

        // Both halves of a race condition within 1.6 s: synchronized.
        if (critter.kind === "race" && critter.group) {
          var twinAlive = critters.some(function (other) {
            return other.group === critter.group;
          });
          if (!twinAlive && raceKills[critter.group] !== undefined && clock - raceKills[critter.group] < 1.6) {
            addScore(30, false);
            popup(critter.x, critter.y - critter.r - 26, "Synchronized! +30", "#fde68a");
          }
          raceKills[critter.group] = clock;
        }
      } else {
        addScore(POINTS[critter.kind], false);
        popup(critter.x, critter.y - critter.r - 6, "AI fixed it 🤖", PALETTE.heisen.body);
      }
      burst(critter.x, critter.y, colors.body, 14);
      ring(critter.x, critter.y, "#2cb67d", critter.r * 2.2);
      flashLine(critter.y, "is-fixed");
    }

    function teleport(critter, label) {
      burst(critter.x, critter.y, PALETTE.heisen.body, 10, 120);
      popup(critter.x, critter.y - critter.r - 6, label, PALETTE.heisen.body);
      var best = null;
      var bestDistance = -1;
      for (var i = 0; i < 14; i++) {
        var candidate = { x: rand(0.1, 0.9) * width, y: rand(0.12, 0.88) * height };
        var from = pointer || critter;
        var distance = Math.hypot(candidate.x - from.x, candidate.y - from.y);
        if (distance > bestDistance) {
          bestDistance = distance;
          best = candidate;
        }
      }
      critter.x = best.x;
      critter.y = best.y;
      critter.entered = true;
      critter.blinks--;
      critter.blinkCooldown = 0.9;
      burst(critter.x, critter.y, PALETTE.heisen.body, 10, 120);
    }

    function escape(critter) {
      var x = Math.max(20, Math.min(width - 20, critter.x));
      var y = Math.max(20, Math.min(height - 20, critter.y));
      if (critter.kind === "feature") {
        featuresShipped++;
        addScore(5, false);
        popup(x, y, "Feature shipped 🚀", "#a3e635");
        return;
      }
      if (shield > 0) {
        shield--;
        popup(x, y, "Caught in CI ✅", "#2cb67d");
        ring(x, y, "#2cb67d", 40);
        return;
      }
      escapedCount++;
      sla = Math.max(0, sla - (critter.kind === "leak" ? 20 : 10));
      popup(x, y, critter.kind === "leak" ? "Out of memory in prod!" : pickOne(ESCAPE_LINES), "#f05252");
      flashLine(y, "is-broken");
      setStreak(0);
      hurt();
    }

    function collect(powerUp) {
      var color = POWER_COLORS[powerUp.kind];
      burst(powerUp.x, powerUp.y, color, 16, 180);
      ring(powerUp.x, powerUp.y, color, 44);
      if (powerUp.kind === "coffee") {
        slowUntil = clock + 5;
        popup(powerUp.x, powerUp.y - 24, "Coffee! Bugs slowed ☕", color);
      } else if (powerUp.kind === "ai") {
        aiActive = true;
        aiUntil = clock + 4.5;
        aiNextZap = clock + 0.3;
        aiZaps = 0;
        popup(powerUp.x, powerUp.y - 24, "AI pair programmer on 🤖", color);
      } else {
        shield = Math.min(3, shield + 2);
        popup(powerUp.x, powerUp.y - 24, "Test suite +2 ✅", color);
      }
    }

    function aiZap() {
      var candidates = critters.filter(function (critter) {
        return critter.entered && critter.kind !== "feature";
      });
      if (!candidates.length) return;
      var target = pickOne(candidates);
      zaps.push({ x: width / 2, y: 30, tx: target.x, ty: target.y, age: 0, life: 0.28 });
      aiZaps++;
      kill(target, false);
    }

    // The AI pair programmer sometimes leaves a little something behind.
    function endAi() {
      aiActive = false;
      if (aiZaps > 0 && Math.random() < 0.5) {
        var regression = spawn("bug", {
          x: rand(0.25, 0.75) * width,
          y: rand(0.3, 0.7) * height,
          inside: true,
        });
        popup(regression.x, regression.y - regression.r - 8, "AI introduced a regression 🙃", PALETTE.heisen.body);
        burst(regression.x, regression.y, PALETTE.heisen.body, 10, 120);
      } else {
        popup(width / 2, 52, "AI pair: done ✓", PALETTE.heisen.body);
      }
    }

    // --- input -----------------------------------------------------------
    function localPoint(event) {
      var rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    function onPointerDown(event) {
      if (state !== "running") return;
      event.preventDefault();
      var point = localPoint(event);
      pointer = point;
      var tolerance = event.pointerType === "mouse" ? 6 : 16;

      for (var i = powerUps.length - 1; i >= 0; i--) {
        var powerUp = powerUps[i];
        if (Math.hypot(point.x - powerUp.x, point.y - powerUp.y) <= powerUp.r + tolerance + 4) {
          powerUps.splice(i, 1);
          collect(powerUp);
          updateHud();
          return;
        }
      }

      var target = null;
      var nearest = Infinity;
      critters.forEach(function (critter) {
        var distance = Math.hypot(point.x - critter.x, point.y - critter.y);
        if (distance <= critter.r * 1.15 + tolerance && distance < nearest) {
          nearest = distance;
          target = critter;
        }
      });

      if (!target) {
        misses++;
        setStreak(0);
        ring(point.x, point.y, "#94a3b8", 18);
        if (Math.random() < 0.35) popup(point.x, point.y - 14, pickOne(MISS_LINES), "#94a3b8");
        updateHud();
        return;
      }

      if (target.kind === "heisen" && target.blinks > 0 && Math.random() < 0.5) {
        teleport(target, "it moved!");
        return;
      }

      if (target.kind === "feature") {
        removeCritter(target);
        featuresSquashed++;
        addScore(-25, false);
        setStreak(0);
        burst(target.x, target.y, PALETTE.feature.body, 12);
        popup(target.x, target.y - target.r - 6, pickOne(["That was a feature! 🙃", "Not a bug! −25", "Product is calling 📞"]), "#f59e0b");
        shake();
        updateHud();
        return;
      }

      hits++;
      lastHitAt = clock;
      if (target.kind === "leak" && target.hp > 1) {
        target.hp--;
        target.baseR *= 0.8;
        target.age *= 0.35;
        target.flash = 0.15;
        setStreak(streak + 1);
        addScore(5, true);
        popup(target.x, target.y - target.r - 6, "−256 MB", PALETTE.leak.body);
        burst(target.x, target.y, PALETTE.leak.body, 6, 140);
        updateHud();
        return;
      }

      kill(target, true);
      updateHud();
    }

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", function (event) {
      if (event.pointerType === "mouse") pointer = localPoint(event);
    });
    canvas.addEventListener("pointerleave", function () {
      pointer = null;
    });

    root.addEventListener("keydown", function (event) {
      var key = event.key.toLowerCase();
      if (state === "running" && (key === "p" || key === "escape")) {
        event.preventDefault();
        pause("You pressed pause. Even debuggers need a break.");
      } else if (state === "paused" && key === "p") {
        event.preventDefault();
        resume();
      }
    });

    panel.addEventListener("click", function (event) {
      if (event.target.closest("[data-bb-start]")) startGame();
      else if (event.target.closest("[data-bb-resume]")) resume();
    });

    // --- loop -------------------------------------------------------------
    function update(dt) {
      clock += dt;
      var p = progress();
      var slow = clock < slowUntil ? 0.45 : 1;

      spawnIn -= dt;
      if (spawnIn <= 0) {
        spawnWave();
        spawnIn = (1.05 - 0.63 * p) * rand(0.75, 1.25);
      }
      powerIn -= dt;
      if (powerIn <= 0) {
        spawnPowerUp();
        powerIn = rand(9, 12.5);
      }

      if (aiActive) {
        if (clock >= aiUntil) endAi();
        else if (clock >= aiNextZap) {
          aiNextZap = clock + 0.5;
          aiZap();
        }
      }

      for (var i = critters.length - 1; i >= 0; i--) {
        var critter = critters[i];
        critter.age += dt;
        critter.flash = Math.max(0, critter.flash - dt);
        critter.blinkCooldown = Math.max(0, critter.blinkCooldown - dt);

        if (critter.kind === "leak") critter.r = critter.baseR * (1 + Math.min(1.1, critter.age * 0.09));

        // A Heisenbug notices the cursor coming and is somewhere else.
        if (
          critter.kind === "heisen" &&
          critter.blinks > 0 &&
          critter.blinkCooldown <= 0 &&
          critter.entered &&
          pointer &&
          !coarse &&
          Math.hypot(pointer.x - critter.x, pointer.y - critter.y) < critter.r + 44
        ) {
          teleport(critter, "observed!");
        }

        critter.wander += dt * critter.wanderFreq;
        var desired = Math.atan2(critter.ty - critter.y, critter.tx - critter.x) + Math.sin(critter.wander) * critter.wanderAmp;
        var turn = (critter.kind === "race" ? 7 : 3.2) * dt;
        critter.angle += Math.max(-turn, Math.min(turn, angleDiff(desired, critter.angle)));
        var speed = critter.speed * slow;
        if (critter.kind === "leak") speed *= 1.15 - Math.min(0.45, critter.age * 0.04);
        critter.x += Math.cos(critter.angle) * speed * dt;
        critter.y += Math.sin(critter.angle) * speed * dt;

        var r = critter.r;
        if (critter.x > r && critter.x < width - r && critter.y > r && critter.y < height - r) critter.entered = true;
        var out = critter.x < -r * 2 - 8 || critter.x > width + r * 2 + 8 || critter.y < -r * 2 - 8 || critter.y > height + r * 2 + 8;
        if ((critter.entered && out) || critter.age > critter.maxAge) {
          critters.splice(i, 1);
          escape(critter);
        }
      }

      for (i = powerUps.length - 1; i >= 0; i--) {
        powerUps[i].age += dt;
        if (powerUps[i].age > powerUps[i].life) powerUps.splice(i, 1);
      }
      for (i = particles.length - 1; i >= 0; i--) {
        var particle = particles[i];
        particle.age += dt;
        if (particle.age > particle.life) {
          particles.splice(i, 1);
          continue;
        }
        if (!particle.ring) {
          particle.x += particle.vx * dt;
          particle.y += particle.vy * dt;
          particle.vx *= 0.92;
          particle.vy *= 0.92;
        }
      }
      for (i = popups.length - 1; i >= 0; i--) {
        popups[i].age += dt;
        if (popups[i].age > popups[i].life) popups.splice(i, 1);
      }
      for (i = zaps.length - 1; i >= 0; i--) {
        zaps[i].age += dt;
        if (zaps[i].age > zaps[i].life) zaps.splice(i, 1);
      }

      if (streak > 0 && clock - lastHitAt > 2.2) setStreak(0);

      if (sla <= 0) endGame("down");
      else if (clock >= ROUND_SECONDS) endGame("time");
    }

    function drawFrame(t) {
      ctx.clearRect(0, 0, width, height);

      if (state === "running" && clock < slowUntil) {
        ctx.fillStyle = "rgba(245, 158, 11, 0.06)";
        ctx.fillRect(0, 0, width, height);
      }

      if (aiActive) {
        var glow = ctx.createLinearGradient(0, 0, 0, 70);
        glow.addColorStop(0, "rgba(196, 181, 253, 0.2)");
        glow.addColorStop(1, "rgba(196, 181, 253, 0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, 70);
        ctx.save();
        ctx.translate(width / 2, 30);
        drawPowerUp(ctx, "ai", 15, t);
        ctx.restore();
      }

      zaps.forEach(function (zap) {
        var fade = 1 - zap.age / zap.life;
        ctx.save();
        ctx.strokeStyle = "rgba(196, 181, 253, " + fade.toFixed(3) + ")";
        ctx.lineWidth = 2.5;
        ctx.shadowColor = "#c4b5fd";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(zap.x, zap.y);
        ctx.lineTo(zap.tx, zap.ty);
        ctx.stroke();
        ctx.restore();
      });

      powerUps.forEach(function (powerUp) {
        var left = powerUp.life - powerUp.age;
        if (left < 1.5 && Math.floor(left * 8) % 2 === 0) return;
        ctx.save();
        ctx.translate(powerUp.x, powerUp.y);
        drawPowerUp(ctx, powerUp.kind, powerUp.r, t);
        ctx.restore();
      });

      critters.forEach(function (critter) {
        ctx.save();
        ctx.translate(critter.x, critter.y);
        ctx.rotate(critter.angle);
        if (critter.kind === "heisen") ctx.globalAlpha = 0.55 + 0.35 * Math.sin(t * 7 + critter.seed);
        drawCritter(ctx, critter.kind, critter.r, t + critter.seed, { seed: critter.seed });
        if (critter.flash > 0) {
          ctx.globalAlpha = 0.6;
          ctx.fillStyle = "#ffffff";
          dot(ctx, 0, 0, critter.r * 0.8);
        }
        ctx.restore();
      });

      particles.forEach(function (particle) {
        var fade = 1 - particle.age / particle.life;
        ctx.globalAlpha = fade;
        if (particle.ring) {
          ctx.strokeStyle = particle.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, 4 + (1 - fade) * particle.size, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.fillStyle = particle.color;
          dot(ctx, particle.x, particle.y, particle.size);
        }
      });
      ctx.globalAlpha = 1;

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "700 13px " + FONT;
      ctx.lineJoin = "round";
      popups.forEach(function (item) {
        var k = item.age / item.life;
        var rise = (1 - Math.pow(1 - Math.min(1, k * 1.6), 3)) * 26;
        ctx.globalAlpha = 1 - Math.pow(k, 2.2);
        ctx.lineWidth = 4;
        ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
        ctx.strokeText(item.text, item.x, item.y - rise);
        ctx.fillStyle = item.color;
        ctx.fillText(item.text, item.x, item.y - rise);
      });
      ctx.globalAlpha = 1;
    }

    function updateHud() {
      if (hud.score) hud.score.textContent = formatNumber(score || 0);
      if (hud.combo) hud.combo.textContent = "×" + (multiplier || 1);
      var seconds = Math.ceil(Math.max(0, ROUND_SECONDS - (clock || 0)));
      if (hud.time && seconds !== shownTime) {
        hud.time.textContent = String(seconds);
        shownTime = seconds;
      }
      if (hud.sla) {
        hud.sla.style.width = sla + "%";
        hud.sla.classList.toggle("is-warn", sla <= 60 && sla > 30);
        hud.sla.classList.toggle("is-bad", sla <= 30);
      }
      if (hud.shield) hud.shield.hidden = !shield;
      if (hud.shieldCount) hud.shieldCount.textContent = String(shield || 0);
    }

    function loop(now) {
      if (state !== "running") return;
      var dt = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 1 / 60;
      lastTime = now;
      update(dt);
      if (state !== "running") return;
      drawFrame(now / 1000);
      updateHud();
      frameId = window.requestAnimationFrame(loop);
    }

    // --- panels -----------------------------------------------------------
    function showPanel(html, focusSelector) {
      panelContent.innerHTML = html;
      panel.hidden = false;
      var focusTarget = panelContent.querySelector(focusSelector || "button");
      if (focusTarget) focusTarget.focus({ preventScroll: true });
    }

    function rankFor(value) {
      var rank = RANKS[0][1];
      RANKS.forEach(function (entry) {
        if (value >= entry[0]) rank = entry[1];
      });
      return rank;
    }

    function quipFor(reason, accuracy) {
      if (reason === "down") return "Production is down and somewhere a pager is buzzing. Maybe write a few more tests?";
      if (featuresSquashed >= 3) return "You squashed " + featuresSquashed + " features. Product would like a word.";
      if (escapedCount === 0) return "Zero bugs reached production. Deploy it — even on a Friday.";
      if (hits + misses > 8 && accuracy < 50) return "Lots of false positives. Have you tried reading the stack trace?";
      return pickOne([
        "The backlog thanks you.",
        "Solid work. Time for a coffee ☕",
        "They'll be back. Bugs always are.",
        "Not bad — merge approved.",
      ]);
    }

    function fact(label, value) {
      return "<div><dt>" + escapeHtml(label) + "</dt><dd>" + escapeHtml(value) + "</dd></div>";
    }

    function endGame(reason) {
      state = "over";
      api.isRunning = false;
      window.cancelAnimationFrame(frameId);
      updateHud();
      drawFrame(performance.now() / 1000);

      var best = readBest();
      var record = score > best;
      if (record) writeBest(score);
      showBest();

      var accuracy = hits + misses > 0 ? Math.round((hits / (hits + misses)) * 100) : 0;
      var title =
        reason === "down" ? "Production is down 🔥" : escapedCount === 0 ? "Flawless release 🚀" : "Ship it! 🚀";
      showPanel(
        '<p class="overline">' +
          (reason === "down" ? "SLA breached" : "Time's up") +
          "</p>" +
          '<h3 class="game__panel-title">' +
          title +
          "</h3>" +
          '<p class="bb-result__score">' +
          formatNumber(score) +
          "</p>" +
          '<p class="bb-result__rank">' +
          escapeHtml(rankFor(score)) +
          "</p>" +
          '<p class="bb-result__quip">' +
          escapeHtml(quipFor(reason, accuracy)) +
          "</p>" +
          (record && score > 0
            ? '<span class="pill pill--positive bb-result__record">New personal best</span>'
            : '<p class="game__hint">Your best: ' + formatNumber(Math.max(best, score)) + "</p>") +
          '<dl class="bb-result__facts">' +
          fact("Fixed", fixedCount) +
          fact("Escaped", escapedCount) +
          fact("Accuracy", accuracy + "%") +
          fact("Best combo", "×" + bestMultiplier) +
          "</dl>" +
          '<div class="bb-result__actions">' +
          '<button class="btn btn--primary btn--lg" type="button" data-bb-start>' +
          '<svg aria-hidden="true"><use href="#i-replay" /></svg>Play again</button>' +
          "</div>"
      );
    }

    function startGame() {
      resize();
      resetGame();
      state = "running";
      api.isRunning = true;
      panel.hidden = true;
      canvas.focus({ preventScroll: true });
      lastTime = 0;
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(loop);
    }

    function pause(message) {
      if (state !== "running") return;
      state = "paused";
      api.isRunning = false;
      window.cancelAnimationFrame(frameId);
      showPanel(
        '<p class="overline">Paused</p>' +
          '<h3 class="game__panel-title">Taking a break ⏸</h3>' +
          '<p class="game__panel-text">' +
          escapeHtml(message) +
          "</p>" +
          '<div class="bb-result__actions">' +
          '<button class="btn btn--primary btn--lg" type="button" data-bb-resume>' +
          '<svg aria-hidden="true"><use href="#i-play" /></svg>Resume</button>' +
          '<button class="btn btn--ghost btn--lg" type="button" data-bb-start>' +
          '<svg aria-hidden="true"><use href="#i-replay" /></svg>Restart</button>' +
          "</div>" +
          '<p class="game__hint"><span class="hide-touch">P resumes</span></p>'
      );
    }

    function resume() {
      if (state !== "paused") return;
      state = "running";
      api.isRunning = true;
      panel.hidden = true;
      canvas.focus({ preventScroll: true });
      lastTime = 0;
      frameId = window.requestAnimationFrame(loop);
    }

    // Pause when the tab or the board goes out of sight.
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) pause("The tab went to the background, so the bugs are waiting for you.");
    });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            api.isOnScreen = entry.isIntersecting;
            if (!entry.isIntersecting) pause("The board scrolled out of view, so the bugs are waiting for you.");
          });
        },
        { threshold: 0.35 }
      ).observe(board);
    }

    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(board);
    else window.addEventListener("resize", resize);
    resize();
    resetGame();

    // The terminal's `bugbash` command.
    document.addEventListener("eschgi:bugbash", function () {
      if (eschgi.scrollToSection) eschgi.scrollToSection("bugbash");
      window.setTimeout(
        function () {
          if (state === "paused") resume();
          else if (state !== "running") startGame();
        },
        reduced() ? 50 : 650
      );
    });

    api.focusStart = function () {
      var button = panel.hidden ? null : panel.querySelector("[data-bb-start], [data-bb-resume]");
      if (button) button.focus({ preventScroll: true });
    };
  }

  // ================================================================ stray bug
  // Once per visit, one bug escapes the game and wanders across the page.
  function strayBug() {
    if (reduced()) return;
    try {
      if (window.sessionStorage.getItem("eschgi.stray")) return;
    } catch (error) {
      return;
    }

    function blocked() {
      return document.hidden || api.isRunning || api.isOnScreen || document.querySelector(".egg");
    }

    function attempt() {
      if (blocked()) {
        window.setTimeout(attempt, 6000);
        return;
      }
      launch();
    }
    window.setTimeout(attempt, 16000);

    function launch() {
      try {
        window.sessionStorage.setItem("eschgi.stray", "1");
      } catch (error) {
        /* ignore */
      }

      var button = document.createElement("button");
      button.type = "button";
      button.className = "stray-bug";
      button.setAttribute("aria-label", "A bug escaped into the page. Squash it!");
      var canvas = document.createElement("canvas");
      button.appendChild(canvas);
      document.body.appendChild(button);

      var ratio = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = 44 * ratio;
      canvas.height = 44 * ratio;
      var ctx = canvas.getContext("2d");

      var viewportWidth = window.innerWidth;
      var viewportHeight = window.innerHeight;
      var leftToRight = Math.random() < 0.5;
      var baseY = viewportHeight * rand(0.6, 0.8);
      var duration = 7000 + viewportWidth * 3.2;
      var stopAt = rand(0.38, 0.58);
      var stopFor = 900;
      var startTime = 0;
      var stopped = 0;
      var frameId = 0;
      var x = 0;
      var y = 0;
      var done = false;

      function positionAt(p) {
        var px = -40 + p * (viewportWidth + 80);
        return {
          x: leftToRight ? px : viewportWidth - px,
          y: baseY + Math.sin(p * Math.PI * 3) * 46,
        };
      }

      function frame(now) {
        if (done) return;
        if (!startTime) startTime = now;
        var elapsed = now - startTime;
        // A real bug stops for a moment, as if it were thinking.
        var stopStart = stopAt * duration;
        var moving = elapsed < stopStart ? elapsed : elapsed < stopStart + stopFor ? stopStart : elapsed - stopFor;
        stopped = elapsed >= stopStart && elapsed < stopStart + stopFor;
        var p = moving / duration;
        if (p >= 1) {
          finish();
          return;
        }
        var here = positionAt(p);
        var ahead = positionAt(Math.min(1, p + 0.002));
        var angle = Math.atan2(ahead.y - here.y, ahead.x - here.x);
        x = here.x;
        y = here.y;
        button.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px) rotate(" + angle.toFixed(3) + "rad)";

        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.clearRect(0, 0, 44, 44);
        ctx.translate(22, 22);
        drawBeetle(ctx, 12, stopped ? 0.2 : now / 1000, PALETTE.bug);
        frameId = window.requestAnimationFrame(frame);
      }
      frameId = window.requestAnimationFrame(frame);

      function finish() {
        done = true;
        window.cancelAnimationFrame(frameId);
        button.remove();
      }

      button.addEventListener("click", function () {
        finish();
        var splat = document.createElement("span");
        splat.className = "splat";
        splat.style.left = x + "px";
        splat.style.top = y + "px";
        document.body.appendChild(splat);
        window.setTimeout(function () {
          splat.remove();
        }, 800);
        if (eschgi.toast) {
          eschgi.toast("Nice catch! 🐛 Its friends are hiding in Bug Bash.", {
            label: "Play",
            onClick: function () {
              if (eschgi.scrollToSection) eschgi.scrollToSection("bugbash");
              window.setTimeout(function () {
                if (api.focusStart) api.focusStart();
              }, 700);
            },
          });
        }
      });
    }
  }

  var root = document.querySelector("[data-bugbash]");
  if (root) initGame(root);
  strayBug();
})();
