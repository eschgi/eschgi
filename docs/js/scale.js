// eschgi.com — the packing scale beside foodProcess: an illustration that turns into a mini game.
// A hand-packing station: a platform scale with a column display, its tolerance light (red under
// the target, all green on it, orange over) and an RFID reader for the operator's badge. Fill five punnets to
// their target weight; every gram above it is giveaway, the extra product above the weight on
// the label, and reducing giveaway is what foodProcess is for.
//
// The scene is SVG in index.html; this script draws the punnets and the fruit and runs the scale.
// Nothing moves until someone plays, and with reduced motion nothing animates at all: fruit and
// punnets just appear and the reading is final at once. A classic deferred script, like the others.
(function () {
  "use strict";

  var figure = document.querySelector("[data-scale]");
  if (!figure) return;

  // The words, in the visitor's language (js/i18n.js), or in English as written here.
  function t(text, params) {
    var eschgi = window.eschgi;
    if (eschgi && eschgi.t) return eschgi.t(text, params);
    return text.replace(/\{(\w+)\}/g, function (match, name) {
      return params && params[name] !== undefined ? String(params[name]) : match;
    });
  }

  // A number with a fixed count of decimals, written the visitor's way: 1.2, or 1,2 in German.
  function decimal(value, digits) {
    var eschgi = window.eschgi;
    return eschgi && eschgi.formatNumber ? eschgi.formatNumber(value, digits) : value.toFixed(digits);
  }

  var SVG_NS = "http://www.w3.org/2000/svg";
  var BEST_KEY = "eschgi.scale.best";
  var PUNNETS_PER_ORDER = 5;
  var OK_SHARE = 0.05; // from the target to 5 % over it the weight is OK; above that, too high
  var FULL_SHARE = 1.8; // a punnet takes at most 180 % of its target
  var PAN = { x: 300, y: 244, s: 1 }; // where a punnet stands on the scale
  var STACK = { x: 52, y: 300, s: 0.6 }; // the empty punnets, on the bench to the left
  var PARKED = { x: 542, y: 300, s: 0.52 }; // the last packed punnet, on the bench to the right
  var VIEW_WIDE = "0 0 600 312";
  var VIEW_NARROW = "120 0 360 312";

  // Weights in grams: a piece weighs `mean` ± `spread`, and a held Fill pours one every `every`
  // milliseconds. `size` is a piece's drawn height at the mean weight, `width` its width as a share
  // of that, and `tilt` how far, in degrees, a piece may turn as it lands. `name` is what the
  // screen and the label say, `fruit` how a sentence names it, both in the current language.
  var PRODUCTS = {
    blueberries: {
      name: function () {
        return t("Blueberries");
      },
      fruit: function () {
        return t("blueberries");
      },
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
      name: function () {
        return t("Strawberries");
      },
      fruit: function () {
        return t("strawberries");
      },
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
    tomatoes: {
      name: function () {
        return t("Tomatoes");
      },
      fruit: function () {
        return t("tomatoes");
      },
      target: 500,
      mean: 34,
      spread: 11,
      every: 320,
      size: 34,
      width: 1,
      tilt: 40,
      punnet: { top: 204, bottom: 178, height: 70 },
      draw: drawTomato,
    },
  };

  function part(name) {
    return figure.querySelector("[data-scale-" + name + "]");
  }

  var svg = figure.querySelector("svg");
  var stage = part("stage");
  var stackLayer = part("stack");
  var screen = {
    weight: part("weight"),
    stable: part("stable"),
    zero: part("zero"),
    glyph: part("glyph"),
    bar: part("bar"),
    productName: part("product-name"),
    operator: part("operator"),
  };
  var rfid = part("rfid");
  var leds = Array.prototype.slice.call(figure.querySelectorAll("[data-scale-led]")).sort(function (a, b) {
    return Number(a.getAttribute("data-scale-led")) - Number(b.getAttribute("data-scale-led"));
  });
  var progressText = part("progress");
  var statusText = part("status");
  var productButtons = figure.querySelectorAll("[data-scale-product]");
  var startRow = part("start-row");
  var startButton = part("start");
  var actionRow = part("actions");
  var fillButton = part("fill");
  var removeButton = part("remove");
  var packButton = part("pack");
  var summary = part("summary");
  if (!svg || !stage || !stackLayer || !screen.weight || !screen.glyph || !fillButton || !packButton || leds.length !== 12) return;

  var reducedQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  function still() {
    var eschgi = window.eschgi;
    if (eschgi && typeof eschgi.reducedMotion === "boolean") return eschgi.reducedMotion;
    return !!(reducedQuery && reducedQuery.matches);
  }

  function intro() {
    return t("Fill five punnets to at least their target weight. Every gram above it is giveaway, so keep it as low as you can.");
  }

  var productKey = "strawberries";
  var product = PRODUCTS[productKey];
  var mode = "idle"; // idle, moving, playing, packing, done
  var punnet = null; // the punnet on the scale: { node, fruit, pieces, slots }
  var parked = null; // the last packed punnet, on the bench
  var weight = 0; // grams on the scale, net of the punnet
  var spring = { offset: 0, velocity: 0, damping: 0.3, quietSince: 0 }; // how the reading swings before it settles
  var falling = []; // pieces in the air
  var tweens = [];
  var pouring = false;
  var nextDropAt = 0;
  var packWhenSettled = false;
  var announceWhenSettled = false;
  var order = null;
  var frame = 0;
  var lastTime = 0;
  var shownReading = null;
  var scene = 0; // bumped when the fruit changes, so timers of the old scene do nothing
  var saying = null; // what the status line says, as a function, so it can be said again in another language
  var results = null; // the last order's numbers
  var operatorOn = false; // whether the screen shows the operator, or the station

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

  // The scale shows whole grams, as a packing scale with a 1 g division does.
  function grams(value) {
    var whole = Math.round(value);
    return String(whole === 0 ? 0 : whole);
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
      { d: star(radius * 0.16, -radius * 0.2, radius * 0.36, radius * 0.15, 5), fill: "#1b1f44", stroke: "#4c58a6", "stroke-width": 0.5 },
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
      {
        d: "M0 " + round(-h * 0.42) + "q" + round(w * 0.02) + " " + round(-h * 0.08) + " " + round(w * 0.06) + " " + round(-h * 0.13),
        stroke: "#3d8526",
        "stroke-width": 1.6,
        "stroke-linecap": "round",
        fill: "none",
      },
      group
    );
    return group;
  }

  // A round tomato, a little flattened, with its green calyx and a highlight.
  function drawTomato(size) {
    var group = el("g", {});
    var radius = size / 2;
    el("ellipse", { rx: round(radius), ry: round(radius * 0.9), fill: "url(#sc-tomato)" }, group);
    el(
      "ellipse",
      { cx: round(-radius * 0.38), cy: round(-radius * 0.3), rx: round(radius * 0.22), ry: round(radius * 0.13), fill: "#ffffff", opacity: 0.32, transform: "rotate(-32)" },
      group
    );
    el("path", { d: star(0, -radius * 0.72, radius * 0.46, radius * 0.11, 6), fill: "#3f8a26" }, group);
    el(
      "path",
      { d: "M0 " + round(-radius * 0.74) + "v" + round(-radius * 0.2), stroke: "#2f6b1c", "stroke-width": 1.8, "stroke-linecap": "round" },
      group
    );
    return group;
  }

  // ---------------------------------------------------------------- the punnets
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

  // An empty clear punnet: back wall, room for fruit, front wall with ribs, rim.
  function drawPunnet(parent) {
    var shape = product.punnet;
    var outline =
      "M" + -shape.bottom / 2 + " 0L" + shape.bottom / 2 + " 0L" + shape.top / 2 + " " + -shape.height + "L" + -shape.top / 2 + " " + -shape.height + "Z";
    var ribs = "";
    var ribCount = Math.round(shape.bottom / 16);
    for (var i = 1; i < ribCount; i++) {
      var share = i / ribCount;
      ribs += "M" + round(-shape.bottom / 2 + shape.bottom * share) + " -3L" + round(-shape.top / 2 + shape.top * share) + " " + (-shape.height + 3);
    }
    var node = el("g", { class: "scale__punnet" }, parent);
    el("ellipse", { class: "scale__punnet-shadow", rx: shape.bottom / 2 + 5, ry: 3 }, node);
    el("path", { class: "scale__punnet-back", d: outline }, node);
    var fruit = el("g", {}, node);
    el("path", { class: "scale__punnet-front", d: outline }, node);
    el("path", { class: "scale__punnet-ribs", d: ribs }, node);
    el("rect", { class: "scale__punnet-rim", x: -shape.top / 2 - 5, y: -shape.height - 4, width: shape.top + 10, height: 6, rx: 3 }, node);
    return { node: node, fruit: fruit };
  }

  function createPunnet() {
    var drawn = drawPunnet(stage);
    return { node: drawn.node, fruit: drawn.fruit, pieces: [], slots: makeSlots() };
  }

  function drawStack() {
    while (stackLayer.firstChild) stackLayer.removeChild(stackLayer.firstChild);
    for (var i = 0; i < 3; i++) place(drawPunnet(stackLayer).node, { x: STACK.x, y: STACK.y - i * 5, s: STACK.s });
  }

  function slotFor(target, index) {
    var slots = target.slots;
    if (index < slots.length) return slots[index];
    var top = slots[slots.length - 1 - (index % 4)];
    return { x: top.x + (Math.random() - 0.5) * product.size, y: top.y - product.size * 0.3, r: top.r };
  }

  function addPiece(target, pieceWeight, slot) {
    var node = product.draw(product.size * Math.pow(pieceWeight / product.mean, 1 / 3));
    target.fruit.appendChild(node);
    return { node: node, weight: pieceWeight, slot: slot };
  }

  // Fills a punnet at once to exactly its target, for the picture before anyone plays.
  function fillAtOnce(target) {
    var pieces = [];
    var total = 0;
    while (total < product.target) {
      var next = randomPieceWeight();
      pieces.push(next);
      total += next;
    }
    var wanted = product.target;
    var scaled = 0;
    pieces.forEach(function (value, index) {
      // The last piece takes up the rounding, so the reading is exactly the weight wanted.
      var share = index === pieces.length - 1 ? wanted - scaled : (value * wanted) / total;
      share = Math.round(share * 10) / 10;
      scaled += share;
      var piece = addPiece(target, share, slotFor(target, index));
      place(piece.node, piece.slot);
      target.pieces.push(piece);
    });
    return Math.round(scaled * 10) / 10;
  }

  // The label carries the declared weight, as on a real punnet: the target, not the reading.
  function printLabel(target, instant) {
    var shape = product.punnet;
    var label = el("g", { class: "scale__label" });
    el("rect", { x: -32, y: -15, width: 64, height: 30, rx: 2 }, label);
    var name = el("text", { class: "scale__label-name", x: -27, y: -6 }, label);
    name.textContent = product.name().toUpperCase();
    var netWeight = el("text", { class: "scale__label-weight", x: -27, y: 4.5 }, label);
    netWeight.textContent = product.target + " g";
    var bars = "";
    for (var x = -27; x < 26; x += 1 + Math.round(Math.random() * 2)) {
      var width = Math.random() < 0.4 ? 1.4 : 0.7;
      bars += "M" + x + " 7.5h" + width + "v5h" + -width + "Z";
    }
    el("path", { class: "scale__label-code", d: bars }, label);
    target.node.appendChild(label);
    var at = { x: 0, y: -shape.height * 0.42 };
    if (instant || still()) {
      place(label, at);
      return;
    }
    tween(label, { x: at.x, y: at.y - 6, s: 0.7, o: 0 }, { x: at.x, y: at.y, s: 1, o: 1 }, { duration: 200, ease: easeOut });
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

  // Moves a node from one state to another; `arc` lifts it on the way, as a hand would.
  function tween(node, from, to, options) {
    tweens.push({
      node: node,
      from: from,
      to: to,
      start: performance.now() + (options.delay || 0),
      duration: options.duration,
      ease: options.ease || easeInOut,
      arc: options.arc || 0,
      done: options.done,
    });
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
      if (item.arc) values.y -= item.arc * Math.sin(Math.PI * eased);
      place(item.node, values);
      if (progress >= 1) {
        tweens.splice(i, 1);
        if (item.done) item.done();
      }
    }
  }

  // The reading overshoots and swings for a moment whenever the load changes, as a real load
  // cell does: hard when fruit lands, gently when load comes off. STABLE lights once it settles.
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
    if (Math.abs(spring.offset) < 0.2 && Math.abs(spring.velocity) < 2) {
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
      if (mode === "playing") {
        var reading = grams(weight);
        var target = product.target;
        say(function () {
          return t("{weight} g of {target} g.", { weight: reading, target: target });
        });
      }
    }
    if (pouring || tweens.length || !settled() || packWhenSettled || announceWhenSettled) {
      frame = window.requestAnimationFrame(tick);
    }
  }

  // ---------------------------------------------------------------- the display
  // The tolerance light, as on the real scale. Under the target, red lights show how far off the
  // weight is, counting down from the middle, and fewer of them light the closer it gets; over the
  // tolerance, orange lights do the same upwards. On target, the whole light turns green.
  var LIGHT_STEPS = [0, 0.02, 0.05, 0.1, 0.2]; // one light more past each of these shares of the target
  var UNDER_LIGHTS = [4, 3, 2, 1, 0]; // segments, from the middle down
  var OVER_LIGHTS = [7, 8, 9, 10, 11]; // segments, from the middle up

  function lightsFor(distance) {
    return LIGHT_STEPS.filter(function (step) {
      return distance > step;
    }).length;
  }
  var GLYPHS = {
    "": "M235 75h12",
    under: "M232 75h18",
    ok: "M231.5 75.5l6 6 11.5-12.5",
    over: "M232 75h18M241 66v18",
  };
  var BAR_WIDTH = 78.6;
  var BAR_SPAN = 1.2; // the bar runs to 120 % of the target; the mark stands at 100 %

  function stateOf(reading) {
    if (reading < 1) return "";
    if (reading < product.target) return "under";
    return reading <= product.target * (1 + OK_SHARE) ? "ok" : "over";
  }

  function render(force) {
    var reading = Math.round(weight + spring.offset);
    if (reading === 0) reading = 0; // turns -0 into 0
    if (force || reading !== shownReading) {
      shownReading = reading;
      // Net in kilograms, as the real scale shows it: 253 g reads 0.253.
      screen.weight.textContent = (reading < 0 ? "-" : "") + (Math.abs(reading) / 1000).toFixed(3);
      var state = stateOf(reading);
      var deviation = (reading - product.target) / product.target;
      var colours = {};
      if (state === "under") {
        UNDER_LIGHTS.slice(0, lightsFor(-deviation)).forEach(function (level) {
          colours[level] = "under";
        });
      } else if (state === "over") {
        OVER_LIGHTS.slice(0, lightsFor(deviation - OK_SHARE)).forEach(function (level) {
          colours[level] = "over";
        });
      }
      leds.forEach(function (led, level) {
        var colour = state === "ok" ? "ok" : colours[level] || "";
        ["under", "ok", "over"].forEach(function (name) {
          setClass(led, "is-" + name, colour === name);
        });
      });
      ["under", "ok", "over"].forEach(function (name) {
        setClass(screen.glyph, "is-" + name, state === name);
        setClass(screen.bar, "is-" + name, state === name);
      });
      screen.glyph.setAttribute("d", GLYPHS[state]);
      var share = Math.max(0, Math.min(BAR_SPAN, reading / product.target)) / BAR_SPAN;
      screen.bar.setAttribute("width", String(round(BAR_WIDTH * share)));
    }
    var calm = settled();
    setClass(screen.stable, "is-on", calm && weight > 0);
    setClass(screen.zero, "is-on", calm && reading === 0);
  }

  function showProductOnScreen() {
    screen.productName.textContent = product.name() + " " + product.target + " g";
  }

  function showOperator(playing) {
    operatorOn = playing;
    screen.operator.textContent = playing ? t("Operator: you") : t("Station 1");
  }

  // The labels already printed, in the current language.
  function relabelPunnets() {
    var name = product.name().toUpperCase();
    Array.prototype.forEach.call(stage.querySelectorAll(".scale__label-name"), function (node) {
      node.textContent = name;
    });
  }

  // The operator's badge at the reader: a moment of lime on the RFID mark.
  function readBadge() {
    showOperator(true);
    if (!rfid || still()) return;
    setClass(rfid, "is-reading", true);
    later(function () {
      setClass(rfid, "is-reading", false);
    }, 700);
  }

  // ---------------------------------------------------------------- playing
  function randomPieceWeight() {
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
      say(function () {
        return t("The punnet is full. Take some out, or pack it.");
      });
      return;
    }
    if (order && !order.firstFillAt) order.firstFillAt = now;
    var piece = addPiece(punnet, randomPieceWeight(), slotFor(punnet, punnet.pieces.length + falling.length));
    if (still()) {
      place(piece.node, piece.slot);
      land(piece);
      return;
    }
    falling.push(piece);
    var drift = (Math.random() - 0.5) * 18;
    tween(
      piece.node,
      { x: piece.slot.x + drift, y: piece.slot.y - 300, r: piece.slot.r - 20 },
      { x: piece.slot.x, y: piece.slot.y, r: piece.slot.r },
      {
        duration: 320 + Math.random() * 90,
        ease: easeIn,
        done: function () {
          land(piece);
        },
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
        {
          duration: 360,
          ease: easeOut,
          done: function () {
            detach(piece.node);
          },
        }
      );
    }
    var taken = grams(piece.weight);
    say(function () {
      return t("Took out {weight} g.", { weight: taken });
    });
    announceWhenSettled = true;
    syncControls();
    wake();
  }

  // Stops pouring; the reading is announced once it settles, for anyone not watching the screen.
  function stopPour() {
    if (!pouring) return;
    haltPour();
    announceWhenSettled = true;
    wake();
  }

  function haltPour() {
    pouring = false;
    setClass(fillButton, "is-held", false);
  }

  function startPour() {
    if (mode !== "playing" || pouring) return;
    pouring = true;
    setClass(fillButton, "is-held", true);
    var now = performance.now();
    dropPiece(now);
    nextDropAt = now + Math.max(240, product.every); // a tap drops exactly one piece
    wake();
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

  // What the scale shows is what counts: whole grams, at or above the target to pass.
  function pack() {
    var current = punnet;
    var net = Math.round(weight);
    var accepted = net >= product.target;
    order.count += 1;
    order.lastPackAt = performance.now();
    if (accepted) {
      var extra = net - product.target;
      var share = (extra / product.target) * 100;
      order.packed += 1;
      order.giveaway += extra;
      printLabel(current);
      say(function () {
        return t("Packed {net} g: {extra} g giveaway ({share} %).", { net: net, extra: extra, share: decimal(share, 1) });
      });
      leave(current, "packed", 380);
    } else {
      var under = product.target - net;
      order.rejected += 1;
      say(function () {
        return t("Rejected: {grams} g under. Short punnets can't be sold.", { grams: under });
      });
      leave(current, "rejected", 120);
    }
    updateProgress();
    if (order.count >= PUNNETS_PER_ORDER) {
      mode = "moving";
      syncControls();
      later(finishOrder, still() ? 0 : 900);
    } else {
      arrive(accepted ? 560 : 300);
    }
  }

  // The punnet leaves the scale: set down on the bench when packed, off the bench when rejected.
  function leave(current, how, delay) {
    if (punnet === current) punnet = null;
    var load = weight;
    later(function () {
      weight = 0;
      kick(-load, 0, 0.8);
      wake();
    }, still() ? 0 : delay);
    if (how === "packed") {
      park(current, delay);
      return;
    }
    if (still()) {
      detach(current.node);
      return;
    }
    tween(
      current.node,
      { x: PAN.x, y: PAN.y, r: 0, o: 1 },
      { x: PAN.x - 40, y: PAN.y + 160, r: -38, o: 0 },
      {
        duration: 620,
        ease: easeIn,
        delay: delay,
        done: function () {
          detach(current.node);
        },
      }
    );
  }

  // A packed punnet goes to the bench on the right; the one before it moves on, out of sight.
  function park(current, delay) {
    var previous = parked;
    parked = current;
    if (previous) {
      if (still()) {
        detach(previous.node);
      } else {
        tween(
          previous.node,
          { x: PARKED.x, y: PARKED.y, s: PARKED.s },
          { x: PARKED.x + 190, y: PARKED.y, s: PARKED.s },
          {
            duration: 520,
            ease: easeIn,
            delay: delay,
            done: function () {
              detach(previous.node);
            },
          }
        );
      }
    }
    if (still()) {
      place(current.node, PARKED);
      return;
    }
    tween(current.node, { x: PAN.x, y: PAN.y, s: 1 }, { x: PARKED.x, y: PARKED.y, s: PARKED.s }, { duration: 660, delay: delay + 80, arc: 60 });
  }

  // An empty punnet comes from the stack on the left; the scale reads zero, the punnet tared.
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
      { x: STACK.x, y: STACK.y - 12, s: STACK.s },
      { x: PAN.x, y: PAN.y, s: 1 },
      {
        duration: 640,
        delay: delay,
        arc: 70,
        done: function () {
          kick(0, 18, 0.45);
          ready();
        },
      }
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
    readBadge();
    var hadPunnet = !!punnet;
    if (punnet) leave(punnet, "packed", 0);
    arrive(hadPunnet ? 260 : 0);
    updateProgress();
    say(function () {
      return t("Hold Fill to pour, tap it for a single piece. Pack once the reading settles.");
    });
  }

  function finishOrder() {
    mode = "done";
    var share = order.packed ? (order.giveaway / (product.target * order.packed)) * 100 : 0;
    var minutes = order.firstFillAt && order.lastPackAt > order.firstFillAt ? (order.lastPackAt - order.firstFillAt) / 60000 : 0;
    var perMinute = minutes ? order.packed / minutes : 0;
    results = { share: share, perMinute: perMinute, packed: order.packed, rejected: order.rejected };
    showResults();

    var best = loadBest();
    var previous = best[productKey];
    var clean = order.rejected === 0 && order.packed === PUNNETS_PER_ORDER;
    var fruit = product.fruit;
    var words;
    if (clean && (!previous || share < previous.giveaway)) {
      best[productKey] = { giveaway: share, perMinute: perMinute };
      saveBest(best);
      words = previous
        ? function () {
            return t("Order packed with {share} % giveaway: a new best for {fruit}.", { share: decimal(share, 1), fruit: fruit() });
          }
        : function () {
            return t("Order packed with {share} % giveaway. Now try to get it lower.", { share: decimal(share, 1) });
          };
    } else if (!clean) {
      var rejected = order.rejected;
      words = function () {
        return t("Order done, with {count} rejected. Underweight costs more than giveaway.", { count: rejected });
      };
    } else {
      var record = previous.giveaway;
      words = function () {
        return t("Order packed. Your best for {fruit}: {share} % giveaway.", { fruit: fruit(), share: decimal(record, 1) });
      };
    }
    say(words);
    showOperator(false);
    labelStart();
    syncControls();
    updateProgress();
  }

  function showResults() {
    if (!results) return;
    setKpi("giveaway", results.packed ? decimal(results.share, 1) + " %" : "–");
    setKpi("rate", results.perMinute ? decimal(results.perMinute, 1) : "–");
    setKpi("rejected", String(results.rejected));
  }

  function setKpi(name, value) {
    var node = figure.querySelector('[data-scale-kpi="' + name + '"]');
    if (node) node.textContent = value;
  }

  // Before the first order the button starts one; after it, it starts the next.
  function labelStart() {
    startButton.textContent = order ? t("Pack another order") : t("Start packing");
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
  // `words` is a function that returns the text, so the line can be said again in another language.
  function say(words) {
    saying = words;
    var text = words();
    if (statusText && statusText.textContent !== text) statusText.textContent = text;
  }

  function updateProgress() {
    if (!progressText) return;
    if (mode === "done") {
      progressText.textContent = t("Order done");
    } else if (order) {
      progressText.textContent = t("Punnet {number} of {total} · {giveaway} g giveaway", {
        number: Math.min(order.count + 1, PUNNETS_PER_ORDER),
        total: PUNNETS_PER_ORDER,
        giveaway: order.giveaway,
      });
    } else {
      var best = loadBest()[productKey];
      progressText.textContent = best
        ? t("Best: {share} % giveaway", { share: decimal(best.giveaway, 1) })
        : t("Goal: least giveaway");
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

  // The picture before anyone plays: a punnet just past its target on the scale, labelled, and
  // a packed one on the bench beside it.
  function showStation() {
    clearMotion();
    while (stage.firstChild) stage.removeChild(stage.firstChild);
    drawStack();

    parked = createPunnet();
    fillAtOnce(parked);
    printLabel(parked, true);
    place(parked.node, PARKED);

    punnet = createPunnet();
    place(punnet.node, PAN);
    weight = fillAtOnce(punnet);
    printLabel(punnet, true);
    spring.offset = 0;
    spring.velocity = 0;
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
    results = null;
    labelStart();
    if (rfid) setClass(rfid, "is-reading", false);
    showProductOnScreen();
    showOperator(false);
    showStation();
    syncControls();
    updateProgress();
    say(intro);
  }

  var narrowQuery = window.matchMedia ? window.matchMedia("(max-width: 519px)") : null;
  function fitView() {
    svg.setAttribute("viewBox", narrowQuery && narrowQuery.matches ? VIEW_NARROW : VIEW_WIDE);
  }

  // ---------------------------------------------------------------- wiring
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

  // Another language: everything the scale says, said again, without touching the game.
  document.addEventListener("eschgi:language", function () {
    showProductOnScreen();
    showOperator(operatorOn);
    relabelPunnets();
    labelStart();
    showResults();
    updateProgress();
    if (saying) say(saying);
  });

  selectProduct(productKey);
})();
