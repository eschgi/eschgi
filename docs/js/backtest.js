// eschgi.com — the backtest beside the self-hosted trading software, as a mini game.
// The trading software backtests every strategy against two opponents before it gets money:
// holding everything, and a random control. Here the visitor is the strategy: trade a demo market
// by hand for 160 days, paying 0.1 % a trade, and see whether that beats both of them.
//
// The illustration in index.html stays until someone plays; then this script draws the chart in
// the SVG's own pixels, so the trade markers keep their shape at any size. The prices are demo
// data, made up for each run. A classic deferred script, like the others.
(function () {
  "use strict";

  var figure = document.querySelector("[data-backtest]");
  if (!figure) return;

  var SVG_NS = "http://www.w3.org/2000/svg";
  var BEST_KEY = "eschgi.backtest.best";
  var DAYS = 160;
  var DAY_MS = 120;
  var FAST_DAY_MS = 28;
  var FEE = 0.001; // 0.1 % a trade
  var RANDOM_RUNS = 200;
  var SWITCH_CHANCE = 0.05; // a random strategy changes its mind about once every twenty days
  var PAD = { top: 12, right: 10, bottom: 12, left: 10 };

  var MARKETS = {
    crypto: { name: "Crypto", generate: cryptoPrices },
    stock: { name: "Stock", generate: stockPrices },
    forex: { name: "Forex", generate: forexPrices },
  };

  function part(name) {
    return figure.querySelector("[data-backtest-" + name + "]");
  }

  var plot = part("plot");
  var titleText = part("title");
  var progressText = part("progress");
  var nameText = part("name");
  var statusText = part("status");
  var marketButtons = figure.querySelectorAll("[data-backtest-market]");
  var startRow = part("start-row");
  var startButton = part("start");
  var actionRow = part("actions");
  var buyButton = part("buy");
  var sellButton = part("sell");
  var fastButton = part("fast");
  var summary = part("summary");
  if (!plot || !startButton || !buyButton || !sellButton || !fastButton) return;

  var INTRO =
    "Trade a demo market for 160 days. Beat holding everything and a random control, and your strategy would get money. Each trade costs 0.1 %.";

  var marketKey = "crypto";
  var mode = "idle"; // idle, running, done
  var run = null;
  var fast = false;
  var frame = 0;
  var lastTime = 0;
  var elapsed = 0;
  var chart = null; // the SVG elements of the live chart, once a run has started
  var size = { width: 600, height: 240 };

  // ---------------------------------------------------------------- demo prices
  function gaussian() {
    var u = 1 - Math.random();
    var v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  // Volatile, in long swings up and down, with the odd jump.
  function cryptoPrices() {
    var prices = [100];
    var trend = Math.random() < 0.5 ? 1 : -1;
    var left = 15 + Math.random() * 40;
    for (var day = 1; day <= DAYS; day++) {
      left -= 1;
      if (left <= 0) {
        trend = -trend;
        left = 20 + Math.random() * 45;
      }
      var change = trend * 0.004 + gaussian() * 0.022;
      if (Math.random() < 0.025) change += (Math.random() < 0.5 ? -1 : 1) * (0.04 + Math.random() * 0.05);
      prices.push(prices[day - 1] * Math.exp(change));
    }
    return prices;
  }

  // Trending up, with pullbacks.
  function stockPrices() {
    var prices = [100];
    var pullback = 0;
    for (var day = 1; day <= DAYS; day++) {
      if (!pullback && Math.random() < 0.015) pullback = 8 + Math.floor(Math.random() * 14);
      var drift = pullback ? -0.004 : 0.0022;
      if (pullback) pullback -= 1;
      prices.push(prices[day - 1] * Math.exp(drift + gaussian() * 0.0105));
    }
    return prices;
  }

  // Ranging: pulled back towards a level that itself drifts slowly.
  function forexPrices() {
    var prices = [100];
    var deviation = 0;
    var phase = Math.random() * Math.PI * 2;
    for (var day = 1; day <= DAYS; day++) {
      var level = 0.018 * Math.sin(phase + day / 18);
      deviation += -0.12 * (deviation - level) + gaussian() * 0.0042;
      prices.push(100 * Math.exp(deviation));
    }
    return prices;
  }

  // The median of many random strategies over the same prices, each paying the same fees.
  function randomControl(prices) {
    var curves = [];
    for (var index = 0; index < RANDOM_RUNS; index++) {
      var inMarket = Math.random() < 0.5;
      var equity = inMarket ? 100 * (1 - FEE) : 100;
      var curve = [equity];
      for (var day = 1; day <= DAYS; day++) {
        if (inMarket) equity *= prices[day] / prices[day - 1];
        if (day < DAYS && Math.random() < SWITCH_CHANCE) {
          inMarket = !inMarket;
          equity *= 1 - FEE;
        }
        curve.push(equity);
      }
      curves.push(curve);
    }
    var median = [];
    for (var at = 0; at <= DAYS; at++) {
      var values = curves
        .map(function (curve) {
          return curve[at];
        })
        .sort(function (a, b) {
          return a - b;
        });
      median.push((values[RANDOM_RUNS / 2 - 1] + values[RANDOM_RUNS / 2]) / 2);
    }
    return median;
  }

  // ---------------------------------------------------------------- formatting
  function percent(value) {
    var change = (value / 100 - 1) * 100;
    var text = Math.abs(change).toFixed(1) + " %";
    if (Math.abs(change) < 0.05) return "0.0 %";
    return (change > 0 ? "+" : "−") + text;
  }

  function points(value) {
    return value.toFixed(1);
  }

  // ---------------------------------------------------------------- the chart
  function el(name, attributes, parent) {
    var node = document.createElementNS(SVG_NS, name);
    for (var key in attributes) {
      if (Object.prototype.hasOwnProperty.call(attributes, key)) node.setAttribute(key, String(attributes[key]));
    }
    if (parent) parent.appendChild(node);
    return node;
  }

  function measure() {
    var box = plot.getBoundingClientRect();
    size.width = Math.max(200, Math.round(box.width));
    size.height = Math.max(120, Math.round(box.height));
    plot.setAttribute("viewBox", "0 0 " + size.width + " " + size.height);
  }

  // Replaces the illustration with the elements of a live chart.
  function buildChart() {
    while (plot.firstChild) plot.removeChild(plot.firstChild);
    measure();
    var defs = el("defs", {}, plot);
    var fill = el("linearGradient", { id: "backtest-fill", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el("stop", { offset: 0, "stop-color": "#a3e635", "stop-opacity": 0.16 }, fill);
    el("stop", { offset: 1, "stop-color": "#a3e635", "stop-opacity": 0 }, fill);
    chart = {
      grid: el("path", { class: "backtest__grid" }, plot),
      bands: el("g", {}, plot),
      base: el("path", { class: "backtest__base" }, plot),
      random: el("path", { class: "backtest__random" }, plot),
      hold: el("path", { class: "backtest__hold" }, plot),
      area: el("path", { class: "backtest__area" }, plot),
      you: el("path", { class: "backtest__you" }, plot),
      marks: el("g", {}, plot),
      cursor: el("path", { class: "backtest__cursor" }, plot),
      dot: el("circle", { class: "backtest__dot", r: 3.2 }, plot),
    };
  }

  function x(day) {
    return PAD.left + ((size.width - PAD.left - PAD.right) * day) / DAYS;
  }

  // The visible range: what the run has reached so far, with a little room above and below.
  var view = { low: 97, high: 103 };

  function y(value) {
    return PAD.top + (size.height - PAD.top - PAD.bottom) * (1 - (value - view.low) / (view.high - view.low));
  }

  function line(values, last) {
    var path = "";
    for (var day = 0; day <= last; day++) {
      path += (day ? "L" : "M") + x(day).toFixed(1) + " " + y(values[day]).toFixed(1);
    }
    return path;
  }

  function draw() {
    if (!run || !chart) return;
    var last = run.day;

    // The scale only ever widens, so the lines don't jump about as days come in.
    for (var day = 0; day <= last; day++) {
      var low = Math.min(run.hold[day], run.random[day], run.you[day]);
      var high = Math.max(run.hold[day], run.random[day], run.you[day]);
      if (low < run.low) run.low = low;
      if (high > run.high) run.high = high;
    }
    var span = run.high - run.low;
    view.low = run.low - span * 0.08;
    view.high = run.high + span * 0.08;

    var top = PAD.top;
    var bottom = size.height - PAD.bottom;
    var grid = "";
    for (var row = 1; row <= 3; row++) {
      var at = (top + ((bottom - top) * row) / 4).toFixed(1);
      grid += "M" + PAD.left + " " + at + "H" + (size.width - PAD.right);
    }
    chart.grid.setAttribute("d", grid);
    chart.base.setAttribute("d", "M" + PAD.left + " " + y(100).toFixed(1) + "H" + (size.width - PAD.right));

    while (chart.bands.firstChild) chart.bands.removeChild(chart.bands.firstChild);
    run.bands.forEach(function (band) {
      var from = x(band[0]);
      var to = x(band[1] === null ? last : band[1]);
      el("rect", { class: "backtest__band", x: from.toFixed(1), y: top, width: Math.max(1, to - from).toFixed(1), height: bottom - top }, chart.bands);
    });

    chart.random.setAttribute("d", line(run.random, last));
    chart.hold.setAttribute("d", line(run.hold, last));
    var you = line(run.you, last);
    chart.you.setAttribute("d", you);
    chart.area.setAttribute("d", you + "L" + x(last).toFixed(1) + " " + bottom + "L" + x(0).toFixed(1) + " " + bottom + "Z");

    while (chart.marks.firstChild) chart.marks.removeChild(chart.marks.firstChild);
    run.marks.forEach(function (mark) {
      var markX = x(mark.day);
      var markY = y(run.you[mark.day]);
      var shape =
        mark.kind === "buy"
          ? "M" + markX.toFixed(1) + " " + (markY + 5).toFixed(1) + "l4.5 7.5h-9Z"
          : "M" + markX.toFixed(1) + " " + (markY - 5).toFixed(1) + "l4.5 -7.5h-9Z";
      el("path", { class: mark.kind === "buy" ? "backtest__buy" : "backtest__sell", d: shape }, chart.marks);
    });

    var cursor = x(last).toFixed(1);
    chart.cursor.setAttribute("d", "M" + cursor + " " + top + "V" + bottom);
    chart.dot.setAttribute("cx", cursor);
    chart.dot.setAttribute("cy", y(run.you[last]).toFixed(1));

    showValues(last);
  }

  function showValues(day) {
    setValue("you", percent(run.you[day]));
    setValue("hold", percent(run.hold[day]));
    setValue("random", percent(run.random[day]));
    if (progressText && mode === "running") progressText.textContent = "Day " + day + " of " + DAYS;
  }

  function setValue(name, text) {
    var node = figure.querySelector('[data-backtest-value="' + name + '"]');
    if (node) node.textContent = text;
  }

  // ---------------------------------------------------------------- playing
  function startRun() {
    var prices = MARKETS[marketKey].generate();
    run = {
      prices: prices,
      hold: prices.map(function (price) {
        return 100 * (1 - FEE) * (price / prices[0]);
      }),
      random: randomControl(prices),
      you: [100],
      day: 0,
      inMarket: false,
      entry: 0,
      trades: 0,
      bands: [],
      marks: [],
      low: 97,
      high: 103,
    };
    mode = "running";
    fast = false;
    elapsed = 0;
    summary.hidden = true;
    if (nameText) nameText.textContent = "You";
    if (titleText) titleText.textContent = "Backtest: you against two opponents";
    buildChart();
    draw();
    syncControls();
    say("Buy when you think the market will rise, sell when you think it will fall. Hold Faster to speed up.");
    lastTime = performance.now();
    if (!frame) frame = window.requestAnimationFrame(tick);
  }

  function tick(now) {
    frame = 0;
    if (mode !== "running") return;
    elapsed += Math.min(250, Math.max(0, now - lastTime));
    lastTime = now;
    var interval = fast ? FAST_DAY_MS : DAY_MS;
    var advanced = false;
    for (var steps = 0; steps < 8 && elapsed >= interval && mode === "running"; steps++) {
      elapsed -= interval;
      advance();
      advanced = true;
    }
    if (advanced) draw();
    if (mode === "running") frame = window.requestAnimationFrame(tick);
  }

  function advance() {
    var day = run.day + 1;
    var value = run.you[run.day];
    if (run.inMarket) value *= run.prices[day] / run.prices[day - 1];
    run.you.push(value);
    run.day = day;
    if (day >= DAYS) finish();
  }

  function buy() {
    if (mode !== "running" || run.inMarket) return;
    run.inMarket = true;
    run.you[run.day] *= 1 - FEE;
    run.entry = run.you[run.day];
    run.trades += 1;
    run.bands.push([run.day, null]);
    run.marks.push({ day: run.day, kind: "buy" });
    say("Bought on day " + run.day + ". You're in the market.");
    syncControls();
    draw();
  }

  function sell() {
    if (mode !== "running" || !run.inMarket) return;
    run.inMarket = false;
    run.you[run.day] *= 1 - FEE;
    run.trades += 1;
    run.bands[run.bands.length - 1][1] = run.day;
    run.marks.push({ day: run.day, kind: "sell" });
    var trade = (run.you[run.day] / run.entry) * 100;
    say("Sold on day " + run.day + ": " + percent(trade) + " on that trade, after fees.");
    syncControls();
    draw();
  }

  function finish() {
    mode = "done";
    fast = false;
    setHeld(false);
    if (run.inMarket) run.bands[run.bands.length - 1][1] = DAYS;
    var you = run.you[DAYS];
    var hold = run.hold[DAYS];
    var random = run.random[DAYS];
    setKpi("you", percent(you));
    setKpi("hold", percent(hold));
    setKpi("random", percent(random));

    var beatsHold = you > hold;
    var beatsRandom = you > random;
    var line;
    if (beatsHold && beatsRandom) {
      line = "You made " + percent(you) + ", beating holding everything and the random control. This strategy would get money.";
      var edge = you - Math.max(hold, random);
      var best = loadBest();
      if (!best[marketKey] || edge > best[marketKey]) {
        best[marketKey] = edge;
        saveBest(best);
        line += " A new best: " + points(edge) + " points ahead.";
      }
    } else if (beatsRandom) {
      line = "Better than the random control, but holding everything did better. No money yet.";
    } else if (beatsHold) {
      line = "Better than holding everything, but no better than chance: the random control did as well. No money yet.";
    } else {
      line = "Holding everything and the random control both did better. No money yet.";
    }
    if (run.trades === 0) line = "No trades, no strategy: holding cash made 0.0 %. No money yet.";
    say(line);
    if (titleText) titleText.textContent = "Backtest: you against two opponents";
    if (progressText) progressText.textContent = run.trades + (run.trades === 1 ? " trade" : " trades") + ", " + DAYS + " days";
    startButton.textContent = "Run another backtest";
    syncControls();
  }

  function setKpi(name, value) {
    var node = figure.querySelector('[data-backtest-kpi="' + name + '"]');
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

  function showGoal() {
    if (!progressText) return;
    var best = loadBest()[marketKey];
    progressText.textContent = best ? "Best: " + points(best) + " points ahead" : "Goal: beat both opponents";
  }

  function syncControls() {
    var running = mode === "running";
    startRow.hidden = running;
    actionRow.hidden = !running;
    summary.hidden = mode !== "done";
    buyButton.disabled = !running || run.inMarket;
    sellButton.disabled = !running || !run.inMarket;
    fastButton.disabled = !running;
    Array.prototype.forEach.call(marketButtons, function (button) {
      button.disabled = running;
    });
  }

  function selectMarket(key) {
    if (!MARKETS[key] || mode === "running") return;
    marketKey = key;
    Array.prototype.forEach.call(marketButtons, function (button) {
      button.setAttribute("aria-pressed", String(button.getAttribute("data-backtest-market") === key));
    });
    if (mode === "idle") showGoal();
  }

  function setHeld(on) {
    var classes = (fastButton.getAttribute("class") || "").split(/\s+/).filter(function (name) {
      return name && name !== "is-held";
    });
    if (on) classes.push("is-held");
    fastButton.setAttribute("class", classes.join(" "));
  }

  function hurry(on) {
    if (mode !== "running" && on) return;
    fast = on;
    setHeld(on);
  }

  // ---------------------------------------------------------------- wiring
  Array.prototype.forEach.call(marketButtons, function (button) {
    button.addEventListener("click", function () {
      selectMarket(button.getAttribute("data-backtest-market"));
    });
  });
  startButton.addEventListener("click", startRun);
  buyButton.addEventListener("click", buy);
  sellButton.addEventListener("click", sell);

  // Faster speeds the days up while it is held, by pointer or by Space/Enter.
  fastButton.addEventListener("pointerdown", function (event) {
    if (event.button !== 0) return;
    event.preventDefault();
    try {
      fastButton.setPointerCapture(event.pointerId);
    } catch (error) {
      // Capture is a nicety: without it, leaving the button still ends the hurry.
    }
    hurry(true);
  });
  ["pointerup", "pointercancel", "lostpointercapture", "pointerleave", "blur"].forEach(function (type) {
    fastButton.addEventListener(type, function () {
      hurry(false);
    });
  });
  fastButton.addEventListener("keydown", function (event) {
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    if (!event.repeat) hurry(true);
  });
  fastButton.addEventListener("keyup", function (event) {
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    hurry(false);
  });
  fastButton.addEventListener("contextmenu", function (event) {
    event.preventDefault();
  });

  function redrawAtNewSize() {
    if (!chart) return;
    measure();
    draw();
  }
  if ("ResizeObserver" in window) {
    new ResizeObserver(redrawAtNewSize).observe(plot);
  } else {
    window.addEventListener("resize", redrawAtNewSize);
  }

  say(INTRO);
  showGoal();
  syncControls();
})();
