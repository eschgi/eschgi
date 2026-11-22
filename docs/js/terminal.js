// The terminal at the bottom of the page, and the easter eggs it can summon:
// snake (also: triple-click the avatar), crt, matrix, gravity, blackhole, launch and hack.
// Its commands read the page itself, so the terminal never says something the page doesn't.
(function () {
  "use strict";

  var eschgi = window.eschgi || {};
  function reduced() {
    return !!eschgi.reducedMotion;
  }
  function el(tag, className, html) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (html != null) node.innerHTML = html;
    return node;
  }
  function clean(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }

  // ===================================================================== snake
  // Triple-click the avatar (or type `snake`). The high score key is the old site's.
  (function snakeEgg() {
    var avatar = document.querySelector(".hero__avatar");
    var CELLS = 20;
    var CELL = 20;
    var SIZE = CELLS * CELL;
    var TOKENS = ["{}", ";", "git", "C#", "</>", "()", "[]", "=>", "fn", "0x"];
    var HIGH_KEY = "eschgi.snake.hi";
    var BASE_MS = 130;
    var MIN_MS = 70;
    var coarse = !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
    var open = false;

    if (avatar) {
      var clicks = 0;
      var lastClick = 0;
      avatar.addEventListener("click", function () {
        var now = Date.now();
        clicks = now - lastClick < 700 ? clicks + 1 : 1;
        lastClick = now;
        if (clicks >= 3 && !open) {
          clicks = 0;
          launch();
        }
      });
    }
    document.addEventListener("eschgi:snake", function () {
      if (!open) launch();
    });

    function readHigh() {
      try {
        return parseInt(window.localStorage.getItem(HIGH_KEY), 10) || 0;
      } catch (error) {
        return 0;
      }
    }
    function writeHigh(value) {
      try {
        window.localStorage.setItem(HIGH_KEY, String(value));
      } catch (error) {
        /* private mode */
      }
    }

    function launch() {
      open = true;
      var overlay = el("div", "egg");
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.setAttribute("aria-label", "Hidden Snake game");

      var panel = el("div", "egg__panel");
      var bar = el(
        "div",
        "window-bar",
        '<span class="window-dots" aria-hidden="true"><span></span><span></span><span></span></span>' +
          '<span class="window-title">snake@eschgi: ~ — nibbles.exe</span>'
      );
      var closeButton = el("button", "egg__close", "&#10005;");
      closeButton.type = "button";
      closeButton.setAttribute("aria-label", "Close game");
      bar.appendChild(closeButton);

      var hudBar = el("div", "egg__hud");
      var scoreElement = el("span", "", "score <b>0</b>");
      var highElement = el("span", "", "hi <b>" + readHigh() + "</b>");
      hudBar.appendChild(scoreElement);
      hudBar.appendChild(highElement);

      var stage = el("div", "egg__stage");
      var canvas = el("canvas", "egg__canvas");
      canvas.width = SIZE;
      canvas.height = SIZE;
      var message = el("div", "egg__msg");
      message.hidden = true;
      stage.appendChild(canvas);
      stage.appendChild(message);

      var controls = el(
        "div",
        "egg__controls",
        '<button type="button" class="egg__pad-btn egg__pad--up" data-dir="up" aria-label="Up">&#9650;</button>' +
          '<button type="button" class="egg__pad-btn egg__pad--left" data-dir="left" aria-label="Left">&#9664;</button>' +
          '<button type="button" class="egg__pad-btn egg__pad--mid" data-action="pause" aria-label="Pause or resume">&#9208;</button>' +
          '<button type="button" class="egg__pad-btn egg__pad--right" data-dir="right" aria-label="Right">&#9654;</button>' +
          '<button type="button" class="egg__pad-btn egg__pad--down" data-dir="down" aria-label="Down">&#9660;</button>'
      );
      var hint = el(
        "p",
        "egg__hint",
        coarse
          ? "swipe or use the pad · tap the board to pause · ✕ quits"
          : "arrows / wasd · p pause · r restart · esc quit"
      );

      var body = el("div", "egg__body");
      body.appendChild(hudBar);
      body.appendChild(stage);
      body.appendChild(controls);
      body.appendChild(hint);
      panel.appendChild(bar);
      panel.appendChild(body);
      overlay.appendChild(panel);
      document.body.appendChild(overlay);

      var previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      var previousFocus = document.activeElement;
      var ctx = canvas.getContext("2d");

      var snake, direction, queued, food, score, speed, paused, over, frameId, last;

      function reset() {
        var middle = Math.floor(CELLS / 2);
        snake = [
          { x: middle, y: middle },
          { x: middle - 1, y: middle },
          { x: middle - 2, y: middle },
        ];
        direction = { x: 1, y: 0 };
        queued = null;
        score = 0;
        speed = BASE_MS;
        paused = false;
        over = false;
        last = 0;
        placeFood();
        updateHud();
        hideMessage();
      }

      function placeFood() {
        var free;
        do {
          food = {
            x: (Math.random() * CELLS) | 0,
            y: (Math.random() * CELLS) | 0,
            token: TOKENS[(Math.random() * TOKENS.length) | 0],
          };
          free = !snake.some(function (part) {
            return part.x === food.x && part.y === food.y;
          });
        } while (!free);
      }

      function updateHud() {
        scoreElement.innerHTML = "score <b>" + score + "</b>";
        highElement.innerHTML = "hi <b>" + readHigh() + "</b>";
      }

      function setDirection(x, y) {
        if ((direction.x === -x && direction.y === -y) || (direction.x === x && direction.y === y)) return;
        queued = { x: x, y: y };
      }

      function step() {
        if (queued) {
          direction = queued;
          queued = null;
        }
        var head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
        if (head.x < 0 || head.y < 0 || head.x >= CELLS || head.y >= CELLS) return gameOver();
        for (var i = 0; i < snake.length - 1; i++) {
          if (snake[i].x === head.x && snake[i].y === head.y) return gameOver();
        }
        snake.unshift(head);
        if (head.x === food.x && head.y === food.y) {
          score++;
          speed = Math.max(MIN_MS, BASE_MS - score * 3);
          placeFood();
          updateHud();
        } else {
          snake.pop();
        }
      }

      function roundedCell(x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
      }

      function draw() {
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, SIZE, SIZE);
        ctx.strokeStyle = "rgba(163, 230, 53, 0.06)";
        ctx.lineWidth = 1;
        for (var g = 1; g < CELLS; g++) {
          ctx.beginPath();
          ctx.moveTo(g * CELL + 0.5, 0);
          ctx.lineTo(g * CELL + 0.5, SIZE);
          ctx.moveTo(0, g * CELL + 0.5);
          ctx.lineTo(SIZE, g * CELL + 0.5);
          ctx.stroke();
        }
        ctx.fillStyle = "#c4b5fd";
        ctx.font = "bold 13px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(food.token, food.x * CELL + CELL / 2, food.y * CELL + CELL / 2 + 1);
        for (var i = snake.length - 1; i >= 0; i--) {
          var part = snake[i];
          if (i === 0) ctx.fillStyle = "#d9f99d";
          else ctx.fillStyle = "rgba(163, 230, 53, " + (0.35 + 0.5 * Math.max(0, 1 - i / (snake.length + 4))) + ")";
          roundedCell(part.x * CELL + 1, part.y * CELL + 1, CELL - 2, CELL - 2, 4);
          ctx.fill();
        }
      }

      function tick(now) {
        if (!open) return;
        frameId = window.requestAnimationFrame(tick);
        if (paused || over) {
          draw();
          return;
        }
        if (now - last >= speed) {
          last = now;
          step();
          if (!over) draw();
        }
      }

      function gameOver() {
        over = true;
        var record = false;
        if (score > readHigh()) {
          writeHigh(score);
          record = true;
        }
        updateHud();
        showMessage(
          '<span class="egg__over glitch" data-text="GAME OVER">GAME OVER</span>' +
            '<span class="egg__final">score ' +
            score +
            (record ? ' · <em class="egg__record">new high!</em>' : "") +
            "</span>" +
            '<span class="egg__again dim">' +
            (coarse ? "tap to retry · ✕ to quit" : "press r to retry · esc to quit") +
            "</span>"
        );
      }

      function showMessage(html) {
        message.innerHTML = html;
        message.hidden = false;
      }
      function hideMessage() {
        message.hidden = true;
        message.innerHTML = "";
      }

      function togglePause() {
        if (over) return;
        paused = !paused;
        if (paused) showMessage('<span class="egg__paused">paused</span>');
        else {
          hideMessage();
          last = 0;
        }
      }

      function onKey(event) {
        var key = event.key.toLowerCase();
        if (key === "escape") {
          event.preventDefault();
          return exit();
        }
        if (over) {
          if (key === "r") {
            event.preventDefault();
            reset();
          }
          return;
        }
        if (key === "arrowup" || key === "w") setDirection(0, -1);
        else if (key === "arrowdown" || key === "s") setDirection(0, 1);
        else if (key === "arrowleft" || key === "a") setDirection(-1, 0);
        else if (key === "arrowright" || key === "d") setDirection(1, 0);
        else if (key === "p" || key === " ") togglePause();
        else if (key === "r") reset();
        else return;
        event.preventDefault();
      }

      var touchX = 0;
      var touchY = 0;
      function onTouchStart(event) {
        touchX = event.changedTouches[0].clientX;
        touchY = event.changedTouches[0].clientY;
      }
      function onTouchEnd(event) {
        var dx = event.changedTouches[0].clientX - touchX;
        var dy = event.changedTouches[0].clientY - touchY;
        if (over) return reset();
        if (Math.abs(dx) < 16 && Math.abs(dy) < 16) return togglePause();
        if (Math.abs(dx) > Math.abs(dy)) setDirection(dx > 0 ? 1 : -1, 0);
        else setDirection(0, dy > 0 ? 1 : -1);
      }
      function onTouchMove(event) {
        event.preventDefault();
      }
      function onPad(event) {
        var button = event.target.closest("[data-dir],[data-action]");
        if (!button) return;
        event.preventDefault();
        if (button.getAttribute("data-action") === "pause") return over ? reset() : togglePause();
        if (over) return reset();
        var where = button.getAttribute("data-dir");
        if (where === "up") setDirection(0, -1);
        else if (where === "down") setDirection(0, 1);
        else if (where === "left") setDirection(-1, 0);
        else if (where === "right") setDirection(1, 0);
      }
      function onVisibility() {
        if (document.hidden && !over) {
          paused = true;
          showMessage('<span class="egg__paused">paused</span>');
        }
      }
      function onBackdrop(event) {
        if (event.target === overlay) exit();
      }

      function exit() {
        open = false;
        window.cancelAnimationFrame(frameId);
        document.body.style.overflow = previousOverflow;
        window.removeEventListener("keydown", onKey, true);
        document.removeEventListener("visibilitychange", onVisibility);
        overlay.remove();
        if (previousFocus && previousFocus.focus) previousFocus.focus();
      }

      window.addEventListener("keydown", onKey, true);
      document.addEventListener("visibilitychange", onVisibility);
      stage.addEventListener("touchstart", onTouchStart, { passive: true });
      stage.addEventListener("touchend", onTouchEnd, { passive: true });
      stage.addEventListener("touchmove", onTouchMove, { passive: false });
      controls.addEventListener("pointerdown", onPad);
      closeButton.addEventListener("click", exit);
      overlay.addEventListener("mousedown", onBackdrop);

      reset();
      closeButton.focus();
      frameId = window.requestAnimationFrame(tick);
    }
  })();

  // ======================================================================= crt
  // `crt` toggles an old-monitor look; it survives a reload, as it always did.
  var crt = (function () {
    var KEY = "eschgi.crt";
    var overlay = null;
    var bootTimer = 0;

    function set(on, animate) {
      document.body.classList.toggle("crt", on);
      if (on && !overlay) {
        overlay = el("div", "crt-overlay");
        overlay.setAttribute("aria-hidden", "true");
        document.body.appendChild(overlay);
      } else if (!on && overlay) {
        overlay.remove();
        overlay = null;
      }
      try {
        window.localStorage.setItem(KEY, on ? "1" : "0");
      } catch (error) {
        /* ignore */
      }
      if (on && animate && !reduced()) {
        document.body.classList.add("crt--boot");
        window.clearTimeout(bootTimer);
        bootTimer = window.setTimeout(function () {
          document.body.classList.remove("crt--boot");
        }, 650);
      }
      return on;
    }

    try {
      if (window.localStorage.getItem(KEY) === "1") set(true, false);
    } catch (error) {
      /* ignore */
    }

    return {
      toggle: function (force) {
        var on = force === "on" ? true : force === "off" ? false : !document.body.classList.contains("crt");
        return set(on, true);
      },
    };
  })();

  // ==================================================================== matrix
  var matrix = (function () {
    var canvas = null;
    var ctx = null;
    var on = false;
    var running = false;
    var drops = [];
    var FONT_SIZE = 16;
    var GLYPHS = "アイウエオカキクケコサシスセソ0123456789<>[]{}=+*#$%&/\\".split("");

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      var columns = Math.floor(canvas.width / FONT_SIZE);
      drops = [];
      for (var c = 0; c < columns; c++) drops[c] = Math.floor((Math.random() * canvas.height) / FONT_SIZE);
    }

    var last = 0;
    function draw(now) {
      if (!running) return;
      if (now - last >= 40) {
        last = now;
        ctx.fillStyle = "rgba(12, 12, 14, 0.12)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = FONT_SIZE + "px monospace";
        for (var i = 0; i < drops.length; i++) {
          ctx.fillStyle = Math.random() > 0.92 ? "#ecfccb" : "#65a30d";
          ctx.fillText(GLYPHS[(Math.random() * GLYPHS.length) | 0], i * FONT_SIZE, drops[i] * FONT_SIZE);
          if (drops[i] * FONT_SIZE > canvas.height && Math.random() > 0.95) drops[i] = 0;
          drops[i]++;
        }
      }
      window.requestAnimationFrame(draw);
    }

    function start() {
      if (running) return;
      running = true;
      last = 0;
      window.requestAnimationFrame(draw);
    }

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) running = false;
      else if (on) start();
    });

    return {
      toggle: function (force) {
        on = force === "on" ? true : force === "off" ? false : !on;
        if (on) {
          if (!canvas) {
            canvas = el("canvas", "matrix");
            canvas.setAttribute("aria-hidden", "true");
            document.body.insertBefore(canvas, document.body.firstChild);
            ctx = canvas.getContext("2d");
            resize();
            window.addEventListener("resize", resize, { passive: true });
          }
          start();
          window.requestAnimationFrame(function () {
            canvas.classList.add("is-on");
          });
        } else if (canvas) {
          canvas.classList.remove("is-on");
          window.setTimeout(function () {
            if (!on) running = false;
          }, 900);
        }
        return on;
      },
    };
  })();

  // ============================================================ gravity / black hole
  // Both clone what is on screen into loose bodies. Each match becomes one body;
  // a match inside another match goes with its container.
  var CHUNKS = [
    ".site-name",
    ".site-nav a",
    ".menu-button",
    ".label",
    ".lab-intro h1",
    ".lab-intro__lead",
    ".lab-toc a",
    ".section-top h2",
    ".section-note",
    ".game",
    ".sphere-legend li",
    ".sphere__tag",
    ".code-well",
    ".site-footer__bar > span",
  ];

  // A clone leaves its ancestors behind, and with them every style that depended on
  // them (a chip is only a chip inside `.chips`), so it takes its computed look along.
  var LOOK = [
    "backgroundColor",
    "backgroundImage",
    "color",
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
    "borderTopStyle",
    "borderRightStyle",
    "borderBottomStyle",
    "borderLeftStyle",
    "borderTopColor",
    "borderRightColor",
    "borderBottomColor",
    "borderLeftColor",
    "borderTopLeftRadius",
    "borderTopRightRadius",
    "borderBottomLeftRadius",
    "borderBottomRightRadius",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "fontFamily",
    "fontSize",
    "fontWeight",
    "lineHeight",
    "letterSpacing",
    "textTransform",
    "textAlign",
    "whiteSpace",
    "boxShadow",
  ];

  function copyLook(original, clone) {
    var computed = window.getComputedStyle(original);
    LOOK.forEach(function (property) {
      clone.style[property] = computed[property];
    });
    var display = computed.display;
    clone.style.display = display === "inline" ? "inline-block" : display === "list-item" ? "block" : display;
  }

  function collectBodies(bodyClass) {
    var matches = [];
    CHUNKS.forEach(function (selector) {
      Array.prototype.forEach.call(document.querySelectorAll(selector), function (node) {
        if (matches.indexOf(node) === -1) matches.push(node);
      });
    });
    var viewportWidth = window.innerWidth;
    var viewportHeight = window.innerHeight;
    var leaves = matches.filter(function (node, index) {
      var rect = node.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return false;
      if (rect.bottom < 0 || rect.top > viewportHeight || rect.right < 0 || rect.left > viewportWidth) return false;
      for (var j = 0; j < matches.length; j++) {
        if (j !== index && matches[j].contains(node)) return false;
      }
      return true;
    });
    return leaves.map(function (original) {
      var rect = original.getBoundingClientRect();
      var clone = original.cloneNode(true);
      copyLook(original, clone);
      clone.removeAttribute("id");
      Array.prototype.forEach.call(clone.querySelectorAll("[id]"), function (node) {
        node.removeAttribute("id");
      });
      clone.classList.add(bodyClass);
      clone.style.width = rect.width + "px";
      clone.style.height = rect.height + "px";
      clone.style.transition = "none";
      clone.style.animation = "none";
      clone.style.opacity = "1";
      clone.style.transform = "translate(" + rect.left + "px," + rect.top + "px)";
      return { node: clone, x: rect.left, y: rect.top, w: rect.width, h: rect.height };
    });
  }

  function hidePage(className) {
    document.body.classList.add(className);
    ["body > header", "body > main", "body > footer"].forEach(function (selector) {
      var node = document.querySelector(selector);
      if (node) node.setAttribute("aria-hidden", "true");
    });
  }

  function showPage(className) {
    document.body.classList.remove(className);
    ["body > header", "body > main", "body > footer"].forEach(function (selector) {
      var node = document.querySelector(selector);
      if (node) node.removeAttribute("aria-hidden");
    });
  }

  var gravityOpen = false;
  function gravity() {
    if (gravityOpen) return;
    gravityOpen = true;
    var GRAVITY = 0.45;
    var RESTITUTION = 0.55;
    var FRICTION = 0.82;
    var AIR = 0.999;
    var SLEEP = 0.35;

    var stage = el("div", "gravity-stage");
    stage.setAttribute("aria-hidden", "true");
    var bodies = collectBodies("gravity-body").map(function (body) {
      stage.appendChild(body.node);
      body.vx = (Math.random() - 0.5) * 2;
      body.vy = 0;
      body.angle = 0;
      body.spin = (Math.random() - 0.5) * 0.04;
      body.sleeping = false;
      return body;
    });
    document.body.appendChild(stage);
    hidePage("gravity-on");

    var reset = el("button", "btn btn--ghost gravity-reset", "&#8635; Rebuild the page");
    reset.type = "button";
    reset.addEventListener("click", function () {
      window.location.reload();
    });
    document.body.appendChild(reset);
    reset.focus();
    window.addEventListener(
      "keydown",
      function (event) {
        if (event.key === "Escape") window.location.reload();
      },
      true
    );

    var floor = window.innerHeight;
    var wall = window.innerWidth;
    window.addEventListener(
      "resize",
      function () {
        floor = window.innerHeight;
        wall = window.innerWidth;
      },
      { passive: true }
    );

    function step(body) {
      if (body.sleeping) return;
      body.vy += GRAVITY;
      body.vx *= AIR;
      body.x += body.vx;
      body.y += body.vy;
      body.angle += body.spin;
      if (body.y + body.h >= floor) {
        body.y = floor - body.h;
        body.vy = -body.vy * RESTITUTION;
        body.vx *= FRICTION;
        body.spin *= FRICTION;
        if (Math.abs(body.vy) < SLEEP && Math.abs(body.vx) < SLEEP) {
          body.vx = 0;
          body.vy = 0;
          body.spin *= 0.5;
          if (Math.abs(body.spin) < 0.005) {
            body.spin = 0;
            body.sleeping = true;
          }
        }
      }
      if (body.x <= 0) {
        body.x = 0;
        body.vx = -body.vx * RESTITUTION;
      } else if (body.x + body.w >= wall) {
        body.x = wall - body.w;
        body.vx = -body.vx * RESTITUTION;
      }
      body.node.style.transform = "translate(" + body.x + "px," + body.y + "px) rotate(" + body.angle + "rad)";
    }

    (function frame() {
      bodies.forEach(step);
      window.requestAnimationFrame(frame);
    })();
  }

  var blackholeOpen = false;
  function blackhole() {
    if (blackholeOpen || reduced()) return;
    blackholeOpen = true;

    var stage = el("div", "blackhole-stage");
    stage.setAttribute("aria-hidden", "true");
    var centerX = window.innerWidth / 2;
    var centerY = window.innerHeight / 2;
    var core = el("div", "blackhole-core");
    core.style.left = centerX + "px";
    core.style.top = centerY + "px";

    var bodies = collectBodies("blackhole-body").map(function (body) {
      stage.appendChild(body.node);
      body.vx = (Math.random() - 0.5) * 1.5;
      body.vy = (Math.random() - 0.5) * 1.5;
      body.angle = 0;
      body.spin = (Math.random() - 0.5) * 0.05;
      body.age = 0;
      body.gone = false;
      return body;
    });
    stage.appendChild(core);
    document.body.appendChild(stage);
    hidePage("blackhole-on");

    var timers = [];
    var frameId = 0;
    var detonated = false;
    function later(ms, fn) {
      timers.push(window.setTimeout(fn, ms));
    }

    function teardown() {
      timers.forEach(window.clearTimeout);
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("resize", onResize);
      stage.remove();
      showPage("blackhole-on");
      blackholeOpen = false;
      var input = document.getElementById("cli-input");
      if (input) input.focus({ preventScroll: true });
    }
    function onKey(event) {
      if (event.key === "Escape") teardown();
    }
    function onResize() {
      centerX = window.innerWidth / 2;
      centerY = window.innerHeight / 2;
      core.style.left = centerX + "px";
      core.style.top = centerY + "px";
    }
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", onResize, { passive: true });

    var ACCEL_MIN = 0.45;
    var PULL = 9000;
    var SWIRL = 0.35;
    var DRAG = 0.93;
    var EAT = 40;
    var MAX_AGE = 300;

    function supernova() {
      if (detonated) return;
      detonated = true;
      core.className = "blackhole-core blackhole-supernova";
      later(900, teardown);
    }

    function step(body) {
      if (body.gone) return;
      body.age++;
      var dx = centerX - (body.x + body.w / 2);
      var dy = centerY - (body.y + body.h / 2);
      var distance = Math.sqrt(dx * dx + dy * dy) || 1;
      if (distance < EAT || body.age > MAX_AGE) {
        body.gone = true;
        body.node.style.display = "none";
        core.classList.add("blackhole-core--fed");
        later(140, function () {
          core.classList.remove("blackhole-core--fed");
        });
        return;
      }
      var nx = dx / distance;
      var ny = dy / distance;
      var accel = ACCEL_MIN + PULL / (distance * distance);
      body.vx = (body.vx + nx * accel - ny * accel * SWIRL) * DRAG;
      body.vy = (body.vy + ny * accel + nx * accel * SWIRL) * DRAG;
      body.x += body.vx;
      body.y += body.vy;
      body.angle += body.spin + accel * 0.05;
      var scale = Math.max(0.05, Math.min(1, distance / 320));
      body.node.style.transform =
        "translate(" + body.x + "px," + body.y + "px) rotate(" + body.angle + "rad) scale(" + scale + ")";
    }

    (function frame() {
      var alive = 0;
      bodies.forEach(function (body) {
        step(body);
        if (!body.gone) alive++;
      });
      if (!alive) {
        supernova();
        return;
      }
      frameId = window.requestAnimationFrame(frame);
    })();
    later(8000, supernova);
  }

  // ==================================================================== rocket
  var rocketOpen = false;
  function launchRocket() {
    if (rocketOpen || reduced()) return;
    rocketOpen = true;
    var ROCKET = "    /\\\n   /  \\\n  |    |\n  | [] |\n  |    |\n /|    |\\\n/ |    | \\\n  '----'";
    var stage = el("div", "rocket-stage");
    stage.setAttribute("aria-hidden", "true");
    var rocket = el("pre", "rocket");
    rocket.textContent = ROCKET;
    rocket.appendChild(el("span", "rocket-flame", "▲▼▲"));
    var banner = el("div", "rocket-banner");
    stage.appendChild(rocket);
    stage.appendChild(banner);
    document.body.appendChild(stage);

    var timers = [];
    var trail = 0;
    function later(ms, fn) {
      timers.push(window.setTimeout(fn, ms));
    }
    function teardown() {
      timers.forEach(window.clearTimeout);
      window.clearInterval(trail);
      window.removeEventListener("keydown", onKey, true);
      stage.remove();
      rocketOpen = false;
      var input = document.getElementById("cli-input");
      if (input) input.focus({ preventScroll: true });
    }
    function onKey(event) {
      if (event.key === "Escape") teardown();
    }
    window.addEventListener("keydown", onKey, true);

    banner.textContent = "3";
    later(450, function () {
      banner.textContent = "2";
    });
    later(900, function () {
      banner.textContent = "1";
    });
    later(1350, function () {
      banner.textContent = "LIFTOFF";
      rocket.classList.add("rocket--shake");
    });
    later(1850, function () {
      banner.textContent = "";
      rocket.classList.remove("rocket--shake");
      rocket.classList.add("rocket--rise");
      trail = window.setInterval(function () {
        var rect = rocket.getBoundingClientRect();
        if (rect.bottom < 0) return;
        var puff = el("span", "rocket-smoke");
        puff.style.left = rect.left + rect.width / 2 + (Math.random() - 0.5) * 24 + "px";
        puff.style.top = rect.bottom - 12 + "px";
        stage.appendChild(puff);
        window.setTimeout(function () {
          puff.remove();
        }, 900);
      }, 90);
    });
    later(4400, function () {
      window.clearInterval(trail);
      rocket.style.display = "none";
      banner.className = "rocket-banner rocket-banner--orbit";
      banner.textContent = "in orbit ✨";
    });
    later(5400, teardown);
  }

  // ================================================================== terminal
  (function terminal() {
    var form = document.getElementById("cli-form");
    var input = document.getElementById("cli-input");
    var log = document.getElementById("cli-log");
    var root = document.getElementById("cli");
    if (!form || !input || !log) return;

    function line(html, className) {
      var div = el("div", "cli__line" + (className ? " " + className : ""), html);
      log.appendChild(div);
      log.scrollTop = log.scrollHeight;
      return div;
    }
    function escapeHtml(text) {
      return String(text).replace(/[&<>]/g, function (c) {
        return c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;";
      });
    }
    function print(text, className) {
      return line(escapeHtml(text), className);
    }
    function key(text) {
      return '<span class="cli__key">' + escapeHtml(text) + "</span>";
    }
    function goTo(id) {
      if (eschgi.scrollToSection) eschgi.scrollToSection(id);
    }

    // The content lives on the front page; on the Lab page it is fetched once.
    function withHome(command) {
      return function (args) {
        var load = eschgi.homeDocument ? eschgi.homeDocument() : Promise.resolve(document);
        load
          .then(function (doc) {
            command(doc, args || []);
          })
          .catch(function () {
            print("couldn't read the front page; it's all on eschgi.com", "cli__err");
          });
      };
    }
    function from(doc, selector) {
      var node = doc.querySelector(selector);
      return node ? clean(node.textContent) : "";
    }
    function link(label, href) {
      line(
        key(label.padEnd(9)) +
          ' <a href="' +
          escapeHtml(href) +
          '" target="_blank" rel="noopener noreferrer">' +
          escapeHtml(href.replace(/^https?:\/\/(www\.)?/, "")) +
          "</a>"
      );
    }

    function about(doc) {
      print(from(doc, '[data-cli="headline"]'));
      print(from(doc, '[data-cli="intro"]'));
      Array.prototype.forEach.call(doc.querySelectorAll(".facts > div"), function (fact) {
        print("  > " + from(fact, "dd") + " " + from(fact, "dt"));
      });
    }

    function project(doc, hook) {
      var card = doc.querySelector('[data-cli="' + hook + '"]');
      if (!card) return print(hook + ": nothing to show", "cli__err");
      line(key(from(card, "h3")) + ' <span class="dim">' + escapeHtml(from(card, ".case__tag")) + "</span>");
      print(from(card, ".case__text > p:not(.case__tag):not(.case__stack)"));
      var facts = Array.prototype.map.call(card.querySelectorAll(".case__facts > div"), function (fact) {
        return from(fact, "dd") + " " + from(fact, "dt");
      });
      if (facts.length) print("  > " + facts.join("  ·  "));
      var stack = from(card, ".case__stack");
      if (stack) print(stack, "dim");
      var source = card.querySelector("[data-cli-source]");
      if (source) link(source.getAttribute("data-cli-source") || "source", source.href);
    }

    function work(doc) {
      project(doc, "foodprocess");
    }

    function building(doc) {
      project(doc, "trading");
    }

    function share(doc) {
      project(doc, "share");
    }

    function projects(doc) {
      // A space, not "", so the separating line keeps its height.
      work(doc);
      line(" ");
      building(doc);
      line(" ");
      share(doc);
    }

    var GROUP_ALIASES = {
      languages: "languages",
      language: "languages",
      langs: "languages",
      frameworks: "frameworks",
      framework: "frameworks",
      apis: "frameworks",
      data: "data",
      databases: "data",
      db: "data",
      ops: "ops",
      devops: "ops",
      tools: "ops",
      ai: "ai",
    };

    function stack(doc, args) {
      var arg = args[0];
      var want = arg ? GROUP_ALIASES[arg.toLowerCase().replace(/\/$/, "")] : null;
      if (arg && !want) {
        return print("stack: no such group: " + arg + " (try: languages, frameworks, data, ops, ai)", "cli__err");
      }
      Array.prototype.forEach.call(doc.querySelectorAll("[data-stack-group]"), function (group) {
        if (want && group.getAttribute("data-stack-group") !== want) return;
        var items = Array.prototype.map.call(group.querySelectorAll("li"), function (item) {
          return clean(item.textContent);
        });
        line(key(from(group, "h3").toLowerCase() + "/") + " " + escapeHtml(items.join("  ·  ")));
      });
    }

    function ai(doc) {
      print(from(doc, '[data-cli="ai"]'));
      Array.prototype.forEach.call(doc.querySelectorAll(".principles h3"), function (heading) {
        print("  > " + clean(heading.textContent));
      });
    }

    function contact(doc) {
      Array.prototype.forEach.call(doc.querySelectorAll("[data-contact-links] a"), function (anchor) {
        link(anchor.getAttribute("data-label") || "link", anchor.href);
      });
      print(from(doc, "#contact-title"), "dim");
    }

    function stats() {
      if (!eschgi.loadStats) return print("stats: no numbers here; they live on github.com/eschgi", "cli__err");
      eschgi
        .loadStats()
        .then(function (data) {
          var c = data.contributions || {};
          var format = eschgi.formatNumber || String;
          print(
            format(c.lastYearTotal || 0) +
              " contributions  ·  " +
              format(c.commits || 0) +
              " commits  ·  " +
              format(c.pullRequests || 0) +
              " pull requests  ·  " +
              format(c.issues || 0) +
              " issues  (last 12 months)"
          );
          var languages = (data.languages || []).slice(0, 5).map(function (language) {
            return language.name + " " + language.percent + "%";
          });
          if (languages.length) line(key("top languages") + " " + escapeHtml(languages.join("  ·  ")));
          if (document.getElementById("activity")) goTo("activity");
          else line('<span class="dim">The weekly chart is on the <a href="./#activity">front page</a>.</span>');
        })
        .catch(function () {
          print("stats: no numbers yet; they live on github.com/eschgi", "cli__err");
        });
    }

    function bugbash() {
      if (document.querySelector("[data-bugbash]")) {
        print("Spawning bugs in production.ts… 🐛 good luck.");
        document.dispatchEvent(new CustomEvent("eschgi:bugbash"));
      } else {
        print("Bug Bash lives in the Lab. On my way…");
        window.location.href = "lab.html#bugbash";
      }
    }

    // `ask`: answers a question from the front page's own text by retrieval, with no language
    // model behind it: every sentence of the page is a document, weighed by TF-IDF, and the one
    // most like the question (by cosine similarity) is the answer. The R in RAG, on its own.
    var STOPWORDS = (
      "a about am an and any are as at be been but by can could did do does for from had has have he how i if in " +
      "into is it its me my of on or our she so some that the their them then there these they this to us was " +
      "we were what when where which who whom why will with would you your"
    ).split(" ");
    // A few words visitors use for what the page calls something else.
    var SYNONYMS = {
      job: ["engineer", "work"],
      looking: ["looking", "role"],
      employer: ["work"],
      company: ["work"],
      hobby: ["free"],
      spare: ["free"],
      programming: ["language"],
      skill: ["expertise", "language"],
      tool: ["devops", "tool"],
      experience: ["year", "decade"],
      email: ["contact"],
      hire: ["role"],
      hiring: ["role"],
      llm: ["ai"],
    };

    function terms(text) {
      var words = [];
      (text.toLowerCase().match(/[a-z0-9#+]+/g) || []).forEach(function (word) {
        if (STOPWORDS.indexOf(word) >= 0) return;
        if (word.length > 3 && /s$/.test(word) && !/ss$/.test(word)) word = word.slice(0, -1);
        words.push.apply(words, SYNONYMS[word] || [word]);
      });
      return words;
    }

    function wordCount(text) {
      return clean(text).split(" ").length;
    }

    function withoutStop(text) {
      return clean(text).replace(/[.:]$/, "");
    }

    // The page as documents: each sentence of its text, where it came from, the title of what it
    // belongs to (a card, a list, a principle) and the section around it. A match is scored on the
    // sentence's own words, a little on its section, with a bonus when the question names the
    // title; a card's description gets a small head start over its other lines.
    var SECTIONS = { top: "the introduction", work: "Work", how: "How I work", expertise: "Expertise", activity: "Activity", contact: "Contact" };
    var library = null;
    function libraryOf(doc) {
      if (library) return library;
      var documents = [];
      function add(text, where, title, about, boost) {
        // Split after . ! ? or : before a capital, without lookbehind, which older Safari lacks.
        clean(text)
          .replace(/([.!?:])\s+(?=[A-Z])/g, "$1\u0000")
          .split("\u0000")
          .forEach(function (sentence) {
            if (terms(sentence).length) documents.push({ text: sentence, where: where, title: title || "", about: about || "", boost: boost || 0 });
          });
      }
      Array.prototype.forEach.call(doc.querySelectorAll("main section"), function (section) {
        var heading = section.querySelector("h1, h2");
        var label = section.querySelector(".label");
        var where = SECTIONS[section.id] || (heading ? withoutStop(heading.textContent) : "the front page");
        var about = where + " " + (heading ? heading.textContent : "") + " " + (label ? label.textContent : "");
        Array.prototype.forEach.call(section.querySelectorAll("[data-cli]"), function (card) {
          var title = card.querySelector("h3");
          var name = title ? clean(title.textContent) : where;
          Array.prototype.forEach.call(card.querySelectorAll(".case__text > p, .case__stack"), function (node) {
            var description = !node.classList.contains("case__tag") && !node.classList.contains("case__stack");
            add(node.textContent, name, name, about, description ? 0.05 : 0);
          });
          var facts = Array.prototype.map.call(card.querySelectorAll(".case__facts > div"), function (fact) {
            return clean(fact.querySelector("dd").textContent) + " " + clean(fact.querySelector("dt").textContent);
          });
          if (facts.length) add(facts.join(", ") + ".", name, name, about);
        });
        Array.prototype.forEach.call(section.querySelectorAll(".hero__lead, .section-note"), function (node) {
          if (!node.closest("[data-cli]")) add(node.textContent, where, "", about);
        });
        // Headings and labels only when they make a statement, not when they name a section.
        Array.prototype.forEach.call(section.querySelectorAll("h1, h2, .label"), function (node) {
          if (wordCount(node.textContent) >= 10) add(node.textContent, where, "", about);
        });
        Array.prototype.forEach.call(section.querySelectorAll(".principles li"), function (item) {
          var name = clean(item.querySelector("h3").textContent);
          // Kept whole: split at its colon, the title alone would answer.
          documents.push({ text: name + ": " + clean(item.querySelector("p").textContent), where: where, title: name, about: about, boost: 0 });
        });
        Array.prototype.forEach.call(section.querySelectorAll(".expertise__group"), function (group) {
          var name = clean(group.querySelector("h3").textContent);
          var items = Array.prototype.map.call(group.querySelectorAll("li"), function (item) {
            return clean(item.textContent);
          });
          documents.push({ text: name + ": " + items.join(", ") + ".", where: "Expertise", title: name, about: "expertise use know", boost: 0 });
        });
        var links = Array.prototype.map.call(section.querySelectorAll("[data-contact-links] a"), function (anchor) {
          return clean(anchor.getAttribute("data-label") || anchor.textContent);
        });
        if (links.length) documents.push({ text: "Find me on " + links.join(", ") + ".", where: where, title: "contact", about: "contact reach message talk", boost: 0 });
      });
      Array.prototype.forEach.call(doc.querySelectorAll(".facts > div"), function (fact) {
        documents.push({ text: clean(fact.querySelector("dd").textContent) + " " + clean(fact.querySelector("dt").textContent) + ".", where: "the facts", title: "", about: "", boost: 0 });
      });
      var counts = {};
      documents.forEach(function (entry) {
        unique(terms(entry.text + " " + entry.title + " " + entry.about)).forEach(function (term) {
          counts[term] = (counts[term] || 0) + 1;
        });
      });
      library = { documents: documents, idf: {} };
      Object.keys(counts).forEach(function (term) {
        library.idf[term] = Math.log((documents.length + 1) / (counts[term] + 1)) + 1;
      });
      documents.forEach(function (entry) {
        entry.textVector = vectorOf(terms(entry.text), library.idf);
        entry.aboutVector = vectorOf(terms(entry.about), library.idf);
        entry.titleTerms = terms(entry.title);
      });
      return library;
    }

    function unique(items) {
      return items.filter(function (item, index) {
        return items.indexOf(item) === index;
      });
    }

    function vectorOf(words, idf) {
      var vector = {};
      words.forEach(function (word) {
        if (idf[word]) vector[word] = (vector[word] || 0) + idf[word];
      });
      return vector;
    }

    function cosine(a, b) {
      var dot = 0;
      var normA = 0;
      var normB = 0;
      Object.keys(a).forEach(function (key) {
        normA += a[key] * a[key];
        if (b[key]) dot += a[key] * b[key];
      });
      Object.keys(b).forEach(function (key) {
        normB += b[key] * b[key];
      });
      return normA && normB ? dot / Math.sqrt(normA * normB) : 0;
    }

    function ask(doc, args) {
      var question = args.join(" ").trim();
      if (!question) return print("usage: ask <question>, e.g. ask what do you build at work?", "cli__err");
      var shelf = libraryOf(doc);
      var query = vectorOf(terms(question), shelf.idf);
      var best = null;
      shelf.documents.forEach(function (entry) {
        var named = entry.titleTerms.some(function (term) {
          return query[term];
        });
        var score = 0.85 * cosine(query, entry.textVector) + 0.15 * cosine(query, entry.aboutVector) + (named ? 0.25 : 0) + entry.boost;
        if (!best || score > best.score) best = { entry: entry, score: score };
      });
      if (!best || best.score < 0.18) {
        print("No answer on this site for that. Try: ask which languages do you use?", "dim");
        return;
      }
      print(best.entry.text);
      line('<span class="dim">— from ' + escapeHtml(best.entry.where) + ", match " + best.score.toFixed(2) + " (TF-IDF retrieval, no language model)</span>");
    }

    var aboutCommand = withHome(about);
    var workCommand = withHome(work);
    var buildingCommand = withHome(building);
    var shareCommand = withHome(share);
    var projectsCommand = withHome(projects);
    var stackCommand = withHome(stack);
    var aiCommand = withHome(ai);
    var contactCommand = withHome(contact);

    function ls() {
      line(
        [key("about.txt"), key("work.md"), key("building.md"), key("share.md"), key("stack/"), key("ai.md"), key("contact.txt"), key("production.ts")].join("  ")
      );
    }

    function cat(arg) {
      switch ((arg || "").toLowerCase()) {
        case "about.txt":
          return aboutCommand([]);
        case "work.md":
          return workCommand([]);
        case "building.md":
          return buildingCommand([]);
        case "stack":
        case "stack/":
          return stackCommand([]);
        case "ai.md":
          return aiCommand([]);
        case "share.md":
          return shareCommand([]);
        case "contact.txt":
          return contactCommand([]);
        case "production.ts":
          return print("// it's crawling with bugs 🐛 — try `bugbash`");
        case "":
          return print("cat: missing file operand (try: cat about.txt)", "cli__err");
        default:
          return print("cat: " + arg + ": No such file or directory", "cli__err");
      }
    }

    // `hack`: a cinematic fake intrusion. Not in the help, but tab completes.
    var hacking = false;
    function hex() {
      var bytes = [];
      for (var i = 0; i < 8; i++) bytes.push(("0" + Math.floor(Math.random() * 256).toString(16)).slice(-2).toUpperCase());
      return bytes.join(" ");
    }
    function hack(args) {
      if (hacking) return print("hack: operation already in progress…", "cli__err");
      var target = args[0] || "mainframe";
      var granted = '<span class="glitch cli__granted" data-text="ACCESS GRANTED">ACCESS GRANTED</span>';
      var payoff = "…just kidding. It's a static site — nothing to steal but good vibes 😄";
      var hint = "(try `help`, or `snake`)";
      if (reduced()) {
        print("> establishing uplink to " + target + "…", "cli__hack");
        print("> bypassing firewall… done", "cli__hack");
        line(granted);
        print(payoff);
        print(hint, "cli__hack");
        return;
      }
      hacking = true;
      input.disabled = true;
      var bar = null;
      function drawBar(percent) {
        var filled = Math.round((percent / 100) * 20);
        var text = "> scanning ports  [" + new Array(filled + 1).join("█") + new Array(21 - filled).join("░") + "] " + percent + "%";
        if (!bar) bar = print(text, "cli__hack cli__hack--bar");
        else bar.textContent = text;
      }
      var steps = [
        [0, function () { print("> initializing exploit framework…", "cli__hack"); }],
        [260, function () { print("> establishing uplink to " + target + "…", "cli__hack"); }],
      ];
      [0, 18, 47, 73, 91, 100].forEach(function (percent, index) {
        steps.push([index === 0 ? 320 : 170, function () { drawBar(percent); }]);
      });
      steps.push([260, function () { print("> firewall breached. dumping memory:", "cli__hack"); }]);
      steps.push([180, function () { print("  " + hex(), "cli__hack"); }]);
      steps.push([140, function () { print("  " + hex(), "cli__hack"); }]);
      steps.push([300, function () { print("> cracking root credentials… ✓", "cli__hack"); }]);
      steps.push([360, function () { line(granted); }]);
      steps.push([420, function () { print(payoff); }]);
      steps.push([180, function () { print(hint, "cli__hack"); }]);
      var index = 0;
      (function next() {
        if (index >= steps.length) {
          hacking = false;
          input.disabled = false;
          input.focus({ preventScroll: true });
          return;
        }
        var step = steps[index++];
        window.setTimeout(function () {
          step[1]();
          next();
        }, step[0]);
      })();
    }

    function motionEgg(name, run, calm, start) {
      return function () {
        if (reduced()) return print(name + ": " + calm, "cli__err");
        print(start);
        run();
      };
    }

    var history = [];
    var historyIndex = 0;

    var COMMANDS = {
      help: function () {
        print("available commands:");
        line("  " + key("about") + "      who I am");
        line("  " + key("work") + "       foodProcess, what I build at work");
        line("  " + key("building") + "   the self-hosted trading software, in my free time");
        line("  " + key("share") + "      the app I built with AI, for myself");
        line("  " + key("projects") + "   all three");
        line("  " + key("stack") + "      languages & technologies (e.g. stack data)");
        line("  " + key("ai") + "         how I work with AI");
        line("  " + key("ask") + "        ask the site a question, e.g. ask what do you build at work?");
        line("  " + key("stats") + "      GitHub numbers");
        line("  " + key("contact") + "    where to find me");
        line("  " + key("bugbash") + "    play Bug Bash");
        line("  " + key("ls") + " · " + key("cat") + "   browse the \"files\"");
        line("  " + key("echo") + " · " + key("date") + " · " + key("history") + " · " + key("clear"));
        print(" ");
        print("easter eggs (don't tell anyone):");
        line("  " + key("hack") + "       a cinematic fake intrusion");
        line("  " + key("matrix") + "     digital rain (" + key("matrix off") + " to stop)");
        line("  " + key("crt") + "        an old monitor (" + key("crt off") + " to stop)");
        line("  " + key("snake") + "      a game of snake, or triple-click the portrait on the front page");
        line("  " + key("gravity") + "    let the page fall apart");
        line("  " + key("blackhole") + "  swallow the page");
        line("  " + key("launch") + "     lift-off");
        line("  " + key("sudo") + " · " + key("rm -rf /") + " · " + key("git push --force") + " · " + key("vim") + " · " + key("emacs") + " · " + key("exit") + " · " + key("coffee") + " · " + key("ping") + " · " + key("uptime"));
        line('  <span class="dim">Tab completes, ↑/↓ walk the history.</span>');
      },
      about: aboutCommand,
      whoami: aboutCommand,
      work: workCommand,
      job: workCommand,
      foodprocess: workCommand,
      building: buildingCommand,
      projects: projectsCommand,
      project: projectsCommand,
      stack: stackCommand,
      skills: stackCommand,
      ai: aiCommand,
      share: shareCommand,
      ask: withHome(ask),
      stats: stats,
      contact: contactCommand,
      socials: contactCommand,
      bugbash: bugbash,
      bugs: bugbash,
      play: bugbash,
      game: bugbash,
      ls: ls,
      cat: function (args) {
        cat(args[0]);
      },
      echo: function (args) {
        print(args.join(" "));
      },
      date: function () {
        print(new Date().toString());
      },
      history: function () {
        if (!history.length) return print("no history yet");
        history.forEach(function (entry, index) {
          print(String(index + 1).padStart(4) + "  " + entry);
        });
      },
      clear: function () {
        log.innerHTML = "";
      },
      uptime: function () {
        print("up almost two decades, 1 user, load average: coffee, code, review");
      },
      coffee: function () {
        print("☕ brewing… done. Focus +10, bugs −1.");
      },
      ping: function () {
        print("pong 🏓");
      },
      hello: function () {
        print("Hi there! 👋 Type 'help' to look around.");
      },
      hi: function () {
        print("Hi there! 👋 Type 'help' to look around.");
      },
      vim: function () {
        print("Opening vim… just kidding — you might never get out. 🙂");
      },
      emacs: function () {
        print("M-x butterfly 🦋 — careful, in Bug Bash that's a feature.");
      },
      exit: function () {
        print("There is no exit. There is only Bug Bash.");
      },
      rm: function (args) {
        if (args.join(" ").indexOf("-rf") >= 0) return print("rm: refusing to remove '/': this site is read-only (and backed up)", "cli__err");
        print("rm: missing operand", "cli__err");
      },
      git: function (args) {
        var sub = args.join(" ");
        if (sub.indexOf("push") === 0 && sub.indexOf("--force") >= 0) {
          return print("A hook stopped you: force pushes need a human's approval. 🛑", "cli__err");
        }
        if (sub === "blame") return print("It was me. It's always me.");
        if (sub === "status") return print("On branch main. Nothing to commit, working tree clean ✨");
        if (sub.indexOf("log") === 0) return print("a1b2c3d fix: the bug that fixed the other bug");
        print("git: try 'git status', 'git blame', 'git log' or 'git push --force'", "cli__err");
      },
      sudo: function (args) {
        if (args.join(" ") === "make me a sandwich") return print("Okay. 🥪");
        print("Permission denied: nice try 😏", "cli__err");
      },
      snake: function () {
        print("launching nibbles.exe…");
        document.dispatchEvent(new CustomEvent("eschgi:snake"));
      },
      crt: function (args) {
        var arg = (args[0] || "").toLowerCase();
        var on = crt.toggle(arg === "on" ? "on" : arg === "off" ? "off" : null);
        line("crt mode: " + key(on ? "on" : "off"));
      },
      matrix: function (args) {
        if (reduced()) return print("matrix: the rain is off in reduced-motion mode — there is no spoon.", "cli__err");
        var arg = (args[0] || "").toLowerCase();
        var on = matrix.toggle(arg === "on" ? "on" : arg === "off" ? "off" : null);
        print(on ? "Wake up, Neo… 🐇 follow the white rabbit." : "unplugged.");
        line("matrix mode: " + key(on ? "on" : "off"));
      },
      gravity: motionEgg(
        "gravity",
        gravity,
        "physics is off in reduced-motion mode — everything stays where it belongs.",
        "Detaching the DOM… mind your head. (Esc or the button rebuilds it)"
      ),
      blackhole: motionEgg(
        "blackhole",
        blackhole,
        "spacetime stays flat in reduced-motion mode.",
        "Crossing the event horizon… 🕳️ (Esc to escape)"
      ),
      launch: motionEgg(
        "launch",
        launchRocket,
        "🚀 liftoff! (the animation is off in reduced-motion mode) — in orbit ✨",
        "Ignition sequence start… 🚀 (Esc aborts)"
      ),
      hack: hack,
    };
    COMMANDS.destroy = COMMANDS.gravity;
    COMMANDS.supernova = COMMANDS.blackhole;
    COMMANDS.collapse = COMMANDS.blackhole;
    COMMANDS.liftoff = COMMANDS.launch;
    COMMANDS.rocket = COMMANDS.launch;
    COMMANDS.vi = COMMANDS.vim;
    COMMANDS.nano = COMMANDS.vim;
    COMMANDS.quit = COMMANDS.exit;
    var NAMES = Object.keys(COMMANDS);

    function run(raw) {
      var parts = raw.split(/\s+/);
      var name = parts.shift().toLowerCase();
      if (!name) return;
      if (Object.prototype.hasOwnProperty.call(COMMANDS, name)) COMMANDS[name](parts);
      else print("command not found: " + name + " — type 'help'", "cli__err");
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var raw = input.value.replace(/\s+$/, "");
      input.value = "";
      line(
        '<span class="text-accent">stefan@eschgi</span>:<span class="text-info">~</span>$ ' + escapeHtml(raw),
        "cli__echo"
      );
      var trimmed = raw.trim();
      if (trimmed) {
        if (history[history.length - 1] !== trimmed) history.push(trimmed);
        run(trimmed);
      }
      historyIndex = history.length;
    });

    function caretToEnd() {
      var value = input.value;
      window.setTimeout(function () {
        input.value = value;
        try {
          input.setSelectionRange(value.length, value.length);
        } catch (error) {
          /* some inputs do not support selection */
        }
      }, 0);
    }

    input.addEventListener("keydown", function (event) {
      if (event.key === "ArrowUp") {
        if (!history.length) return;
        event.preventDefault();
        historyIndex = Math.max(0, historyIndex - 1);
        input.value = history[historyIndex] || "";
        caretToEnd();
      } else if (event.key === "ArrowDown") {
        if (!history.length) return;
        event.preventDefault();
        historyIndex = Math.min(history.length, historyIndex + 1);
        input.value = history[historyIndex] || "";
        caretToEnd();
      } else if (event.key === "Tab") {
        var fragment = input.value.trim().toLowerCase();
        if (!fragment || /\s/.test(fragment)) return;
        event.preventDefault();
        var hits = NAMES.filter(function (name) {
          return name.indexOf(fragment) === 0;
        });
        if (hits.length === 1) {
          input.value = hits[0] + " ";
          caretToEnd();
        } else if (hits.length > 1) {
          print(hits.join("  "));
        }
      }
    });

    // Clicking anywhere in the terminal focuses the prompt, unless text is being selected.
    if (root) {
      root.addEventListener("click", function (event) {
        if (event.target.closest("a, button")) return;
        if (window.getSelection && String(window.getSelection())) return;
        input.focus({ preventScroll: true });
      });
    }
  })();
})();
