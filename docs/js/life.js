// eschgi.com — Conway's Game of Life, on the Lab page. A cell with two or three live neighbours
// lives on, an empty cell with exactly three comes alive, every other cell dies; the board wraps
// around at its edges. Cells that just died fade out over a few generations, a trail of where
// things moved. Draw with a pointer; Play, Step, Random, Glider gun and Clear do the rest.
//
// It plays only while the board is on screen, and with reduced motion it waits for Play. A classic
// deferred script, like the others.
(function () {
  "use strict";

  var root = document.querySelector("[data-life]");
  if (!root) return;

  var canvas = root.querySelector("[data-life-board]");
  var playButton = root.querySelector("[data-life-play]");
  var statusText = root.querySelector("[data-life-status]");
  if (!canvas || !playButton || !canvas.getContext) return;

  var GENERATION_MS = 110;
  var TRAIL = 4; // generations a dead cell takes to fade
  var MIN_COLUMNS = 40; // so the glider gun always fits

  // Gosper's glider gun, the first pattern found to grow forever.
  var GUN = [
    "........................O...........",
    "......................O.O...........",
    "............OO......OO............OO",
    "...........O...O....OO............OO",
    "OO........O.....O...OO..............",
    "OO........O...O.OO....O.O...........",
    "..........O.....O.......O...........",
    "...........O...O....................",
    "............OO......................",
  ];

  var columns = 0;
  var rows = 0;
  var cell = 10;
  var cells = null; // 1 alive, 0 dead
  var trail = null; // generations since a cell died, for the fading
  var generation = 0;
  var playing = false;
  var onScreen = false;
  var timer = 0;
  var context = canvas.getContext("2d");
  var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Whole cells only: the board takes as many as fit its frame, at 6 to 12 pixels a cell.
  var stage = canvas.parentNode;
  function layout() {
    var ratio = window.devicePixelRatio || 1;
    var style = window.getComputedStyle(stage);
    var width = Math.max(200, stage.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight));
    cell = Math.max(6, Math.min(12, Math.floor(width / MIN_COLUMNS)));
    var nextColumns = Math.floor(width / cell);
    var nextRows = Math.max(24, Math.min(46, Math.round(nextColumns * 0.55)));
    canvas.style.width = nextColumns * cell + "px";
    canvas.style.height = nextRows * cell + "px";
    canvas.width = Math.round(nextColumns * cell * ratio);
    canvas.height = Math.round(nextRows * cell * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (nextColumns !== columns || nextRows !== rows) {
      // Keep what is on the board, from the top left.
      var previous = cells;
      var previousColumns = columns;
      columns = nextColumns;
      rows = nextRows;
      cells = new Uint8Array(columns * rows);
      trail = new Uint8Array(columns * rows);
      if (previous) {
        for (var y = 0; y < Math.min(rows, previous.length / previousColumns); y++) {
          for (var x = 0; x < Math.min(columns, previousColumns); x++) cells[y * columns + x] = previous[y * previousColumns + x];
        }
      }
    }
    draw();
  }

  function draw() {
    context.fillStyle = "#0c0c0e";
    context.fillRect(0, 0, columns * cell, rows * cell);
    var size = cell > 7 ? cell - 1 : cell;
    for (var index = 0; index < cells.length; index++) {
      var x = (index % columns) * cell;
      var y = Math.floor(index / columns) * cell;
      if (cells[index]) {
        context.fillStyle = "#a3e635";
        context.fillRect(x, y, size, size);
      } else if (trail[index]) {
        context.fillStyle = "rgba(163, 230, 53, " + (0.32 * (TRAIL - trail[index] + 1)) / TRAIL + ")";
        context.fillRect(x, y, size, size);
      }
    }
  }

  function step() {
    var next = new Uint8Array(columns * rows);
    for (var y = 0; y < rows; y++) {
      var up = ((y - 1 + rows) % rows) * columns;
      var here = y * columns;
      var down = ((y + 1) % rows) * columns;
      for (var x = 0; x < columns; x++) {
        var left = (x - 1 + columns) % columns;
        var right = (x + 1) % columns;
        var neighbours =
          cells[up + left] + cells[up + x] + cells[up + right] +
          cells[here + left] + cells[here + right] +
          cells[down + left] + cells[down + x] + cells[down + right];
        var alive = cells[here + x];
        var lives = neighbours === 3 || (alive && neighbours === 2) ? 1 : 0;
        next[here + x] = lives;
        if (lives) trail[here + x] = 0;
        else if (alive) trail[here + x] = 1;
        else if (trail[here + x]) trail[here + x] = trail[here + x] >= TRAIL ? 0 : trail[here + x] + 1;
      }
    }
    cells = next;
    generation += 1;
    draw();
    report();
  }

  function population() {
    var count = 0;
    for (var index = 0; index < cells.length; index++) count += cells[index];
    return count;
  }

  function report() {
    var count = population();
    if (statusText) statusText.textContent = "Generation " + generation + " · " + count + (count === 1 ? " cell" : " cells");
  }

  function clear() {
    cells = new Uint8Array(columns * rows);
    trail = new Uint8Array(columns * rows);
    generation = 0;
  }

  function placeGun() {
    clear();
    var top = Math.max(1, Math.floor((rows - GUN.length) / 4));
    var left = Math.max(1, Math.floor((columns - GUN[0].length) / 2) - 8);
    GUN.forEach(function (line, y) {
      for (var x = 0; x < line.length; x++) {
        if (line.charAt(x) === "O" && left + x < columns) cells[(top + y) * columns + left + x] = 1;
      }
    });
    draw();
    report();
  }

  function randomise() {
    clear();
    for (var index = 0; index < cells.length; index++) cells[index] = Math.random() < 0.28 ? 1 : 0;
    draw();
    report();
  }

  // ---------------------------------------------------------------- playing
  function schedule() {
    window.clearTimeout(timer);
    if (playing && onScreen) timer = window.setTimeout(loop, GENERATION_MS);
  }

  function loop() {
    window.requestAnimationFrame(function () {
      if (!playing || !onScreen) return;
      step();
      schedule();
    });
  }

  function setPlaying(on) {
    playing = on;
    playButton.textContent = on ? "Pause" : "Play";
    playButton.setAttribute("aria-pressed", String(on));
    schedule();
  }

  // ---------------------------------------------------------------- drawing on the board
  var painting = null; // 1 while drawing cells, 0 while erasing

  function cellAt(event) {
    var box = canvas.getBoundingClientRect();
    var x = Math.floor((event.clientX - box.left) / cell);
    var y = Math.floor((event.clientY - box.top) / cell);
    if (x < 0 || y < 0 || x >= columns || y >= rows) return -1;
    return y * columns + x;
  }

  canvas.addEventListener("pointerdown", function (event) {
    var index = cellAt(event);
    if (index < 0) return;
    event.preventDefault();
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch (error) {
      // Without capture, drawing just stops at the board's edge.
    }
    painting = cells[index] ? 0 : 1;
    cells[index] = painting;
    draw();
    report();
  });
  canvas.addEventListener("pointermove", function (event) {
    if (painting === null) return;
    var index = cellAt(event);
    if (index < 0 || cells[index] === painting) return;
    cells[index] = painting;
    draw();
    report();
  });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (type) {
    canvas.addEventListener(type, function () {
      painting = null;
    });
  });

  playButton.addEventListener("click", function () {
    setPlaying(!playing);
  });
  root.querySelector("[data-life-step]").addEventListener("click", function () {
    setPlaying(false);
    step();
  });
  root.querySelector("[data-life-random]").addEventListener("click", randomise);
  root.querySelector("[data-life-gun]").addEventListener("click", placeGun);
  root.querySelector("[data-life-clear]").addEventListener("click", function () {
    setPlaying(false);
    clear();
    draw();
    report();
  });

  // Plays only while the board is on screen; with reduced motion it waits for Play.
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      function (entries) {
        onScreen = entries[0].isIntersecting;
        schedule();
      },
      { threshold: 0.2 }
    ).observe(canvas);
  } else {
    onScreen = true;
  }
  if ("ResizeObserver" in window) new ResizeObserver(layout).observe(stage);
  else window.addEventListener("resize", layout);

  layout();
  placeGun();
  setPlaying(!reducedMotion);
})();
