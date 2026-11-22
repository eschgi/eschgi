// eschgi.com — the packing scale beside foodProcess: an illustration that turns into a mini game.
// Fill five punnets to their target weight. Anything above the target is giveaway, fruit given
// away for free; giveaway and punnets a minute are what foodProcess measures on a real line.
//
// The scene is SVG, drawn by this script into the markup in index.html. Nothing moves until
// someone plays, and with reduced motion nothing animates at all: fruit and punnets just appear
// and the reading is final at once. A classic deferred script, like the others.
(function () {
  "use strict";

  var figure = document.querySelector("[data-scale]");
  if (!figure) return;

  var SVG_NS = "http://www.w3.org/2000/svg";
  var BEST_KEY = "eschgi.scale.best";
  var PUNNETS_PER_ORDER = 5;
  var OVER_SHARE = 0.05; // the OVER lamp lights more than 5 % above the target
  var FULL_SHARE = 1.8; // a punnet takes at most 180 % of its target
  var PAN = { x: 300, y: 218 }; // where a punnet stands on the scale
  var VIEW_WIDE = "0 82 600 250";
  var VIEW_NARROW = "84 72 432 260";

  // Weights in grams: a piece weighs `mean` ± `spread`, and a held Fill pours one every `every`
  // milliseconds. `size` is a piece's drawn height at the mean weight, `width` its width as a share
  // of that, and `tilt` how far, in degrees, a piece may turn as it lands.
  var PRODUCTS = {
    blueberries: {
      name: "Blueberries",
      target: 125,
      mean: 2,
      spread: 0.6,
      every: 75,
      size: 12,
      width: 1,
      tilt: 360,
      punnet: { top: 150, bottom: 128, height: 54 },
      draw: drawBlueberry,
    },
    strawberries: {
      name: "Strawberries",
      target: 250,
      mean: 21,
      spread: 8,
      every: 260,
      size: 33,
      width: 0.86,
      tilt: 50,
      punnet: { top: 180, bottom: 156, height: 64 },
      draw: drawStrawberry,
    },
    grapes: {
      name: "Grapes",
      target: 500,
      mean: 62,
      spread: 24,
      every: 400,
      size: 50,
      width: 0.9,
      tilt: 110,
      punnet: { top: 220, bottom: 192, height: 80 },
      draw: drawGrapes,
    },
  };

  var svg = figure.querySelector("svg");
  var stage = figure.querySelector("[data-scale-stage]");
  var digitLayer = figure.querySelector("[data-scale-digits]");
  var stableLight = figure.querySelector("[data-scale-stable]");
  var lamps = {
    under: figure.querySelector('[data-scale-lamp="under"]'),
    ok: figure.querySelector('[data-scale-lamp="ok"]'),
    over: figure.querySelector('[data-scale-lamp="over"]'),
  };
  var progressText = figure.querySelector("[data-scale-progress]");
  var statusText = figure.querySelector("[data-scale-status]");
  var productButtons = figure.querySelectorAll("[data-scale-product]");
  var startRow = figure.querySelector("[data-scale-start-row]");
  var startButton = figure.querySelector("[data-scale-start]");
  var actionRow = figure.querySelector("[data-scale-actions]");
  var fillButton = figure.querySelector("[data-scale-fill]");
  var removeButton = figure.querySelector("[data-scale-remove]");
  var packButton = figure.querySelector("[data-scale-pack]");
  var summary = figure.querySelector("[data-scale-summary]");
  if (!svg || !stage || !digitLayer || !fillButton || !packButton) return;

  var reducedQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  function still() {
    var eschgi = window.eschgi;
    if (eschgi && typeof eschgi.reducedMotion === "boolean") return eschgi.reducedMotion;
    return !!(reducedQuery && reducedQuery.matches);
  }

  var INTRO =
    "Fill five punnets to their target weight. Anything above it is giveaway: fruit given away for free.";

  var productKey = "strawberries";
  var product = PRODUCTS[productKey];
  var mode = "idle"; // idle, moving, playing, packing, done
  var punnet = null; // the punnet on the scale: { node, fruit, pieces, slots, variety }
  var weight = 0; // grams on the scale, net of the punnet
  var spring = { offset: 0, velocity: 0, damping: 0.3, quietSince: 0 }; // how the reading swings before it settles
  var falling = []; // pieces in the air
  var tweens = [];
  var pouring = false;
  var nextDropAt = 0;
  var packWhenSettled = false;
  var order = null;
  var frame = 0;
  var lastTime = 0;
  var shownReading = null;
  var announceWhenSettled = false;
  var scene = 0; // bumped when the fruit changes, so timers of the old scene do nothing

  function later(callback, milliseconds) {
    var mine = scene;
    window.setTimeout(function () {
      if (mine === scene) callback();
    }, milliseconds);
  }

  // ---------------------------------------------------------------- SVG helpers
  function el(name, attributes, parent) {
    var node = document.createElementNS(SVG_NS, name);
    for (var key in attributes) {
      if (Object.prototype.hasOwnProperty.call(attributes, key)) node.setAttribute(key, String(attributes[key]));
    }
    if (parent) parent.appendChild(node);
    return node;
  }

  function round(value) {
    return Math.round(value * 100) / 100;
  }

  function detach(node) {
    if (node && node.parentNode) node.parentNode.removeChild(node);
  }

  function setClass(node, name, on) {
    if (!node) return;
    var classes = (node.getAttribute("class") || "").split(/\s+/).filter(function (item) {
      return item && item !== name;
    });
    if (on) classes.push(name);
    node.setAttribute("class", classes.join(" "));
  }

  function place(node, values) {
    var transform = "translate(" + round(values.x) + " " + round(values.y) + ")";
    if (values.r) transform += " rotate(" + round(values.r) + ")";
    if (values.s !== undefined && values.s !== 1) transform += " scale(" + round(values.s) + ")";
    node.setAttribute("transform", transform);
    if (values.o !== undefined) node.setAttribute("opacity", String(round(values.o)));
  }

  function grams(value) {
    return (Math.round(value * 10) / 10).toFixed(1);
  }

  // ---------------------------------------------------------------- the fruit
  function star(cx, cy, outer, inner, points) {
    var path = "";
    for (var i = 0; i < points * 2; i++) {
      var radius = i % 2 ? inner : outer;
      var angle = (Math.PI * i) / points - Math.PI / 2;
      path += (i ? "L" : "M") + round(cx + Math.cos(angle) * radius) + " " + round(cy + Math.sin(angle) * radius);
    }
    return path + "Z";
  }

  function drawBlueberry(size) {
    var group = el("g", {});
    var radius = size / 2;
    el("circle", { r: round(radius), fill: "url(#sc-blueberry)" }, group);
    el("circle", { r: round(radius), fill: "url(#sc-bloom)" }, group);
    el(
      "path",
      {
        d: star(radius * 0.16, -radius * 0.2, radius * 0.36, radius * 0.15, 5),
        fill: "#1b1f44",
        stroke: "#4c58a6",
        "stroke-width": 0.5,
      },
      group
    );
    return group;
  }

  var SEEDS = [
    [-0.17, -0.2],
    [0.15, -0.22],
    [0, -0.06],
    [-0.27, 0.02],
    [0.26, 0],
    [-0.12, 0.16],
    [0.13, 0.17],
    [0, 0.32],
    [-0.02, -0.29],
  ];
  var LEAF_ANGLES = [160, 205, 250, 290, 335, 20];

  function drawStrawberry(size) {
    var group = el("g", {});
    var h = size;
    var w = size * 0.86;
    function point(x, y) {
      return round(x * w) + " " + round(y * h);
    }
    el(
      "path",
      {
        d:
          "M" + point(0, 0.5) +
          "C" + point(-0.36, 0.36) + " " + point(-0.56, 0.02) + " " + point(-0.5, -0.22) +
          "C" + point(-0.45, -0.4) + " " + point(-0.18, -0.46) + " " + point(0, -0.4) +
          "C" + point(0.18, -0.46) + " " + point(0.45, -0.4) + " " + point(0.5, -0.22) +
          "C" + point(0.56, 0.02) + " " + point(0.36, 0.36) + " " + point(0, 0.5) + "Z",
        fill: "url(#sc-strawberry)",
      },
      group
    );
    SEEDS.forEach(function (seed) {
      el(
        "ellipse",
        { cx: round(seed[0] * w), cy: round(seed[1] * h), rx: round(w * 0.026), ry: round(h * 0.036), fill: "#f6d77a", opacity: 0.85 },
        group
      );
    });
    LEAF_ANGLES.forEach(function (angle, index) {
      var radians = (angle * Math.PI) / 180;
      el(
        "ellipse",
        {
          rx: round(w * 0.17),
          ry: round(h * 0.055),
          fill: index % 2 ? "#3d8526" : "#58a832",
          transform:
            "translate(" + round(Math.cos(radians) * w * 0.13) + " " + round(-h * 0.4 + Math.sin(radians) * w * 0.13) + ") rotate(" + angle + ")",
        },
        group
      );
    });
    el(
      "path",
      { d: "M0 " + round(-h * 0.42) + "q" + round(w * 0.02) + " " + round(-h * 0.08) + " " + round(w * 0.06) + " " + round(-h * 0.13), stroke: "#3d8526", "stroke-width": 1.6, "stroke-linecap": "round", fill: "none" },
      group
    );
    return group;
  }

  // A bunch: rows of four, three, two and one grape, narrowing to its tip.
  var GRAPES = [
    [-0.33, -0.3],
    [-0.11, -0.32],
    [0.11, -0.31],
    [0.33, -0.28],
    [-0.22, -0.09],
    [0, -0.1],
    [0.22, -0.08],
    [-0.11, 0.12],
    [0.11, 0.13],
    [0.01, 0.33],
  ];

  function drawGrapes(size, variety) {
    var group = el("g", {});
    el(
      "path",
      { d: "M0 " + round(-size * 0.38) + "q" + round(size * 0.02) + " " + round(-size * 0.1) + " " + round(size * 0.1) + " " + round(-size * 0.16), stroke: "#8a7a44", "stroke-width": 1.8, "stroke-linecap": "round", fill: "none" },
      group
    );
    GRAPES.forEach(function (grape) {
      var cx = grape[0] * size;
      var cy = grape[1] * size;
      el("ellipse", { cx: round(cx), cy: round(cy), rx: round(size * 0.125), ry: round(size * 0.135), fill: "url(#sc-grape-" + variety + ")" }, group);
      el("ellipse", { cx: round(cx - size * 0.04), cy: round(cy - size * 0.06), rx: round(size * 0.038), ry: round(size * 0.026), fill: "#ffffff", opacity: 0.4 }, group);
    });
    return group;
  }

  // ---------------------------------------------------------------- the punnet
  // Where pieces come to rest, bottom row first, in punnet coordinates (origin at the bottom
  // centre, y up is negative). Rows above the rim narrow into a heap.
  function makeSlots() {
    var shape = product.punnet;
    var size = product.size;
    var needed = Math.ceil((product.target * FULL_SHARE) / (product.mean - product.spread)) + 6;
    var slots = [];
    for (var row = 0; slots.length < needed && row < 60; row++) {
      var y = -4 - size * 0.48 - row * size * 0.74;
      var height = -y;
      var width =
        height <= shape.height
          ? shape.bottom + (shape.top - shape.bottom) * (height / shape.height) - 6
          : shape.top * Math.max(0.1, 1 - (height - shape.height) / (size * 2.6));
      var pieceWidth = size * product.width;
      var count = Math.max(1, Math.floor((width - pieceWidth * 0.3) / (pieceWidth * 0.86)));
      var span = Math.max(0, width - pieceWidth * 1.04);
      var rowSlots = [];
      for (var i = 0; i < count; i++) {
        var x = count === 1 ? 0 : -span / 2 + (span * i) / (count - 1);
        rowSlots.push({
          x: x + (Math.random() - 0.5) * size * 0.18,
          y: y + (Math.random() - 0.5) * size * 0.14,
          r: (Math.random() - 0.5) * product.tilt,
        });
      }
      shuffle(rowSlots);
      slots = slots.concat(rowSlots);
    }
    return slots;
  }

  function shuffle(items) {
    for (var i = items.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var swap = items[i];
      items[i] = items[j];
      items[j] = swap;
    }
  }

  function createPunnet() {
    var shape = product.punnet;
    var outline =
      "M" + -shape.bottom / 2 + " 0L" + shape.bottom / 2 + " 0L" + shape.top / 2 + " " + -shape.height + "L" + -shape.top / 2 + " " + -shape.height + "Z";
    var ribs = "";
    var ribCount = Math.round(shape.bottom / 16);
    for (var i = 1; i < ribCount; i++) {
      var share = i / ribCount;
      ribs +=
        "M" + round(-shape.bottom / 2 + shape.bottom * share) + " -3L" + round(-shape.top / 2 + shape.top * share) + " " + (-shape.height + 3);
    }
    var node = el("g", { class: "scale__punnet" });
    el("path", { class: "scale__punnet-back", d: outline }, node);
    var fruit = el("g", {}, node);
    el("path", { class: "scale__punnet-front", d: outline }, node);
    el("path", { class: "scale__punnet-ribs", d: ribs }, node);
    el("rect", { class: "scale__punnet-rim", x: -shape.top / 2 - 5, y: -shape.height - 4, width: shape.top + 10, height: 6, rx: 3 }, node);
    stage.appendChild(node);
    return {
      node: node,
      fruit: fruit,
      pieces: [],
      slots: makeSlots(),
      variety: Math.random() < 0.65 ? "white" : "red",
    };
  }

  function slotFor(index) {
    var slots = punnet.slots;
    if (index < slots.length) return slots[index];
    var top = slots[slots.length - 1 - (index % 4)];
    return { x: top.x + (Math.random() - 0.5) * product.size, y: top.y - product.size * 0.3, r: top.r };
  }

  function addPieceNode(weightOfPiece) {
    var node = product.draw(product.size * Math.pow(weightOfPiece / product.mean, 1 / 3), punnet.variety);
    punnet.fruit.appendChild(node);
    return node;
  }

  function printLabel(current, net, instant) {
    var shape = product.punnet;
    var label = el("g", { class: "scale__label" });
    el("rect", { x: -32, y: -15, width: 64, height: 30, rx: 2 }, label);
    var name = el("text", { class: "scale__label-name", x: -27, y: -6 }, label);
    name.textContent = product.name.toUpperCase();
    var netWeight = el("text", { class: "scale__label-weight", x: -27, y: 4.5 }, label);
    netWeight.textContent = grams(net) + " g";
    var bars = "";
    for (var x = -27; x < 26; x += 1 + Math.round(Math.random() * 2)) {
      var width = Math.random() < 0.4 ? 1.4 : 0.7;
      bars += "M" + x + " 7.5h" + width + "v5h" + -width + "Z";
    }
    el("path", { class: "scale__label-code", d: bars }, label);
    current.node.appendChild(label);
    var at = { x: 0, y: -shape.height * 0.42 };
    if (instant || still()) {
      place(label, at);
      return;
    }
    tween(label, { x: at.x, y: at.y - 6, s: 0.7, o: 0 }, { x: at.x, y: at.y, s: 1, o: 1 }, 200, easeOut);
  }

  // ---------------------------------------------------------------- motion
  function easeIn(t) {
    return t * t;
  }
  function easeOut(t) {
    return 1 - (1 - t) * (1 - t);
  }
  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
  }

  function tween(node, from, to, duration, ease, done, delay) {
    tweens.push({ node: node, from: from, to: to, start: performance.now() + (delay || 0), duration: duration, ease: ease, done: done });
    place(node, from);
    wake();
  }

  function stepTweens(now) {
    for (var i = tweens.length - 1; i >= 0; i--) {
      var item = tweens[i];
      if (!item || now < item.start) continue;
      var progress = Math.min(1, (now - item.start) / item.duration);
      var eased = item.ease(progress);
      var values = {};
      for (var key in item.to) {
        if (Object.prototype.hasOwnProperty.call(item.to, key)) {
          values[key] = item.from[key] + (item.to[key] - item.from[key]) * eased;
        }
      }
      place(item.node, values);
      if (progress >= 1) {
        tweens.splice(i, 1);
        if (item.done) item.done();
      }
    }
  }

  // The reading overshoots and swings for a moment whenever the load changes, as a real load
  // cell does: hard when fruit lands, gently when load comes off. The STABLE light comes on once
  // it has settled.
  function kick(change, impact, damping) {
    if (still()) return;
    spring.offset -= change;
    spring.velocity += impact || 0;
    spring.damping = damping || 0.3;
    spring.quietSince = 0;
  }

  function stepSpring(seconds, now) {
    if (still()) {
      spring.offset = 0;
      spring.velocity = 0;
      return;
    }
    var omega = 2 * Math.PI * 5.5;
    var damping = 2 * spring.damping * omega;
    var steps = Math.max(1, Math.ceil(seconds / (1 / 240)));
    var dt = seconds / steps;
    for (var i = 0; i < steps; i++) {
      spring.velocity += (-omega * omega * spring.offset - damping * spring.velocity) * dt;
      spring.offset += spring.velocity * dt;
    }
    if (Math.abs(spring.offset) < 0.04 && Math.abs(spring.velocity) < 0.8) {
      if (!spring.quietSince) spring.quietSince = now;
      if (now - spring.quietSince > 140) {
        spring.offset = 0;
        spring.velocity = 0;
      }
    } else {
      spring.quietSince = 0;
    }
  }

  function settled() {
    return spring.offset === 0 && spring.velocity === 0 && falling.length === 0;
  }

  function wake() {
    if (frame) return;
    lastTime = performance.now();
    frame = window.requestAnimationFrame(tick);
  }

  function tick(now) {
    frame = 0;
    var seconds = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;
    if (pouring && now >= nextDropAt) {
      dropPiece(now);
      nextDropAt = now + product.every * (0.8 + Math.random() * 0.4);
    }
    stepTweens(now);
    stepSpring(seconds, now);
    render();
    if (packWhenSettled && settled()) {
      packWhenSettled = false;
      pack();
    }
    if (announceWhenSettled && settled() && !pouring) {
      announceWhenSettled = false;
      if (mode === "playing") say(grams(weight) + " g of " + product.target + " g.");
    }
    if (pouring || tweens.length || !settled() || packWhenSettled || announceWhenSettled) {
      frame = window.requestAnimationFrame(tick);
    }
  }

  // ---------------------------------------------------------------- the display
  // Seven segments per digit, a to g; four digits with the decimal point before the last.
  var SEGMENTS = {
    "0": "abcdef",
    "1": "bc",
    "2": "abged",
    "3": "abgcd",
    "4": "fgbc",
    "5": "afgcd",
    "6": "afgedc",
    "7": "abc",
    "8": "abcdefg",
    "9": "abcdfg",
    "-": "g",
    " ": "",
  };
  var digits = [];

  function buildDigits() {
    var width = 24;
    var height = 36;
    var thick = 5;
    var left = [166, 198, 230, 270];
    var top = 257;
    function horizontal(cx, cy) {
      var half = width / 2 - 1.5;
      return [
        [cx - half, cy],
        [cx - half + thick / 2, cy - thick / 2],
        [cx + half - thick / 2, cy - thick / 2],
        [cx + half, cy],
        [cx + half - thick / 2, cy + thick / 2],
        [cx - half + thick / 2, cy + thick / 2],
      ];
    }
    function vertical(cx, cy) {
      var half = height / 4 - 1.5;
      return [
        [cx, cy - half],
        [cx + thick / 2, cy - half + thick / 2],
        [cx + thick / 2, cy + half - thick / 2],
        [cx, cy + half],
        [cx - thick / 2, cy + half - thick / 2],
        [cx - thick / 2, cy - half + thick / 2],
      ];
    }
    left.forEach(function (x) {
      var shapes = {
        a: horizontal(x + width / 2, top),
        g: horizontal(x + width / 2, top + height / 2),
        d: horizontal(x + width / 2, top + height),
        f: vertical(x, top + height / 4),
        b: vertical(x + width, top + height / 4),
        e: vertical(x, top + (3 * height) / 4),
        c: vertical(x + width, top + (3 * height) / 4),
      };
      var digit = {};
      Object.keys(shapes).forEach(function (name) {
        digit[name] = el(
          "polygon",
          {
            class: "scale__seg",
            points: shapes[name]
              .map(function (corner) {
                return round(corner[0]) + "," + round(corner[1]);
              })
              .join(" "),
          },
          digitLayer
        );
      });
      digits.push(digit);
    });
    el("circle", { class: "scale__seg is-on", cx: 262, cy: top + height, r: 2.8 }, digitLayer);
    var fallback = figure.querySelector("[data-scale-fallback]");
    detach(fallback);
  }

  // 251.4 → ["2", "5", "1", "4"], 5.3 → [" ", " ", "5", "3"]; a negative reading gets a minus in
  // front of its first digit, as on a real scale.
  function digitsOf(value) {
    var clamped = Math.max(-99.9, Math.min(999.9, Math.round(value * 10) / 10));
    var chars = String(Math.round(Math.abs(clamped) * 10)).split("");
    while (chars.length < 2) chars.unshift("0");
    while (chars.length < 4) chars.unshift(" ");
    if (clamped < 0) chars[chars.lastIndexOf(" ")] = "-";
    return chars;
  }

  function render(force) {
    var reading = Math.round((weight + spring.offset) * 10) / 10;
    if (reading === 0) reading = 0; // turns -0 into 0, so the display never shows "-0.0"
    if (force || reading !== shownReading) {
      shownReading = reading;
      digitsOf(reading).forEach(function (char, index) {
        var on = SEGMENTS[char] || "";
        Object.keys(digits[index]).forEach(function (name) {
          setClass(digits[index][name], "is-on", on.indexOf(name) >= 0);
        });
      });
      var state = reading < 0.05 ? "" : reading < product.target ? "under" : reading <= product.target * (1 + OVER_SHARE) ? "ok" : "over";
      setClass(lamps.under, "is-on", state === "under");
      setClass(lamps.ok, "is-on", state === "ok");
      setClass(lamps.over, "is-on", state === "over");
    }
    setClass(stableLight, "is-on", settled() && weight > 0);
  }

  // ---------------------------------------------------------------- playing
  function pieceWeight() {
    var value = product.mean + product.spread * (Math.random() + Math.random() - 1);
    return Math.round(value * 10) / 10;
  }

  function inTheAir() {
    return falling.reduce(function (sum, piece) {
      return sum + piece.weight;
    }, 0);
  }

  function dropPiece(now) {
    if (!punnet || mode !== "playing") return;
    if (weight + inTheAir() >= product.target * FULL_SHARE) {
      haltPour();
      say("The punnet is full. Take some out, or pack it.");
      return;
    }
    if (order && !order.firstFillAt) order.firstFillAt = now;
    var piece = { weight: pieceWeight(), slot: slotFor(punnet.pieces.length + falling.length) };
    piece.node = addPieceNode(piece.weight);
    if (still()) {
      place(piece.node, piece.slot);
      land(piece);
      return;
    }
    falling.push(piece);
    var drift = (Math.random() - 0.5) * 18;
    tween(
      piece.node,
      { x: piece.slot.x + drift, y: piece.slot.y - 260, r: piece.slot.r - 20 },
      { x: piece.slot.x, y: piece.slot.y, r: piece.slot.r },
      300 + Math.random() * 90,
      easeIn,
      function () {
        land(piece);
      }
    );
  }

  function land(piece) {
    var index = falling.indexOf(piece);
    if (index >= 0) falling.splice(index, 1);
    punnet.pieces.push(piece);
    weight = Math.round((weight + piece.weight) * 10) / 10;
    kick(piece.weight, piece.weight * 4);
    syncControls();
    wake();
  }

  function takeOne() {
    if (!punnet || mode !== "playing" || !punnet.pieces.length) return;
    var piece = punnet.pieces.pop();
    weight = Math.max(0, Math.round((weight - piece.weight) * 10) / 10);
    kick(-piece.weight, 0, 0.75);
    if (still()) {
      detach(piece.node);
    } else {
      var slot = piece.slot;
      tween(
        piece.node,
        { x: slot.x, y: slot.y, r: slot.r, o: 1 },
        { x: slot.x + 30, y: slot.y - 150, r: slot.r + 50, o: 0 },
        360,
        easeOut,
        function () {
          detach(piece.node);
        }
      );
    }
    say("Took out " + grams(piece.weight) + " g.");
    announceWhenSettled = true;
    syncControls();
    wake();
  }

  function startPour() {
    if (mode !== "playing" || pouring) return;
    pouring = true;
    setClass(fillButton, "is-pouring", true);
    var now = performance.now();
    dropPiece(now);
    nextDropAt = now + Math.max(240, product.every); // a tap drops exactly one piece
    wake();
  }

  // Stops pouring; the reading is announced once it settles, for anyone not watching the digits.
  function stopPour() {
    if (!pouring) return;
    haltPour();
    announceWhenSettled = true;
    wake();
  }

  function haltPour() {
    pouring = false;
    setClass(fillButton, "is-pouring", false);
  }

  function requestPack() {
    if (!punnet || mode !== "playing" || weight <= 0) return;
    haltPour();
    announceWhenSettled = false;
    mode = "packing";
    syncControls();
    packWhenSettled = true;
    wake();
  }

  function pack() {
    var current = punnet;
    var net = Math.round(weight * 10) / 10;
    var accepted = net >= product.target;
    order.count += 1;
    order.lastPackAt = performance.now();
    if (accepted) {
      order.packed += 1;
      order.giveaway += net - product.target;
      printLabel(current, net);
      say("Packed " + grams(net) + " g: " + grams(net - product.target) + " g giveaway.");
    } else {
      order.rejected += 1;
      say("Rejected: " + grams(product.target - net) + " g under. Short punnets come off the line.");
    }
    leave(current, accepted ? "packed" : "rejected", accepted ? 380 : 120);
    updateProgress();
    if (order.count >= PUNNETS_PER_ORDER) {
      mode = "moving";
      syncControls();
      later(finishOrder, still() ? 0 : 900);
    } else {
      arrive(accepted ? 520 : 260);
    }
  }

  // The punnet leaves the scale: along the outfeed when packed, off the line when rejected.
  function leave(current, how, delay) {
    if (punnet === current) punnet = null;
    var load = weight;
    later(function () {
      weight = 0;
      kick(-load, 0, 0.8);
      wake();
    }, still() ? 0 : delay);
    if (still()) {
      detach(current.node);
      weight = 0;
      return;
    }
    var from = { x: PAN.x, y: PAN.y, r: 0, o: 1 };
    var to =
      how === "rejected"
        ? { x: PAN.x - 150, y: PAN.y + 210, r: -40, o: 0 }
        : { x: PAN.x + 420, y: PAN.y, r: 0, o: 1 };
    tween(current.node, from, to, how === "rejected" ? 620 : 640, how === "rejected" ? easeIn : easeInOut, function () {
      detach(current.node);
    }, delay);
  }

  // An empty punnet comes in on the infeed; the scale reads zero, the punnet tared.
  function arrive(delay) {
    mode = "moving";
    syncControls();
    punnet = createPunnet();
    if (still()) {
      place(punnet.node, PAN);
      ready();
      return;
    }
    tween(
      punnet.node,
      { x: PAN.x - 420, y: PAN.y, r: 0, o: 1 },
      { x: PAN.x, y: PAN.y, r: 0, o: 1 },
      620,
      easeOut,
      function () {
        kick(0, 18, 0.45);
        ready();
      },
      delay
    );
  }

  function ready() {
    mode = "playing";
    syncControls();
    wake();
  }

  function startOrder() {
    clearMotion();
    order = { count: 0, packed: 0, rejected: 0, giveaway: 0, firstFillAt: 0, lastPackAt: 0 };
    summary.hidden = true;
    if (punnet) leave(punnet, "packed", 0);
    arrive(punnet ? 160 : 0);
    updateProgress();
    say("Hold Fill to pour, tap it for a single piece. Pack once the reading settles.");
  }

  function finishOrder() {
    mode = "done";
    var share = order.packed ? (order.giveaway / (product.target * order.packed)) * 100 : 0;
    var minutes = order.firstFillAt && order.lastPackAt > order.firstFillAt ? (order.lastPackAt - order.firstFillAt) / 60000 : 0;
    var perMinute = minutes ? order.packed / minutes : 0;
    setKpi("giveaway", order.packed ? share.toFixed(1) + " %" : "–");
    setKpi("rate", perMinute ? perMinute.toFixed(1) : "–");
    setKpi("rejected", String(order.rejected));

    var best = loadBest();
    var previous = best[productKey];
    var clean = order.rejected === 0 && order.packed === PUNNETS_PER_ORDER;
    var line;
    if (clean && (!previous || share < previous.giveaway)) {
      best[productKey] = { giveaway: share, perMinute: perMinute };
      saveBest(best);
      line = previous ? "Order packed, and a new best for " + product.name.toLowerCase() + "." : "Order packed. That's your first full order of " + product.name.toLowerCase() + ".";
    } else if (!clean) {
      line = "Order done, with " + order.rejected + " rejected. Underweight costs more than giveaway.";
    } else {
      line = "Order packed. Your best for " + product.name.toLowerCase() + ": " + previous.giveaway.toFixed(1) + " % giveaway.";
    }
    say(line);
    startButton.textContent = "Pack another order";
    syncControls();
    updateProgress();
  }

  function setKpi(name, value) {
    var node = figure.querySelector('[data-scale-kpi="' + name + '"]');
    if (node) node.textContent = value;
  }

  function loadBest() {
    try {
      var stored = JSON.parse(window.localStorage.getItem(BEST_KEY) || "{}");
      return stored && typeof stored === "object" ? stored : {};
    } catch (error) {
      return {};
    }
  }

  function saveBest(best) {
    try {
      window.localStorage.setItem(BEST_KEY, JSON.stringify(best));
    } catch (error) {
      // Storage can be unavailable; the best result just isn't kept.
    }
  }

  // ---------------------------------------------------------------- the page around it
  function say(text) {
    if (statusText && statusText.textContent !== text) statusText.textContent = text;
  }

  function updateProgress() {
    if (!progressText) return;
    if (mode === "done") {
      progressText.textContent = "Order done";
    } else if (order) {
      progressText.textContent = "Punnet " + Math.min(order.count + 1, PUNNETS_PER_ORDER) + " of " + PUNNETS_PER_ORDER;
    } else {
      var best = loadBest()[productKey];
      progressText.textContent = best ? "Best: " + best.giveaway.toFixed(1) + " % giveaway" : "Five punnets a round";
    }
  }

  function syncControls() {
    var inOrder = mode === "moving" || mode === "playing" || mode === "packing";
    startRow.hidden = inOrder;
    actionRow.hidden = !inOrder;
    summary.hidden = mode !== "done";
    fillButton.disabled = mode !== "playing";
    removeButton.disabled = mode !== "playing" || !punnet || !punnet.pieces.length;
    packButton.disabled = mode !== "playing" || weight <= 0;
  }

  function clearMotion() {
    haltPour();
    packWhenSettled = false;
    announceWhenSettled = false;
    tweens.forEach(function (item) {
      if (item.done && item.node && item.node !== (punnet && punnet.node)) detach(item.node);
    });
    tweens = [];
    falling.forEach(function (piece) {
      detach(piece.node);
    });
    falling = [];
  }

  // The picture before anyone plays: a punnet filled just past its target, labelled and weighed.
  function showFilledPunnet() {
    clearMotion();
    while (stage.firstChild) stage.removeChild(stage.firstChild);
    punnet = createPunnet();
    place(punnet.node, PAN);
    var pieces = [];
    var total = 0;
    while (total < product.target) {
      var next = pieceWeight();
      pieces.push(next);
      total += next;
    }
    var wanted = product.target + 0.4 + Math.random() * product.target * 0.008;
    var scaled = 0;
    pieces = pieces.map(function (value, index) {
      // The last piece takes up the rounding, so the reading is exactly the weight wanted.
      var next = index === pieces.length - 1 ? wanted - scaled : (value * wanted) / total;
      next = Math.round(next * 10) / 10;
      scaled += next;
      return next;
    });
    total = 0;
    pieces.forEach(function (pieceWeightValue, index) {
      var slot = slotFor(index);
      var node = addPieceNode(pieceWeightValue);
      place(node, slot);
      punnet.pieces.push({ weight: pieceWeightValue, slot: slot, node: node });
      total += pieceWeightValue;
    });
    weight = Math.round(total * 10) / 10;
    spring.offset = 0;
    spring.velocity = 0;
    printLabel(punnet, weight, true);
    render(true);
  }

  function selectProduct(key) {
    if (!PRODUCTS[key]) return;
    scene += 1;
    productKey = key;
    product = PRODUCTS[key];
    Array.prototype.forEach.call(productButtons, function (button) {
      button.setAttribute("aria-pressed", String(button.getAttribute("data-scale-product") === key));
    });
    mode = "idle";
    order = null;
    startButton.textContent = "Start packing";
    showFilledPunnet();
    syncControls();
    updateProgress();
    say(INTRO);
  }

  function fitView() {
    svg.setAttribute("viewBox", narrowQuery && narrowQuery.matches ? VIEW_NARROW : VIEW_WIDE);
  }

  // ---------------------------------------------------------------- wiring
  var narrowQuery = window.matchMedia ? window.matchMedia("(max-width: 519px)") : null;
  fitView();
  if (narrowQuery) {
    if (narrowQuery.addEventListener) narrowQuery.addEventListener("change", fitView);
    else if (narrowQuery.addListener) narrowQuery.addListener(fitView);
  }

  Array.prototype.forEach.call(productButtons, function (button) {
    button.addEventListener("click", function () {
      selectProduct(button.getAttribute("data-scale-product"));
    });
  });
  startButton.addEventListener("click", startOrder);
  packButton.addEventListener("click", requestPack);
  removeButton.addEventListener("click", takeOne);

  // Fill pours while it is held, by pointer or by Space/Enter; a tap drops a single piece.
  fillButton.addEventListener("pointerdown", function (event) {
    if (event.button !== 0) return;
    event.preventDefault();
    try {
      fillButton.setPointerCapture(event.pointerId);
    } catch (error) {
      // Capture is a nicety: without it, leaving the button still stops the pour.
    }
    startPour();
  });
  ["pointerup", "pointercancel", "lostpointercapture", "pointerleave", "blur"].forEach(function (type) {
    fillButton.addEventListener(type, function () {
      stopPour();
    });
  });
  fillButton.addEventListener("keydown", function (event) {
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    if (!event.repeat) startPour();
  });
  fillButton.addEventListener("keyup", function (event) {
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    stopPour();
  });
  fillButton.addEventListener("contextmenu", function (event) {
    event.preventDefault();
  });

  buildDigits();
  selectProduct(productKey);
})();
