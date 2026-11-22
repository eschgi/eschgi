// eschgi.com — the backtest beside the self-hosted trading software, as a mini game.
// The trading software backtests every strategy against two opponents before it gets money:
// holding everything, and a random control. Before anyone plays, the chart shows a simple
// moving-average strategy's backtest. Then the visitor is the strategy: with 30 days of history on
// the chart, they move on a day at a time (or hold Next day to let the days run) and buy and sell
// at the latest close, paying 0.1 % a trade, for 60 days.
//
// Each day is drawn with its open, high, low and close, in the plot's own pixels so the chart
// stays crisp at any size. The prices are demo data, made up for each run. With JavaScript off,
// the illustration in index.html stays. A classic deferred script, like the others.
(function () {
  "use strict";

  var figure = document.querySelector("[data-backtest]");
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
  var BEST_KEY = "eschgi.backtest.best";
  var HISTORY_DAYS = 30;
  var PLAY_DAYS = 60;
  var HOLD_DELAY_MS = 320; // a tap on Next day moves on exactly one day
  var STEP_MS = 170; // then, while it is held, a day every this many milliseconds
  var FEE = 0.001; // 0.1 % a trade
  var RANDOM_RUNS = 200;
  var SWITCH_CHANCE = 0.08; // a random strategy changes its mind about once every twelve days
  var FAST_AVERAGE = 5; // the demo strategy: in while the 5-day average is above the 15-day one
  var SLOW_AVERAGE = 15;
  var PAD = { top: 16, right: 8, bottom: 10, left: 8 };

  // `wiggle` is a day's typical move, which also sets how far its high and low reach.
  var MARKETS = {
    crypto: { closes: cryptoCloses, wiggle: 0.022 },
    stock: { closes: stockCloses, wiggle: 0.0105 },
    forex: { closes: forexCloses, wiggle: 0.0042 },
  };

  function part(name) {
    return figure.querySelector("[data-backtest-" + name + "]");
  }

  var plot = part("plot");
  var titleText = part("title");
  var progressText = part("progress");
  var nameText = part("name");
  var holdKey = part("hold-key");
  var statusText = part("status");
  var marketButtons = figure.querySelectorAll("[data-backtest-market]");
  var startRow = part("start-row");
  var startButton = part("start");
  var actionRow = part("actions");
  var buyButton = part("buy");
  var sellButton = part("sell");
  var nextButton = part("next");
  var summary = part("summary");
  if (!plot || !startButton || !buyButton || !sellButton || !nextButton) return;

  function intro() {
    return t("Trade a demo market for 60 days. Make money and beat holding everything and a random control, and your strategy would get money. Each trade costs 0.1 %.");
  }

  var marketKey = "crypto";
  var mode = "idle"; // idle (the demo strategy's backtest), running, done
  var run = null;
  var saying = null; // what the status line says, as a function, so it can be said again in another language
  var holding = false;
  var nextStepAt = 0;
  var frame = 0;
  var chart = null;
  var size = { width: 600, height: 240 };
  var view = { low: 97, high: 103 };

  // ---------------------------------------------------------------- demo prices
  function gaussian() {
    var u = 1 - Math.random();
    var v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  // Volatile, in long swings up and down, with the odd jump.
  function cryptoCloses(count) {
    var closes = [100];
    var trend = Math.random() < 0.5 ? 1 : -1;
    var left = 10 + Math.random() * 30;
    for (var day = 1; day < count; day++) {
      left -= 1;
      if (left <= 0) {
        trend = -trend;
        left = 15 + Math.random() * 35;
      }
      var change = trend * 0.004 + gaussian() * 0.022;
      if (Math.random() < 0.025) change += (Math.random() < 0.5 ? -1 : 1) * (0.04 + Math.random() * 0.05);
      closes.push(closes[day - 1] * Math.exp(change));
    }
    return closes;
  }

  // Trending up, with pullbacks.
  function stockCloses(count) {
    var closes = [100];
    var pullback = 0;
    for (var day = 1; day < count; day++) {
      if (!pullback && Math.random() < 0.015) pullback = 8 + Math.floor(Math.random() * 14);
      var drift = pullback ? -0.004 : 0.0022;
      if (pullback) pullback -= 1;
      closes.push(closes[day - 1] * Math.exp(drift + gaussian() * 0.0105));
    }
    return closes;
  }

  // Ranging: pulled back towards a level that itself drifts slowly.
  function forexCloses(count) {
    var closes = [100];
    var deviation = 0;
    var phase = Math.random() * Math.PI * 2;
    for (var day = 1; day < count; day++) {
      var level = 0.018 * Math.sin(phase + day / 18);
      deviation += -0.12 * (deviation - level) + gaussian() * 0.0042;
      closes.push(100 * Math.exp(deviation));
    }
    return closes;
  }

  // Open, high, low and close for each day: a day opens near the last close, and its high and low
  // reach a little beyond the open and close. Prices are indexed to 100 at the last day of history.
  function newMarket(key) {
    var market = MARKETS[key];
    var closes = market.closes(HISTORY_DAYS + PLAY_DAYS);
    var base = closes[HISTORY_DAYS - 1];
    var days = closes.map(function (close, index) {
      var open = index ? closes[index - 1] * Math.exp(gaussian() * market.wiggle * 0.25) : close * Math.exp(gaussian() * market.wiggle * 0.5);
      var scale = 100 / base;
      return {
        open: open * scale,
        close: close * scale,
        high: Math.max(open, close) * Math.exp(Math.abs(gaussian()) * market.wiggle * 0.6) * scale,
        low: Math.min(open, close) * Math.exp(-Math.abs(gaussian()) * market.wiggle * 0.6) * scale,
      };
    });
    var hold = [];
    for (var day = 0; day <= PLAY_DAYS; day++) hold.push(100 * (1 - FEE) * (days[HISTORY_DAYS - 1 + day].close / 100));
    var data = { days: days, hold: hold };
    data.random = randomControl(data);
    return data;
  }

  // The close of a trading day: day 0 is the last day of history, where every strategy starts.
  function closeOf(data, day) {
    return data.days[HISTORY_DAYS - 1 + day].close;
  }

  // The median of many random strategies over the same prices, each paying the same fees.
  function randomControl(data) {
    var curves = [];
    for (var index = 0; index < RANDOM_RUNS; index++) {
      var inMarket = Math.random() < 0.5;
      var equity = inMarket ? 100 * (1 - FEE) : 100;
      var curve = [equity];
      for (var day = 1; day <= PLAY_DAYS; day++) {
        if (inMarket) equity *= closeOf(data, day) / closeOf(data, day - 1);
        if (day < PLAY_DAYS && Math.random() < SWITCH_CHANCE) {
          inMarket = !inMarket;
          equity *= 1 - FEE;
        }
        curve.push(equity);
      }
      curves.push(curve);
    }
    var median = [];
    for (var at = 0; at <= PLAY_DAYS; at++) {
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

  // ---------------------------------------------------------------- a strategy's run
  // `player` is the visitor's own run; the other is the demo strategy's.
  function newRun(data, player) {
    return {
      data: data,
      player: player,
      you: [100],
      day: 0,
      inMarket: false,
      entry: 0,
      trades: 0,
      bands: [],
      marks: [],
      low: Infinity,
      high: -Infinity,
    };
  }

  function advance(target) {
    var day = target.day + 1;
    var value = target.you[target.day];
    if (target.inMarket) value *= closeOf(target.data, day) / closeOf(target.data, day - 1);
    target.you.push(value);
    target.day = day;
  }

  function enter(target) {
    target.inMarket = true;
    target.you[target.day] *= 1 - FEE;
    target.entry = target.you[target.day];
    target.trades += 1;
    target.bands.push([target.day, null]);
    target.marks.push({ day: target.day, kind: "buy" });
  }

  function exit(target) {
    target.inMarket = false;
    target.you[target.day] *= 1 - FEE;
    target.trades += 1;
    target.bands[target.bands.length - 1][1] = target.day;
    target.marks.push({ day: target.day, kind: "sell" });
  }

  function average(data, end, length) {
    var sum = 0;
    for (var index = end - length + 1; index <= end; index++) sum += data.days[index].close;
    return sum / length;
  }

  // The picture before anyone plays: a moving-average strategy that makes money and beats both
  // opponents, on one of a few markets made up until it does.
  function demoRun() {
    var best = null;
    for (var attempt = 0; attempt < 60; attempt++) {
      var data = newMarket(marketKey);
      var demo = newRun(data, false);
      for (var day = 0; day < PLAY_DAYS; day++) {
        var index = HISTORY_DAYS - 1 + day;
        var rising = average(data, index, FAST_AVERAGE) > average(data, index, SLOW_AVERAGE);
        if (rising && !demo.inMarket) enter(demo);
        else if (!rising && demo.inMarket) exit(demo);
        advance(demo);
      }
      if (demo.inMarket) demo.bands[demo.bands.length - 1][1] = PLAY_DAYS;
      var edge = demo.you[PLAY_DAYS] - Math.max(data.hold[PLAY_DAYS], data.random[PLAY_DAYS]);
      // Beating both opponents counts most, then making money, then by how much it wins.
      var score = (edge > 0 ? 2 : 0) + (demo.you[PLAY_DAYS] > 100.5 ? 1 : 0);
      if (!best || score > best.score || (score === best.score && edge > best.edge)) {
        best = { run: demo, edge: edge, score: score };
      }
      if (score === 3 && edge > 3) break;
    }
    return best.run;
  }

  // ---------------------------------------------------------------- formatting
  function percent(value) {
    var change = (value / 100 - 1) * 100;
    if (Math.abs(change) < 0.05) return decimal(0, 1) + " %";
    return (change > 0 ? "+" : "−") + decimal(Math.abs(change), 1) + " %";
  }

  function points(value) {
    return decimal(value, 1);
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

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function measure() {
    var box = plot.getBoundingClientRect();
    size.width = Math.max(200, Math.round(box.width));
    size.height = Math.max(120, Math.round(box.height));
    plot.setAttribute("viewBox", "0 0 " + size.width + " " + size.height);
    plot.setAttribute("preserveAspectRatio", "none");
  }

  // Replaces the illustration with the elements of the live chart.
  function buildChart() {
    clear(plot);
    measure();
    var defs = el("defs", {}, plot);
    var fill = el("linearGradient", { id: "backtest-fill", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el("stop", { offset: 0, "stop-color": "#a3e635", "stop-opacity": 0.14 }, fill);
    el("stop", { offset: 1, "stop-color": "#a3e635", "stop-opacity": 0 }, fill);
    chart = {
      history: el("rect", { class: "backtest__history" }, plot),
      historyLabel: el("text", { class: "backtest__history-label" }, plot),
      grid: el("path", { class: "backtest__grid" }, plot),
      bands: el("g", {}, plot),
      start: el("path", { class: "backtest__start" }, plot),
      days: el("g", {}, plot),
      random: el("path", { class: "backtest__random" }, plot),
      area: el("path", { class: "backtest__area" }, plot),
      you: el("path", { class: "backtest__you" }, plot),
      marks: el("g", {}, plot),
      dot: el("circle", { class: "backtest__dot", r: 3.2 }, plot),
    };
    chart.historyLabel.textContent = t("history");
  }

  function slot() {
    return (size.width - PAD.left - PAD.right) / (HISTORY_DAYS + PLAY_DAYS);
  }

  // The centre of a day's candle, by its index in the whole series (history first).
  function xOfIndex(index) {
    return PAD.left + slot() * (index + 0.5);
  }

  // The centre of a trading day's candle: day 0 is the last day of history.
  function xOfDay(day) {
    return xOfIndex(HISTORY_DAYS - 1 + day);
  }

  function y(value) {
    return PAD.top + (size.height - PAD.top - PAD.bottom) * (1 - (value - view.low) / (view.high - view.low));
  }

  function line(values, last) {
    var path = "";
    for (var day = 0; day <= last; day++) path += (day ? "L" : "M") + xOfDay(day).toFixed(1) + " " + y(values[day]).toFixed(1);
    return path;
  }

  function draw() {
    if (!run || !chart) return;
    var data = run.data;
    var last = run.day;
    var shown = HISTORY_DAYS + last; // candles on the chart

    // The scale only ever widens during a run, so nothing jumps about as days come in.
    for (var index = 0; index < shown; index++) {
      run.low = Math.min(run.low, data.days[index].low);
      run.high = Math.max(run.high, data.days[index].high);
    }
    for (var day = 0; day <= last; day++) {
      run.low = Math.min(run.low, run.you[day], data.random[day]);
      run.high = Math.max(run.high, run.you[day], data.random[day]);
    }
    var span = Math.max(1, run.high - run.low);
    view.low = run.low - span * 0.06;
    view.high = run.high + span * 0.06;

    var top = PAD.top;
    var bottom = size.height - PAD.bottom;
    var width = slot();
    var startX = PAD.left + width * HISTORY_DAYS;
    chart.history.setAttribute("x", PAD.left);
    chart.history.setAttribute("y", top);
    chart.history.setAttribute("width", (startX - PAD.left).toFixed(1));
    chart.history.setAttribute("height", bottom - top);
    chart.historyLabel.setAttribute("x", PAD.left + 4);
    chart.historyLabel.setAttribute("y", top - 4);
    chart.start.setAttribute("d", "M" + startX.toFixed(1) + " " + top + "V" + bottom);

    var grid = "";
    for (var row = 1; row <= 3; row++) {
      var at = (top + ((bottom - top) * row) / 4).toFixed(1);
      grid += "M" + PAD.left + " " + at + "H" + (size.width - PAD.right);
    }
    chart.grid.setAttribute("d", grid);

    clear(chart.bands);
    run.bands.forEach(function (band) {
      var from = xOfDay(band[0]) + width / 2;
      var to = xOfDay(band[1] === null ? last : band[1]) + width / 2;
      if (to - from < 1) return;
      el("rect", { class: "backtest__band", x: from.toFixed(1), y: top, width: (to - from).toFixed(1), height: bottom - top }, chart.bands);
    });

    // One candle a day: the wick from low to high, the body from open to close.
    clear(chart.days);
    var body = Math.max(1, width * 0.62);
    for (var candle = 0; candle < shown; candle++) {
      var value = data.days[candle];
      var centre = xOfIndex(candle);
      var group = el(
        "g",
        { class: (value.close >= value.open ? "backtest__up" : "backtest__down") + (candle < HISTORY_DAYS ? " backtest__past" : "") },
        chart.days
      );
      el("rect", { x: (centre - 0.5).toFixed(1), y: y(value.high).toFixed(1), width: 1, height: Math.max(1, y(value.low) - y(value.high)).toFixed(1) }, group);
      var bodyTop = y(Math.max(value.open, value.close));
      el("rect", { x: (centre - body / 2).toFixed(1), y: bodyTop.toFixed(1), width: body.toFixed(1), height: Math.max(1, y(Math.min(value.open, value.close)) - bodyTop).toFixed(1) }, group);
    }

    chart.random.setAttribute("d", line(data.random, last));
    var you = line(run.you, last);
    chart.you.setAttribute("d", you);
    chart.area.setAttribute("d", you + "L" + xOfDay(last).toFixed(1) + " " + bottom + "L" + xOfDay(0).toFixed(1) + " " + bottom + "Z");

    // Buys below the day's candle, sells above it.
    clear(chart.marks);
    run.marks.forEach(function (mark) {
      var markX = xOfDay(mark.day).toFixed(1);
      var dayValue = data.days[HISTORY_DAYS - 1 + mark.day];
      var shape =
        mark.kind === "buy"
          ? "M" + markX + " " + (y(dayValue.low) + 4).toFixed(1) + "l4.5 7.5h-9Z"
          : "M" + markX + " " + (y(dayValue.high) - 4).toFixed(1) + "l4.5 -7.5h-9Z";
      el("path", { class: mark.kind === "buy" ? "backtest__buy" : "backtest__sell", d: shape }, chart.marks);
    });

    chart.dot.setAttribute("cx", xOfDay(last).toFixed(1));
    chart.dot.setAttribute("cy", y(run.you[last]).toFixed(1));
    showValues(last);
  }

  function showValues(day) {
    if (nameText) nameText.textContent = run.player ? t("You") : t("Strategy");
    setValue("you", percent(run.you[day]));
    setValue("hold", percent(run.data.hold[day]));
    setValue("random", percent(run.data.random[day]));
    if (progressText && mode === "running") progressText.textContent = t("Day {day} of {total}", { day: day, total: PLAY_DAYS });
  }

  function setValue(name, text) {
    var node = figure.querySelector('[data-backtest-value="' + name + '"]');
    if (node) node.textContent = text;
  }

  // ---------------------------------------------------------------- playing
  function showTitle() {
    if (!titleText) return;
    titleText.textContent =
      mode === "idle" ? t("Backtest: a strategy against its opponents") : t("Backtest: you against two opponents");
  }

  function showDemo() {
    run = demoRun();
    if (!chart) buildChart();
    else measure();
    showTitle();
    draw();
  }

  function startRun() {
    stopHolding();
    run = newRun(newMarket(marketKey), true);
    mode = "running";
    summary.hidden = true;
    showTitle();
    measure();
    draw();
    syncControls();
    say(function () {
      return t("30 days of history are on the chart. Tap Next day to move on a day, or hold it to let the days run. Buy and sell trade at the latest close.");
    });
  }

  function stepOnce() {
    if (mode !== "running") return;
    advance(run);
    if (run.day >= PLAY_DAYS) finish();
    draw();
  }

  function tick(now) {
    frame = 0;
    if (!holding || mode !== "running") return;
    for (var steps = 0; steps < 4 && now >= nextStepAt && mode === "running"; steps++) {
      stepOnce();
      nextStepAt += STEP_MS;
    }
    if (holding && mode === "running") frame = window.requestAnimationFrame(tick);
  }

  function startHolding() {
    if (mode !== "running" || holding) return;
    holding = true;
    setHeld(true);
    stepOnce();
    nextStepAt = performance.now() + HOLD_DELAY_MS;
    if (!frame) frame = window.requestAnimationFrame(tick);
  }

  function stopHolding() {
    holding = false;
    setHeld(false);
  }

  function buy() {
    if (mode !== "running" || run.inMarket) return;
    enter(run);
    var day = run.day;
    say(function () {
      return t("Bought at the close of day {day}. You're in the market.", { day: day });
    });
    syncControls();
    draw();
  }

  function sell() {
    if (mode !== "running" || !run.inMarket) return;
    exit(run);
    var day = run.day;
    var trade = (run.you[run.day] / run.entry) * 100;
    say(function () {
      return t("Sold at the close of day {day}: {change} on that trade, after fees.", { day: day, change: percent(trade) });
    });
    syncControls();
    draw();
  }

  function finish() {
    mode = "done";
    stopHolding();
    if (run.inMarket) run.bands[run.bands.length - 1][1] = PLAY_DAYS;
    var you = run.you[PLAY_DAYS];
    var hold = run.data.hold[PLAY_DAYS];
    var random = run.data.random[PLAY_DAYS];
    showResults();

    var beatsHold = you > hold;
    var beatsRandom = you > random;
    var words;
    if (beatsHold && beatsRandom && you > 100) {
      var edge = you - Math.max(hold, random);
      var best = loadBest();
      var record = !best[marketKey] || edge > best[marketKey];
      if (record) {
        best[marketKey] = edge;
        saveBest(best);
      }
      words = function () {
        var line = t("You made {result}, beating holding everything and the random control. This strategy would get money.", {
          result: percent(you),
        });
        return record ? line + " " + t("A new best: {points} points ahead.", { points: points(edge) }) : line;
      };
    } else if (beatsHold && beatsRandom) {
      words = function () {
        return t("You beat both opponents but still lost money ({result}). A strategy has to make money too. No money yet.", {
          result: percent(you),
        });
      };
    } else if (beatsRandom) {
      words = function () {
        return t("Better than the random control, but holding everything did better. No money yet.");
      };
    } else if (beatsHold) {
      words = function () {
        return t("Better than holding everything, but no better than chance: the random control did as well. No money yet.");
      };
    } else {
      words = function () {
        return t("Holding everything and the random control both did better. No money yet.");
      };
    }
    if (run.trades === 0) {
      words = function () {
        return t("No trades, no strategy: holding cash made {result}. No money yet.", { result: percent(100) });
      };
    }
    say(words);
    showProgress();
    labelStart();
    syncControls();
  }

  // The numbers of a finished run, in the summary below the chart.
  function showResults() {
    if (mode !== "done") return;
    setKpi("you", percent(run.you[PLAY_DAYS]));
    setKpi("hold", percent(run.data.hold[PLAY_DAYS]));
    setKpi("random", percent(run.data.random[PLAY_DAYS]));
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
  // `words` is a function that returns the text, so the line can be said again in another language.
  function say(words) {
    saying = words;
    var text = words();
    if (statusText && statusText.textContent !== text) statusText.textContent = text;
  }

  function showGoal() {
    if (!progressText) return;
    var best = loadBest()[marketKey];
    progressText.textContent = best ? t("Best: {points} points ahead", { points: points(best) }) : t("Goal: beat both opponents");
  }

  function showProgress() {
    if (!progressText) return;
    if (mode === "running") progressText.textContent = t("Day {day} of {total}", { day: run.day, total: PLAY_DAYS });
    else if (mode === "done") progressText.textContent = t("{count} trades, {days} days", { count: run.trades, days: PLAY_DAYS });
    else showGoal();
  }

  // Before the first run the button starts one; after it, it starts another.
  function labelStart() {
    startButton.textContent = mode === "idle" ? t("Start a backtest") : t("Run another backtest");
  }

  function syncControls() {
    var running = mode === "running";
    startRow.hidden = running;
    actionRow.hidden = !running;
    summary.hidden = mode !== "done";
    buyButton.disabled = !running || run.inMarket;
    sellButton.disabled = !running || !run.inMarket;
    nextButton.disabled = !running;
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
    if (mode === "idle") {
      showGoal();
      showDemo();
    }
  }

  function setHeld(on) {
    var classes = (nextButton.getAttribute("class") || "").split(/\s+/).filter(function (name) {
      return name && name !== "is-held";
    });
    if (on) classes.push("is-held");
    nextButton.setAttribute("class", classes.join(" "));
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

  // Next day moves on one day per tap; held, by pointer or by Space/Enter, it lets the days run.
  nextButton.addEventListener("pointerdown", function (event) {
    if (event.button !== 0) return;
    event.preventDefault();
    try {
      nextButton.setPointerCapture(event.pointerId);
    } catch (error) {
      // Capture is a nicety: without it, leaving the button still stops the days.
    }
    startHolding();
  });
  ["pointerup", "pointercancel", "lostpointercapture", "pointerleave", "blur"].forEach(function (type) {
    nextButton.addEventListener(type, stopHolding);
  });
  nextButton.addEventListener("keydown", function (event) {
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    if (!event.repeat) startHolding();
  });
  nextButton.addEventListener("keyup", function (event) {
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    stopHolding();
  });
  nextButton.addEventListener("contextmenu", function (event) {
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

  // Another language: everything the backtest says, said again, without touching the run.
  document.addEventListener("eschgi:language", function () {
    showTitle();
    if (chart) chart.historyLabel.textContent = t("history");
    if (run) showValues(run.day);
    showProgress();
    showResults();
    labelStart();
    if (saying) say(saying);
  });

  // With JavaScript, the legend's key for holding everything becomes a candle, as on the chart.
  if (holdKey) holdKey.setAttribute("class", "chart__key chart__key--candle");
  say(intro);
  showGoal();
  labelStart();
  syncControls();
  showDemo();
})();
