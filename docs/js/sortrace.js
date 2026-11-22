// eschgi.com — the sort race, on the Lab page: four sorting algorithms work on copies of the same
// numbers, each allowed the same number of steps per frame (a step is one comparison or one
// write), so they finish in the order their step counts put them in. Which one wins depends on
// the data, which is the point: measure, then optimize.
//
// Each algorithm is a generator that yields its steps; the lanes are canvases. A classic deferred
// script, like the others.
(function () {
  "use strict";

  var race = document.querySelector("[data-race]");
  if (!race) return;

  var COUNT = 40; // numbers in each lane
  var STEPS_PER_FRAME = 2;
  var PLACES = ["1st", "2nd", "3rd", "4th"];

  var lanes = Array.prototype.map.call(race.querySelectorAll("[data-race-lane]"), function (element) {
    return {
      element: element,
      name: element.getAttribute("data-race-lane"),
      canvas: element.querySelector("canvas"),
      stepsText: element.querySelector("[data-race-steps]"),
      place: element.querySelector("[data-race-place]"),
    };
  });
  var startButton = race.querySelector("[data-race-start]");
  var statusText = race.querySelector("[data-race-status]");
  var shapeButtons = race.querySelectorAll("[data-race-shape]");
  if (!lanes.length || !startButton) return;

  var shape = "random";
  var running = false;
  var frame = 0;
  var finished = 0;

  // ---------------------------------------------------------------- the numbers
  function numbers(kind) {
    var values = [];
    for (var i = 1; i <= COUNT; i++) values.push(kind === "few" ? 1 + Math.floor(Math.random() * 4) * 13 : i);
    if (kind === "reversed") return values.reverse();
    if (kind === "nearly") {
      // Sorted, but for a handful of neighbours that swapped places.
      for (var swaps = 0; swaps < 4; swaps++) {
        var at = Math.floor(Math.random() * (COUNT - 1));
        var keep = values[at];
        values[at] = values[at + 1];
        values[at + 1] = keep;
      }
      return values;
    }
    for (var j = values.length - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var swap = values[j];
      values[j] = values[k];
      values[k] = swap;
    }
    return values;
  }

  // ---------------------------------------------------------------- the algorithms
  // Each yields ["compare", i, j] before comparing and ["write", i] after writing a position.
  function swap(values, i, j) {
    var keep = values[i];
    values[i] = values[j];
    values[j] = keep;
  }

  var ALGORITHMS = {
    bubble: function* (values) {
      for (var end = values.length - 1; end > 0; end--) {
        var swapped = false;
        for (var i = 0; i < end; i++) {
          yield ["compare", i, i + 1];
          if (values[i] > values[i + 1]) {
            swap(values, i, i + 1);
            swapped = true;
            yield ["write", i, i + 1];
          }
        }
        if (!swapped) return;
      }
    },

    insertion: function* (values) {
      for (var i = 1; i < values.length; i++) {
        for (var j = i; j > 0; j--) {
          yield ["compare", j - 1, j];
          if (values[j - 1] <= values[j]) break;
          swap(values, j - 1, j);
          yield ["write", j - 1, j];
        }
      }
    },

    // Bottom-up merge sort: merges runs of 1, 2, 4… through a scratch copy.
    merge: function* (values) {
      var scratch = values.slice();
      for (var width = 1; width < values.length; width *= 2) {
        for (var low = 0; low < values.length - width; low += 2 * width) {
          var middle = low + width;
          var high = Math.min(low + 2 * width, values.length);
          for (var copy = low; copy < high; copy++) scratch[copy] = values[copy];
          var left = low;
          var right = middle;
          for (var at = low; at < high; at++) {
            if (left < middle && right < high) {
              yield ["compare", left, right];
              values[at] = scratch[left] <= scratch[right] ? scratch[left++] : scratch[right++];
            } else {
              values[at] = left < middle ? scratch[left++] : scratch[right++];
            }
            yield ["write", at];
          }
        }
      }
    },

    // Quicksort with the middle element as pivot (Hoare's scheme), so sorted input stays fast.
    quick: function* (values) {
      var ranges = [[0, values.length - 1]];
      while (ranges.length) {
        var range = ranges.pop();
        var low = range[0];
        var high = range[1];
        if (low >= high) continue;
        var pivot = values[(low + high) >> 1];
        var i = low;
        var j = high;
        while (i <= j) {
          for (;;) {
            yield ["compare", i, (low + high) >> 1];
            if (values[i] >= pivot) break;
            i++;
          }
          for (;;) {
            yield ["compare", j, (low + high) >> 1];
            if (values[j] <= pivot) break;
            j--;
          }
          if (i <= j) {
            if (i !== j) {
              swap(values, i, j);
              yield ["write", i, j];
            }
            i++;
            j--;
          }
        }
        ranges.push([low, j], [i, high]);
      }
    },
  };

  // ---------------------------------------------------------------- the lanes
  function size(lane) {
    var ratio = window.devicePixelRatio || 1;
    var box = lane.canvas.getBoundingClientRect();
    lane.width = Math.max(120, Math.round(box.width));
    lane.height = Math.max(60, Math.round(box.height));
    lane.canvas.width = Math.round(lane.width * ratio);
    lane.canvas.height = Math.round(lane.height * ratio);
    lane.context = lane.canvas.getContext("2d");
    lane.context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function draw(lane) {
    var context = lane.context;
    if (!context) return;
    context.clearRect(0, 0, lane.width, lane.height);
    var gap = lane.width / COUNT > 6 ? 2 : 1;
    var column = lane.width / COUNT;
    var highest = Math.max.apply(null, lane.values);
    for (var i = 0; i < lane.values.length; i++) {
      var height = Math.max(2, (lane.values[i] / highest) * (lane.height - 4));
      var colour = "#3f3f46";
      if (lane.done) colour = "rgba(163, 230, 53, 0.55)";
      else if (lane.touched && lane.touched.indexOf(i) >= 0) colour = lane.wrote ? "#ededf0" : "#a3e635";
      context.fillStyle = colour;
      context.fillRect(i * column + gap / 2, lane.height - height, Math.max(1, column - gap), height);
    }
  }

  function reset() {
    var start = numbers(shape);
    lanes.forEach(function (lane) {
      lane.values = start.slice();
      lane.stepCount = 0;
      lane.done = false;
      lane.touched = null;
      lane.run = ALGORITHMS[lane.name](lane.values);
      if (lane.stepsText) lane.stepsText.textContent = "0 steps";
      if (lane.place) lane.place.textContent = "";
      lane.element.classList.remove("is-winner");
      size(lane);
      draw(lane);
    });
    finished = 0;
  }

  function tick() {
    frame = 0;
    if (!running) return;
    lanes.forEach(function (lane) {
      if (lane.done) return;
      for (var step = 0; step < STEPS_PER_FRAME; step++) {
        var next = lane.run.next();
        if (next.done) {
          lane.done = true;
          lane.touched = null;
          finished += 1;
          if (lane.place) lane.place.textContent = PLACES[finished - 1];
          if (finished === 1) lane.element.classList.add("is-winner");
          break;
        }
        lane.stepCount += 1;
        lane.touched = next.value.slice(1);
        lane.wrote = next.value[0] === "write";
      }
      if (lane.stepsText) lane.stepsText.textContent = lane.stepCount + " steps";
      draw(lane);
    });
    if (finished === lanes.length) {
      running = false;
      startButton.disabled = false;
      startButton.textContent = "Race again";
      setShapesEnabled(true);
      var winner = lanes.slice().sort(function (a, b) {
        return a.stepCount - b.stepCount;
      });
      var slowest = winner[winner.length - 1];
      say(label(winner[0].name) + " wins with " + winner[0].stepCount + " steps; " + label(slowest.name).toLowerCase() + " needed " + slowest.stepCount + ".");
      return;
    }
    frame = window.requestAnimationFrame(tick);
  }

  function label(name) {
    var lane = race.querySelector('[data-race-lane="' + name + '"] b');
    return lane ? lane.textContent : name;
  }

  function startRace() {
    if (running) return;
    reset();
    running = true;
    startButton.disabled = true;
    setShapesEnabled(false);
    say("Racing on " + describe(shape) + "…");
    frame = window.requestAnimationFrame(tick);
  }

  function describe(kind) {
    return { random: "random numbers", nearly: "nearly sorted numbers", reversed: "reversed numbers", few: "few distinct numbers" }[kind];
  }

  function setShapesEnabled(on) {
    Array.prototype.forEach.call(shapeButtons, function (button) {
      button.disabled = !on;
    });
  }

  function say(text) {
    if (statusText) statusText.textContent = text;
  }

  Array.prototype.forEach.call(shapeButtons, function (button) {
    button.addEventListener("click", function () {
      if (running) return;
      shape = button.getAttribute("data-race-shape");
      Array.prototype.forEach.call(shapeButtons, function (other) {
        other.setAttribute("aria-pressed", String(other === button));
      });
      reset();
      startButton.textContent = "Start the race";
      say("Ready on " + describe(shape) + ".");
    });
  });
  startButton.addEventListener("click", startRace);

  function resize() {
    lanes.forEach(function (lane) {
      if (!lane.values) return;
      size(lane);
      draw(lane);
    });
  }
  if ("ResizeObserver" in window) {
    var observer = new ResizeObserver(resize);
    lanes.forEach(function (lane) {
      observer.observe(lane.canvas);
    });
  } else {
    window.addEventListener("resize", resize);
  }

  reset();
})();
