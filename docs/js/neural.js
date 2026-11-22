// eschgi.com — a neural network that learns in front of you, on the Lab page. Two inputs (a
// point's x and y), two hidden layers of eight tanh neurons and one sigmoid output, trained by
// gradient descent (Adam, on binary cross-entropy) right here in the browser, no library, no
// server. The field shows what the network believes about every point; the diagram shows each
// neuron's own view of the field and every weight, lime for positive, violet for negative.
//
// It trains only while on screen, and with reduced motion it waits for Train. A classic deferred
// script, like the others.
(function () {
  "use strict";

  var root = document.querySelector("[data-neural]");
  if (!root) return;

  var field = root.querySelector("[data-neural-field]");
  var net = root.querySelector("[data-neural-net]");
  var lossCanvas = root.querySelector("[data-neural-loss]");
  var trainButton = root.querySelector("[data-neural-train]");
  var stepButton = root.querySelector("[data-neural-step]");
  var resetButton = root.querySelector("[data-neural-reset]");
  var paintButton = root.querySelector("[data-neural-paint]");
  var statusText = root.querySelector("[data-neural-status]");
  var dataButtons = root.querySelectorAll("[data-neural-data]");
  if (!field || !net || !trainButton || !field.getContext) return;

  var LAYERS = [2, 8, 8, 1];
  var LEARNING_RATE = 0.01;
  var SLOW_EPOCHS = 300; // one epoch a frame at first, so the learning can be watched; then faster
  var FAST_STEPS = 4;
  var GRID = 56; // the field is evaluated on a GRID × GRID raster, then smoothed up
  var NEURON_GRID = 18;
  var MAX_EPOCHS = 20000;
  var LIME = [163, 230, 53];
  var VIOLET = [196, 181, 253];
  var GROUND = [19, 19, 22];
  var FONT = '500 10px "Inter Variable", system-ui, sans-serif';

  var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------------------------------------------------------------- the data
  // Points in [-1, 1]², each labelled 1 (lime) or 0 (violet).
  function noise(amount) {
    return (Math.random() * 2 - 1) * amount;
  }

  var DATASETS = {
    circle: function () {
      var points = [];
      for (var i = 0; i < 200; i++) {
        var inside = i % 2 === 0;
        var radius = inside ? Math.random() * 0.42 : 0.62 + Math.random() * 0.32;
        var angle = Math.random() * Math.PI * 2;
        points.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle), label: inside ? 1 : 0 });
      }
      return points;
    },
    xor: function () {
      var points = [];
      while (points.length < 200) {
        var x = Math.random() * 1.9 - 0.95;
        var y = Math.random() * 1.9 - 0.95;
        if (Math.abs(x) < 0.08 || Math.abs(y) < 0.08) continue;
        points.push({ x: x, y: y, label: x * y > 0 ? 1 : 0 });
      }
      return points;
    },
    moons: function () {
      var points = [];
      for (var i = 0; i < 200; i++) {
        var upper = i % 2 === 0;
        var t = Math.random() * Math.PI;
        var x = upper ? Math.cos(t) : 1 - Math.cos(t);
        var y = upper ? Math.sin(t) : 0.5 - Math.sin(t);
        points.push({ x: (x - 0.5) * 0.85 + noise(0.07), y: (y - 0.25) * 1.1 + noise(0.07), label: upper ? 1 : 0 });
      }
      return points;
    },
    spiral: function () {
      var points = [];
      for (var i = 0; i < 100; i++) {
        var radius = 0.08 + (i / 100) * 0.85;
        var turn = (i / 100) * Math.PI * 3.2;
        for (var arm = 0; arm < 2; arm++) {
          var angle = turn + arm * Math.PI;
          points.push({ x: radius * Math.cos(angle) + noise(0.025), y: radius * Math.sin(angle) + noise(0.025), label: arm ? 0 : 1 });
        }
      }
      return points;
    },
  };

  // ---------------------------------------------------------------- the network
  // weights[l][j][i] connects neuron i of layer l to neuron j of layer l + 1.
  var weights;
  var biases;
  var adam;
  var epoch;
  var losses;

  function initialise() {
    weights = [];
    biases = [];
    adam = { step: 0, m: [], v: [] };
    for (var layer = 0; layer < LAYERS.length - 1; layer++) {
      var fanIn = LAYERS[layer];
      var fanOut = LAYERS[layer + 1];
      var limit = Math.sqrt(6 / (fanIn + fanOut));
      var matrix = [];
      for (var j = 0; j < fanOut; j++) {
        var row = [];
        for (var i = 0; i < fanIn; i++) row.push((Math.random() * 2 - 1) * limit);
        matrix.push(row);
      }
      weights.push(matrix);
      biases.push(new Array(fanOut).fill(0));
    }
    adam.m = zerosLike();
    adam.v = zerosLike();
    epoch = 0;
    losses = [];
  }

  function zerosLike() {
    return {
      weights: weights.map(function (matrix) {
        return matrix.map(function (row) {
          return row.map(function () {
            return 0;
          });
        });
      }),
      biases: biases.map(function (vector) {
        return vector.map(function () {
          return 0;
        });
      }),
    };
  }

  // Every layer's activations for one input: [inputs, hidden 1, hidden 2, output].
  function forward(x, y) {
    var activations = [[x, y]];
    for (var layer = 0; layer < weights.length; layer++) {
      var input = activations[layer];
      var output = [];
      var last = layer === weights.length - 1;
      for (var j = 0; j < weights[layer].length; j++) {
        var sum = biases[layer][j];
        var row = weights[layer][j];
        for (var i = 0; i < row.length; i++) sum += row[i] * input[i];
        output.push(last ? 1 / (1 + Math.exp(-sum)) : Math.tanh(sum));
      }
      activations.push(output);
    }
    return activations;
  }

  // One step of Adam on the whole data set; returns the mean loss before the step.
  function trainStep() {
    var gradient = zerosLike();
    var loss = 0;
    var correct = 0;
    for (var p = 0; p < points.length; p++) {
      var point = points[p];
      var activations = forward(point.x, point.y);
      var predicted = activations[activations.length - 1][0];
      var clamped = Math.min(1 - 1e-7, Math.max(1e-7, predicted));
      loss += -(point.label * Math.log(clamped) + (1 - point.label) * Math.log(1 - clamped));
      if ((predicted >= 0.5 ? 1 : 0) === point.label) correct += 1;
      // Sigmoid with cross-entropy: the output's error is simply predicted − label.
      var delta = [predicted - point.label];
      for (var layer = weights.length - 1; layer >= 0; layer--) {
        var input = activations[layer];
        var previous = layer > 0 ? new Array(input.length).fill(0) : null;
        for (var j = 0; j < delta.length; j++) {
          gradient.biases[layer][j] += delta[j];
          for (var i = 0; i < input.length; i++) {
            gradient.weights[layer][j][i] += delta[j] * input[i];
            if (previous) previous[i] += delta[j] * weights[layer][j][i];
          }
        }
        if (previous) {
          for (var k = 0; k < previous.length; k++) previous[k] *= 1 - input[k] * input[k]; // tanh′
          delta = previous;
        }
      }
    }
    var count = Math.max(1, points.length);
    adam.step += 1;
    var beta1 = 0.9;
    var beta2 = 0.999;
    var correction1 = 1 - Math.pow(beta1, adam.step);
    var correction2 = 1 - Math.pow(beta2, adam.step);
    function update(values, grads, m, v, index) {
      var g = grads[index] / count;
      m[index] = beta1 * m[index] + (1 - beta1) * g;
      v[index] = beta2 * v[index] + (1 - beta2) * g * g;
      values[index] -= (LEARNING_RATE * (m[index] / correction1)) / (Math.sqrt(v[index] / correction2) + 1e-8);
    }
    for (var l = 0; l < weights.length; l++) {
      for (var r = 0; r < weights[l].length; r++) {
        for (var c = 0; c < weights[l][r].length; c++) update(weights[l][r], gradient.weights[l][r], adam.m.weights[l][r], adam.v.weights[l][r], c);
        update(biases[l], gradient.biases[l], adam.m.biases[l], adam.v.biases[l], r);
      }
    }
    epoch += 1;
    var mean = loss / count;
    losses.push(mean); // the whole run, so the curve always shows the early drop
    lastAccuracy = correct / count;
    return mean;
  }

  // ---------------------------------------------------------------- drawing
  var points = [];
  var lastAccuracy = 0;
  var datasetKey = "circle";
  var paintLabel = 1;
  var running = false;
  var learned = false; // stopped by itself, its loss as low as it gets
  var onScreen = false;
  var started = false;
  var frame = 0;
  var fieldRaster = document.createElement("canvas");
  fieldRaster.width = GRID;
  fieldRaster.height = GRID;
  var neuronRaster = document.createElement("canvas");
  neuronRaster.width = NEURON_GRID;
  neuronRaster.height = NEURON_GRID;

  function prepare(canvas, height) {
    var ratio = window.devicePixelRatio || 1;
    var width = Math.max(120, Math.round(canvas.getBoundingClientRect().width));
    var tall = height || width;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(tall * ratio);
    canvas.style.height = tall + "px";
    var context = canvas.getContext("2d");
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { context: context, width: width, height: tall };
  }

  var fieldView;
  var netView;
  var lossView;

  function layout() {
    fieldView = prepare(field);
    var fieldHeight = fieldView.height;
    var wide = window.matchMedia("(min-width: 860px)").matches;
    netView = prepare(net, wide ? Math.round(fieldHeight * 0.74) : 210);
    lossView = prepare(lossCanvas, wide ? Math.round(fieldHeight * 0.26) - 12 : 90);
    render();
  }

  function blend(probability) {
    var colour = probability >= 0.5 ? LIME : VIOLET;
    var strength = Math.abs(probability - 0.5) * 2 * 0.5;
    return [
      Math.round(GROUND[0] * (1 - strength) + colour[0] * strength),
      Math.round(GROUND[1] * (1 - strength) + colour[1] * strength),
      Math.round(GROUND[2] * (1 - strength) + colour[2] * strength),
    ];
  }

  // A raster of one neuron's (or the output's) value over the whole field; valueAt gets the
  // raster cell's index and its point in the field.
  function paintRaster(raster, size, valueAt) {
    var context = raster.getContext("2d");
    var image = context.createImageData(size, size);
    for (var row = 0; row < size; row++) {
      for (var column = 0; column < size; column++) {
        var x = (column / (size - 1)) * 2 - 1;
        var y = 1 - (row / (size - 1)) * 2;
        var colour = blend(valueAt(row * size + column, x, y));
        var at = (row * size + column) * 4;
        image.data[at] = colour[0];
        image.data[at + 1] = colour[1];
        image.data[at + 2] = colour[2];
        image.data[at + 3] = 255;
      }
    }
    context.putImageData(image, 0, 0);
    return raster;
  }

  function drawField() {
    var context = fieldView.context;
    var size = fieldView.width;
    paintRaster(fieldRaster, GRID, function (cellIndex, x, y) {
      var activations = forward(x, y);
      return activations[activations.length - 1][0];
    });
    context.imageSmoothingEnabled = true;
    context.drawImage(fieldRaster, 0, 0, size, size);
    for (var p = 0; p < points.length; p++) {
      var point = points[p];
      var px = ((point.x + 1) / 2) * size;
      var py = ((1 - point.y) / 2) * size;
      var predicted = forward(point.x, point.y)[LAYERS.length - 1][0];
      var wrong = (predicted >= 0.5 ? 1 : 0) !== point.label;
      context.beginPath();
      context.arc(px, py, 3.6, 0, Math.PI * 2);
      context.fillStyle = point.label ? "#a3e635" : "#c4b5fd";
      context.fill();
      context.lineWidth = wrong ? 1.6 : 1;
      context.strokeStyle = wrong ? "#ffffff" : "#0c0c0e";
      context.stroke();
    }
  }

  // The network: every weight as a line, every neuron as its own small map of the field.
  function drawNet() {
    var context = netView.context;
    var width = netView.width;
    var height = netView.height;
    context.clearRect(0, 0, width, height);
    var node = Math.max(16, Math.min(26, Math.floor((height - 16) / 9.5)));
    var columns = LAYERS.length;
    var positions = LAYERS.map(function (count, layer) {
      var x = node / 2 + 4 + ((width - node - 8) * layer) / (columns - 1);
      var spacing = Math.min(node * 1.18, (height - node) / Math.max(1, count - 1));
      var top = height / 2 - (spacing * (count - 1)) / 2;
      var column = [];
      for (var n = 0; n < count; n++) column.push({ x: x, y: count === 1 ? height / 2 : top + spacing * n });
      return column;
    });
    for (var layer = 0; layer < weights.length; layer++) {
      for (var j = 0; j < weights[layer].length; j++) {
        for (var i = 0; i < weights[layer][j].length; i++) {
          var weight = weights[layer][j][i];
          var from = positions[layer][i];
          var to = positions[layer + 1][j];
          context.beginPath();
          context.moveTo(from.x + node / 2, from.y);
          context.lineTo(to.x - node / 2, to.y);
          context.strokeStyle = weight >= 0 ? "rgba(163, 230, 53," + Math.min(0.85, 0.12 + Math.abs(weight) * 0.3) + ")" : "rgba(196, 181, 253," + Math.min(0.85, 0.12 + Math.abs(weight) * 0.3) + ")";
          context.lineWidth = Math.min(3, 0.4 + Math.abs(weight) * 0.8);
          context.stroke();
        }
      }
    }
    context.imageSmoothingEnabled = true;
    var grid = [];
    for (var row = 0; row < NEURON_GRID; row++) {
      for (var column = 0; column < NEURON_GRID; column++) {
        grid.push(forward((column / (NEURON_GRID - 1)) * 2 - 1, 1 - (row / (NEURON_GRID - 1)) * 2));
      }
    }
    for (var l = 0; l < LAYERS.length; l++) {
      for (var n2 = 0; n2 < LAYERS[l]; n2++) {
        var spot = positions[l][n2];
        var size = l === LAYERS.length - 1 ? node * 1.5 : node;
        paintRaster(neuronRaster, NEURON_GRID, valueOf(grid, l, n2));
        context.drawImage(neuronRaster, spot.x - size / 2, spot.y - size / 2, size, size);
        context.strokeStyle = "#2c2c32";
        context.lineWidth = 1;
        context.strokeRect(spot.x - size / 2 + 0.5, spot.y - size / 2 + 0.5, size - 1, size - 1);
      }
    }
    context.fillStyle = "#8b8b94";
    context.font = FONT;
    context.textAlign = "center";
    ["x, y", "hidden", "hidden", "output"].forEach(function (name, layer) {
      context.fillText(name, positions[layer][0].x, height - 2);
    });
  }

  // What a neuron sees over the field: the output is a probability already; inputs and hidden
  // tanh values run from −1 to 1 and are mapped onto 0..1.
  function valueOf(grid, layer, index) {
    return function (cellIndex) {
      var value = grid[cellIndex][layer][index];
      return layer === LAYERS.length - 1 ? value : (value + 1) / 2;
    };
  }

  function drawLoss() {
    var context = lossView.context;
    var width = lossView.width;
    var height = lossView.height;
    context.clearRect(0, 0, width, height);
    context.strokeStyle = "#212126";
    context.lineWidth = 1;
    context.strokeRect(0.5, 0.5, width - 1, height - 1);
    context.fillStyle = "#8b8b94";
    context.font = FONT;
    context.textAlign = "left";
    context.fillText("loss", 8, 14);
    if (losses.length < 2) return;
    var top = Math.max(0.7, losses[0]);
    // At most about 300 points, however long the run.
    var stride = Math.max(1, Math.floor(losses.length / 300));
    context.beginPath();
    for (var i = 0; i < losses.length; i += stride) {
      var at = Math.min(i, losses.length - 1);
      var x = 4 + ((width - 8) * at) / (losses.length - 1);
      var y = height - 6 - ((height - 22) * Math.min(top, losses[at])) / top;
      if (i) context.lineTo(x, y);
      else context.moveTo(x, y);
    }
    var lastX = width - 4;
    context.lineTo(lastX, height - 6 - ((height - 22) * Math.min(top, losses[losses.length - 1])) / top);
    context.strokeStyle = "#a3e635";
    context.lineWidth = 1.6;
    context.stroke();
  }

  var tick = 0;
  function render() {
    if (!fieldView) return;
    drawField();
    if (tick % 2 === 0 || !running) drawNet();
    drawLoss();
    tick += 1;
  }

  function report() {
    if (!statusText) return;
    var loss = losses.length ? losses[losses.length - 1] : NaN;
    var line = "Epoch " + epoch.toLocaleString("en-US") + " · loss " + (isNaN(loss) ? "–" : loss.toFixed(3)) + " · accuracy " + Math.round(lastAccuracy * 100) + " %";
    // Gradient descent can settle in a local minimum; new random weights usually get out of it.
    if (epoch > 3000 && lastAccuracy < 0.8) line += " · stuck in a local minimum? Try New weights";
    else if (learned) line += " · learned it";
    else if (!running && epoch) line += " · paused";
    statusText.textContent = line;
  }

  // ---------------------------------------------------------------- training
  function loop() {
    frame = 0;
    if (!running || !onScreen) return;
    var loss = 0;
    var steps = epoch < SLOW_EPOCHS ? 1 : FAST_STEPS;
    for (var s = 0; s < steps; s++) loss = trainStep();
    render();
    report();
    if (epoch >= MAX_EPOCHS || (loss < 0.004 && lastAccuracy === 1)) {
      learned = true;
      setRunning(false);
      return;
    }
    frame = window.requestAnimationFrame(loop);
  }

  function setRunning(on) {
    running = on;
    if (on) learned = false;
    trainButton.textContent = on ? "Pause" : epoch ? "Train on" : "Train";
    trainButton.setAttribute("aria-pressed", String(on));
    if (on && onScreen && !frame) frame = window.requestAnimationFrame(loop);
    if (!on) report();
  }

  function loadData(key) {
    learned = false;
    datasetKey = key;
    points = DATASETS[key]();
    Array.prototype.forEach.call(dataButtons, function (button) {
      button.setAttribute("aria-pressed", String(button.getAttribute("data-neural-data") === key));
    });
    initialise();
    evaluate();
    render();
    report();
  }

  // Accuracy without training, for the status line after a change.
  function evaluate() {
    var correct = 0;
    for (var p = 0; p < points.length; p++) {
      var predicted = forward(points[p].x, points[p].y)[LAYERS.length - 1][0];
      if ((predicted >= 0.5 ? 1 : 0) === points[p].label) correct += 1;
    }
    lastAccuracy = points.length ? correct / points.length : 0;
  }

  // ---------------------------------------------------------------- wiring
  Array.prototype.forEach.call(dataButtons, function (button) {
    button.addEventListener("click", function () {
      loadData(button.getAttribute("data-neural-data"));
      setRunning(!reducedMotion || running);
    });
  });
  trainButton.addEventListener("click", function () {
    setRunning(!running);
  });
  stepButton.addEventListener("click", function () {
    setRunning(false);
    for (var s = 0; s < 10; s++) trainStep();
    render();
    report();
  });
  resetButton.addEventListener("click", function () {
    learned = false;
    initialise();
    evaluate();
    render();
    setRunning(running);
    report();
  });
  paintButton.addEventListener("click", function () {
    paintLabel = paintLabel ? 0 : 1;
    paintButton.innerHTML = 'Click adds <i class="neural__swatch neural__swatch--' + (paintLabel ? "lime" : "violet") + '"></i>' + (paintLabel ? "lime" : "violet");
  });

  // A click on the field adds a point there, in the colour the button shows.
  field.addEventListener("click", function (event) {
    var box = field.getBoundingClientRect();
    var x = ((event.clientX - box.left) / box.width) * 2 - 1;
    var y = 1 - ((event.clientY - box.top) / box.height) * 2;
    points.push({ x: x, y: y, label: paintLabel });
    evaluate();
    render();
    report();
    if (!running && epoch && !reducedMotion) setRunning(true);
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      function (entries) {
        onScreen = entries[0].isIntersecting;
        if (onScreen && !started) {
          started = true;
          setRunning(!reducedMotion);
        } else if (onScreen && running && !frame) {
          frame = window.requestAnimationFrame(loop);
        }
      },
      { threshold: 0.25 }
    ).observe(field);
  } else {
    onScreen = true;
  }
  var laidOutWidth = 0;
  function relayout() {
    var width = Math.round(root.getBoundingClientRect().width);
    if (width === laidOutWidth) return;
    laidOutWidth = width;
    layout();
  }
  if ("ResizeObserver" in window) {
    new ResizeObserver(function () {
      window.requestAnimationFrame(relayout);
    }).observe(root);
  } else {
    window.addEventListener("resize", relayout);
  }

  loadData(datasetKey);
  relayout();
})();
