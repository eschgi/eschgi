// The terminal at the bottom of the page, and the easter eggs it can summon:
// snake (also: triple-click the avatar), crt, matrix, gravity, blackhole, launch and hack.
// Its commands read the page itself, so the terminal never says something the page doesn't.
// The commands and the file names are the same in every language; what they print is not.
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
  function escapeHtml(text) {
    return String(text).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  // The words, in the visitor's language (js/i18n.js), or in English as written here.
  function t(text, params) {
    if (eschgi.t) return eschgi.t(text, params);
    return text.replace(/\{(\w+)\}/g, function (match, name) {
      return params && params[name] !== undefined ? String(params[name]) : match;
    });
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
      overlay.setAttribute("aria-label", t("Hidden Snake game"));

      var panel = el("div", "egg__panel");
      var bar = el(
        "div",
        "window-bar",
        '<span class="window-dots" aria-hidden="true"><span></span><span></span><span></span></span>' +
          '<span class="window-title">snake@eschgi: ~ — nibbles.exe</span>'
      );
      var closeButton = el("button", "egg__close", "&#10005;");
      closeButton.type = "button";
      closeButton.setAttribute("aria-label", t("Close game"));
      bar.appendChild(closeButton);

      var hudBar = el("div", "egg__hud");
      var scoreElement = el("span", "", escapeHtml(t("score")) + " <b>0</b>");
      var highElement = el("span", "", escapeHtml(t("hi")) + " <b>" + readHigh() + "</b>");
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
        '<button type="button" class="egg__pad-btn egg__pad--up" data-dir="up" aria-label="' + escapeHtml(t("Up")) + '">&#9650;</button>' +
          '<button type="button" class="egg__pad-btn egg__pad--left" data-dir="left" aria-label="' + escapeHtml(t("Left")) + '">&#9664;</button>' +
          '<button type="button" class="egg__pad-btn egg__pad--mid" data-action="pause" aria-label="' + escapeHtml(t("Pause or resume")) + '">&#9208;</button>' +
          '<button type="button" class="egg__pad-btn egg__pad--right" data-dir="right" aria-label="' + escapeHtml(t("Right")) + '">&#9654;</button>' +
          '<button type="button" class="egg__pad-btn egg__pad--down" data-dir="down" aria-label="' + escapeHtml(t("Down")) + '">&#9660;</button>'
      );
      var hint = el(
        "p",
        "egg__hint",
        escapeHtml(
          coarse
            ? t("swipe or use the pad · tap the board to pause · ✕ quits")
            : t("arrows / wasd · p pause · r restart · esc quit")
        )
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
        scoreElement.innerHTML = escapeHtml(t("score")) + " <b>" + score + "</b>";
        highElement.innerHTML = escapeHtml(t("hi")) + " <b>" + readHigh() + "</b>";
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
            '<span class="egg__final">' +
            escapeHtml(t("score {score}", { score: score })) +
            (record ? ' · <em class="egg__record">' + escapeHtml(t("new high!")) + "</em>" : "") +
            "</span>" +
            '<span class="egg__again dim">' +
            escapeHtml(coarse ? t("tap to retry · ✕ to quit") : t("press r to retry · esc to quit")) +
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
        if (paused) showMessage('<span class="egg__paused">' + escapeHtml(t("paused")) + "</span>");
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
          showMessage('<span class="egg__paused">' + escapeHtml(t("paused")) + "</span>");
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

    var reset = el("button", "btn btn--ghost gravity-reset", "&#8635; " + escapeHtml(t("Rebuild the page")));
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
      banner.textContent = t("LIFTOFF");
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
      banner.textContent = t("in orbit ✨");
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
            print(t("couldn't read the front page; it's all on eschgi.com"), "cli__err");
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
      if (!card) return print(t("{name}: nothing to show", { name: hook }), "cli__err");
      line(key(from(card, "h3")) + ' <span class="dim">' + escapeHtml(from(card, ".case__tag")) + "</span>");
      print(from(card, ".case__text > p:not(.case__tag):not(.case__stack)"));
      var facts = Array.prototype.map.call(card.querySelectorAll(".case__facts > div"), function (fact) {
        return from(fact, "dd") + " " + from(fact, "dt");
      });
      if (facts.length) print("  > " + facts.join("  ·  "));
      var stack = from(card, ".case__stack");
      if (stack) print(stack, "dim");
      var source = card.querySelector("[data-cli-source]");
      if (source) link(source.getAttribute("data-cli-source") === "product" ? t("product") : t("source"), source.href);
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
        return print(t("stack: no such group: {group} (try: languages, frameworks, data, ops, ai)", { group: arg }), "cli__err");
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
        link(anchor.getAttribute("data-label") || t("link"), anchor.href);
      });
      print(from(doc, "#contact-title"), "dim");
    }

    function stats() {
      if (!eschgi.loadStats) return print(t("stats: no numbers here; they live on github.com/eschgi"), "cli__err");
      eschgi
        .loadStats()
        .then(function (data) {
          var c = data.contributions || {};
          var format = eschgi.formatNumber || String;
          print(
            t("{contributions} contributions  ·  {commits} commits  ·  {pullRequests} pull requests  ·  {issues} issues  (last 12 months)", {
              contributions: format(c.lastYearTotal || 0),
              commits: format(c.commits || 0),
              pullRequests: format(c.pullRequests || 0),
              issues: format(c.issues || 0),
            })
          );
          var languages = (data.languages || []).slice(0, 5).map(function (language) {
            return language.name + " " + format(language.percent) + "%";
          });
          if (languages.length) line(key(t("top languages")) + " " + escapeHtml(languages.join("  ·  ")));
          if (document.getElementById("activity")) goTo("activity");
          else line('<span class="dim">' + t('The weekly chart is on the <a href="./#activity">front page</a>.') + "</span>");
        })
        .catch(function () {
          print(t("stats: no numbers yet; they live on github.com/eschgi"), "cli__err");
        });
    }

    function bugbash() {
      if (document.querySelector("[data-bugbash]")) {
        print(t("Spawning bugs in production.ts… 🐛 good luck."));
        document.dispatchEvent(new CustomEvent("eschgi:bugbash"));
      } else {
        print(t("Bug Bash lives in the Lab. On my way…"));
        window.location.href = "lab.html#bugbash";
      }
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
          return print(t("// it's crawling with bugs 🐛 — try `bugbash`"));
        case "":
          return print(t("cat: missing file operand (try: cat about.txt)"), "cli__err");
        default:
          return print(t("cat: {file}: No such file or directory", { file: arg }), "cli__err");
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
      if (hacking) return print(t("hack: operation already in progress…"), "cli__err");
      var target = args[0] || "mainframe";
      var words = escapeHtml(t("ACCESS GRANTED"));
      var granted = '<span class="glitch cli__granted" data-text="' + words + '">' + words + "</span>";
      var payoff = t("…just kidding. It's a static site — nothing to steal but good vibes 😄");
      var hint = t("(try `help`, or `snake`)");
      if (reduced()) {
        print(t("> establishing uplink to {target}…", { target: target }), "cli__hack");
        print(t("> bypassing firewall… done"), "cli__hack");
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
        var text = t("> scanning ports  [{bar}] {percent}%", {
          bar: new Array(filled + 1).join("█") + new Array(21 - filled).join("░"),
          percent: percent,
        });
        if (!bar) bar = print(text, "cli__hack cli__hack--bar");
        else bar.textContent = text;
      }
      var steps = [
        [0, function () { print(t("> initializing exploit framework…"), "cli__hack"); }],
        [260, function () { print(t("> establishing uplink to {target}…", { target: target }), "cli__hack"); }],
      ];
      [0, 18, 47, 73, 91, 100].forEach(function (percent, index) {
        steps.push([index === 0 ? 320 : 170, function () { drawBar(percent); }]);
      });
      steps.push([260, function () { print(t("> firewall breached. dumping memory:"), "cli__hack"); }]);
      steps.push([180, function () { print("  " + hex(), "cli__hack"); }]);
      steps.push([140, function () { print("  " + hex(), "cli__hack"); }]);
      steps.push([300, function () { print(t("> cracking root credentials… ✓"), "cli__hack"); }]);
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

    // `calm` and `start` are functions that return what to say, in the current language.
    function motionEgg(name, run, calm, start) {
      return function () {
        if (reduced()) return print(name + ": " + calm(), "cli__err");
        print(start());
        run();
      };
    }

    // A command and what it does, the descriptions lined up in one column.
    function entry(names, words) {
      var gap = Math.max(1, 11 - names.replace(/<[^>]+>/g, "").length);
      line("  " + names + new Array(gap + 1).join(" ") + escapeHtml(words));
    }

    var LANGUAGE_NAMES = { en: "English", de: "Deutsch", it: "Italiano" };

    function language(args) {
      var wanted = (args[0] || "").toLowerCase();
      if (!wanted) {
        return line(escapeHtml(t("language:")) + " " + key(LANGUAGE_NAMES[eschgi.lang] || LANGUAGE_NAMES.en) + ' <span class="dim">(en · de · it)</span>');
      }
      if (!LANGUAGE_NAMES[wanted] || !eschgi.setLanguage) {
        return print(t("lang: no such language: {language} (try: en, de, it)", { language: args[0] }), "cli__err");
      }
      eschgi.setLanguage(wanted);
      line(escapeHtml(t("language:")) + " " + key(LANGUAGE_NAMES[wanted]));
    }

    var history = [];
    var historyIndex = 0;

    var COMMANDS = {
      help: function () {
        print(t("available commands:"));
        entry(key("about"), t("who I am"));
        entry(key("work"), t("foodProcess, what I build at work"));
        entry(key("building"), t("the self-hosted trading software, in my free time"));
        entry(key("share"), t("the app I built with AI, for myself"));
        entry(key("projects"), t("all three"));
        entry(key("stack"), t("languages & technologies (e.g. stack data)"));
        entry(key("ai"), t("how I work with AI"));
        entry(key("stats"), t("GitHub numbers"));
        entry(key("contact"), t("where to find me"));
        entry(key("bugbash"), t("play Bug Bash"));
        entry(key("lang"), t("the site in English, German or Italian (e.g. lang de)"));
        entry(key("ls") + " · " + key("cat"), t('browse the "files"'));
        line("  " + key("echo") + " · " + key("date") + " · " + key("history") + " · " + key("clear"));
        line('  <span class="dim">' + escapeHtml(t("… and a few that are not listed. Tab completes, ↑/↓ walk the history.")) + "</span>");
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
        var now = new Date();
        print(eschgi.lang && eschgi.lang !== "en" ? now.toLocaleString(eschgi.locale, { dateStyle: "full", timeStyle: "long" }) : now.toString());
      },
      history: function () {
        if (!history.length) return print(t("no history yet"));
        history.forEach(function (entry, index) {
          print(String(index + 1).padStart(4) + "  " + entry);
        });
      },
      clear: function () {
        log.innerHTML = "";
      },
      lang: language,
      uptime: function () {
        print(t("up almost two decades, 1 user, load average: coffee, code, review"));
      },
      coffee: function () {
        print(t("☕ brewing… done. Focus +10, bugs −1."));
      },
      ping: function () {
        print("pong 🏓");
      },
      hello: function () {
        print(t("Hi there! 👋 Type 'help' to look around."));
      },
      hi: function () {
        print(t("Hi there! 👋 Type 'help' to look around."));
      },
      vim: function () {
        print(t("Opening vim… just kidding — you might never get out. 🙂"));
      },
      emacs: function () {
        print(t("M-x butterfly 🦋 — careful, in Bug Bash that's a feature."));
      },
      exit: function () {
        print(t("There is no exit. There is only Bug Bash."));
      },
      rm: function (args) {
        if (args.join(" ").indexOf("-rf") >= 0) return print(t("rm: refusing to remove '/': this site is read-only (and backed up)"), "cli__err");
        print(t("rm: missing operand"), "cli__err");
      },
      git: function (args) {
        var sub = args.join(" ");
        if (sub.indexOf("push") === 0 && sub.indexOf("--force") >= 0) {
          return print(t("A hook stopped you: force pushes need a human's approval. 🛑"), "cli__err");
        }
        if (sub === "blame") return print(t("It was me. It's always me."));
        if (sub === "status") return print(t("On branch main. Nothing to commit, working tree clean ✨"));
        if (sub.indexOf("log") === 0) return print("a1b2c3d fix: the bug that fixed the other bug");
        print(t("git: try 'git status', 'git blame', 'git log' or 'git push --force'"), "cli__err");
      },
      sudo: function (args) {
        if (args.join(" ") === "make me a sandwich") return print(t("Okay. 🥪"));
        print(t("Permission denied: nice try 😏"), "cli__err");
      },
      snake: function () {
        print(t("launching nibbles.exe…"));
        document.dispatchEvent(new CustomEvent("eschgi:snake"));
      },
      crt: function (args) {
        var arg = (args[0] || "").toLowerCase();
        var on = crt.toggle(arg === "on" ? "on" : arg === "off" ? "off" : null);
        line(escapeHtml(t("crt mode:")) + " " + key(on ? "on" : "off"));
      },
      matrix: function (args) {
        if (reduced()) return print(t("matrix: the rain is off in reduced-motion mode — there is no spoon."), "cli__err");
        var arg = (args[0] || "").toLowerCase();
        var on = matrix.toggle(arg === "on" ? "on" : arg === "off" ? "off" : null);
        print(on ? t("Wake up, Neo… 🐇 follow the white rabbit.") : t("unplugged."));
        line(escapeHtml(t("matrix mode:")) + " " + key(on ? "on" : "off"));
      },
      gravity: motionEgg(
        "gravity",
        gravity,
        function () {
          return t("physics is off in reduced-motion mode — everything stays where it belongs.");
        },
        function () {
          return t("Detaching the DOM… mind your head. (Esc or the button rebuilds it)");
        }
      ),
      blackhole: motionEgg(
        "blackhole",
        blackhole,
        function () {
          return t("spacetime stays flat in reduced-motion mode.");
        },
        function () {
          return t("Crossing the event horizon… 🕳️ (Esc to escape)");
        }
      ),
      launch: motionEgg(
        "launch",
        launchRocket,
        function () {
          return t("🚀 liftoff! (the animation is off in reduced-motion mode) — in orbit ✨");
        },
        function () {
          return t("Ignition sequence start… 🚀 (Esc aborts)");
        }
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
    // For anyone who asks in German or Italian.
    COMMANDS.hilfe = COMMANDS.help;
    COMMANDS.aiuto = COMMANDS.help;
    COMMANDS.language = COMMANDS.lang;
    COMMANDS.sprache = COMMANDS.lang;
    COMMANDS.lingua = COMMANDS.lang;
    var NAMES = Object.keys(COMMANDS);

    function run(raw) {
      var parts = raw.split(/\s+/);
      var name = parts.shift().toLowerCase();
      if (!name) return;
      if (Object.prototype.hasOwnProperty.call(COMMANDS, name)) COMMANDS[name](parts);
      else print(t("command not found: {name} — type 'help'", { name: name }), "cli__err");
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
