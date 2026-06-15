// Terminal portfolio — dependency-free enhancements + "wow" effects.
(function () {
  "use strict";

  var prefersReduced =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer =
    window.matchMedia && window.matchMedia("(pointer: fine)").matches;

  // ---------------------------------------------------------------------------
  // Footer year
  // ---------------------------------------------------------------------------
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // ---------------------------------------------------------------------------
  // Typed hero tagline (cycles through phrases)
  // ---------------------------------------------------------------------------
  (function typedTagline() {
    var target = document.getElementById("typed");
    if (!target) return;

    var phrases = [
      "Software Engineer",
      "C# · C++ · Python",
      "ASP.NET Core · gRPC · EF Core",
      "PostgreSQL · Qt · Docker",
      "~2 decades of building things",
    ];

    if (prefersReduced) {
      target.textContent = phrases[0];
      return;
    }

    var TYPE_SPEED = 70,
      ERASE_SPEED = 35,
      HOLD_TIME = 1600;
    var phraseIndex = 0,
      charIndex = 0,
      erasing = false;

    function tick() {
      var current = phrases[phraseIndex];
      if (!erasing) {
        charIndex++;
        target.textContent = current.slice(0, charIndex);
        if (charIndex === current.length) {
          erasing = true;
          return window.setTimeout(tick, HOLD_TIME);
        }
        return window.setTimeout(tick, TYPE_SPEED);
      }
      charIndex--;
      target.textContent = current.slice(0, charIndex);
      if (charIndex === 0) {
        erasing = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
        return window.setTimeout(tick, TYPE_SPEED * 4);
      }
      return window.setTimeout(tick, ERASE_SPEED);
    }
    tick();
  })();

  // ---------------------------------------------------------------------------
  // Boot sequence overlay
  // ---------------------------------------------------------------------------
  (function bootSequence() {
    var boot = document.getElementById("boot");
    var log = document.getElementById("boot-log");
    if (!boot || !log || prefersReduced) return;

    var lines = [
      "eschgi@portfolio:~$ ./init.sh",
      "[<span class='ok'>ok</span>] mounting /skills ............ done",
      "[<span class='ok'>ok</span>] loading engineer.profile .... done",
      "[<span class='ok'>ok</span>] fetching github.stats ....... done",
      "[<span class='ok'>ok</span>] compositing fx ............. done",
      "welcome, Stefan.<span class='boot__cursor'>▋</span>",
    ];

    boot.hidden = false;
    var i = 0;
    function next() {
      if (i < lines.length) {
        log.innerHTML += (i ? "\n" : "") + lines[i];
        i++;
        return window.setTimeout(next, 150);
      }
      window.setTimeout(function () {
        boot.classList.add("boot--done");
        window.setTimeout(function () {
          if (boot.parentNode) boot.parentNode.removeChild(boot);
        }, 600);
      }, 320);
    }
    next();

    // Safety net: never let the overlay get stuck.
    window.setTimeout(function () {
      if (boot.parentNode) boot.parentNode.removeChild(boot);
    }, 5000);
  })();

  // ---------------------------------------------------------------------------
  // Matrix rain backdrop
  // ---------------------------------------------------------------------------
  (function matrixRain() {
    var canvas = document.getElementById("matrix");
    if (!canvas || !canvas.getContext || prefersReduced) return;

    var ctx = canvas.getContext("2d");
    var glyphs = "アイウエオカキクケコサシスセソ0123456789<>[]{}=+*#$%&/\\".split("");
    var fontSize = 16;
    var columns = 0;
    var drops = [];
    var running = true;

    // Tunables, flipped by the hidden `matrix` command's "rabbit hole" mode.
    var deep = false;
    var FRAME_CALM = 55; // ms between frames (~18fps, gentle + cheap)
    var FRAME_DEEP = 33; // ~30fps — denser, faster rain
    var brightChance = 0.975; // leading-glyph brightness threshold (lower = more)
    var resetChance = 0.975; // drop-reset threshold (lower = busier columns)

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      columns = Math.floor(canvas.width / fontSize);
      drops = [];
      for (var c = 0; c < columns; c++) {
        drops[c] = Math.floor((Math.random() * canvas.height) / fontSize);
      }
    }
    resize();
    window.addEventListener("resize", resize, { passive: true });

    var last = 0;
    function draw(now) {
      if (!running) return;
      if (now - last >= (deep ? FRAME_DEEP : FRAME_CALM)) {
        last = now;
        ctx.fillStyle = "rgba(5, 7, 13, 0.10)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = fontSize + "px monospace";
        for (var i = 0; i < drops.length; i++) {
          var text = glyphs[Math.floor(Math.random() * glyphs.length)];
          var x = i * fontSize;
          var y = drops[i] * fontSize;
          // Leading glyph brighter than the trail.
          ctx.fillStyle = Math.random() > brightChance ? "#aef5c8" : "#2fae62";
          ctx.fillText(text, x, y);
          if (y > canvas.height && Math.random() > resetChance) drops[i] = 0;
          drops[i]++;
        }
      }
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);

    // "rabbit hole" toggle — driven by the hidden `matrix` CLI command via a
    // CustomEvent, mirroring the snake/crt decoupling. detail.force: on/off/null.
    document.addEventListener("eschgi:matrix", function (e) {
      var force = e.detail && e.detail.force;
      deep = force === "on" ? true : force === "off" ? false : !deep;
      document.body.classList.toggle("matrix-deep", deep);
      // Denser, brighter, busier when deep; back to gentle defaults otherwise.
      brightChance = deep ? 0.9 : 0.975;
      resetChance = deep ? 0.94 : 0.975;
    });

    // Pause when the tab is hidden to save CPU/battery.
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        running = false;
      } else if (!running) {
        running = true;
        last = 0;
        requestAnimationFrame(draw);
      }
    });
  })();

  // ---------------------------------------------------------------------------
  // Cursor-following spotlight
  // ---------------------------------------------------------------------------
  (function spotlight() {
    if (prefersReduced || !finePointer) return;
    var root = document.documentElement;
    window.addEventListener(
      "pointermove",
      function (e) {
        root.style.setProperty("--mx", e.clientX + "px");
        root.style.setProperty("--my", e.clientY + "px");
      },
      { passive: true }
    );
  })();

  // ---------------------------------------------------------------------------
  // 3D tilt on cards
  // ---------------------------------------------------------------------------
  (function tiltCards() {
    if (prefersReduced || !finePointer) return;
    var MAX = 7; // degrees
    var cards = document.querySelectorAll(".tilt");
    Array.prototype.forEach.call(cards, function (card) {
      card.addEventListener(
        "pointermove",
        function (e) {
          var r = card.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width - 0.5;
          var py = (e.clientY - r.top) / r.height - 0.5;
          card.style.transform =
            "perspective(700px) rotateX(" +
            (-py * MAX).toFixed(2) +
            "deg) rotateY(" +
            (px * MAX).toFixed(2) +
            "deg) translateZ(6px)";
        },
        { passive: true }
      );
      card.addEventListener("pointerleave", function () {
        card.style.transform = "";
      });
    });
  })();

  // ---------------------------------------------------------------------------
  // CRT / retro mode (hidden easter egg — toggle via the `crt` CLI command)
  // Intensifies the always-on .scanlines overlay into a full old-monitor look.
  // ---------------------------------------------------------------------------
  (function crtMode() {
    var KEY = "eschgi.crt";
    var bootTimer = null;

    function read() {
      try { return localStorage.getItem(KEY) === "1"; } catch (e) { return false; }
    }
    function write(on) {
      try { localStorage.setItem(KEY, on ? "1" : "0"); } catch (e) {}
    }

    // Apply persisted state on load (no flash — runs before paint settles).
    if (read()) document.body.classList.add("crt");

    function setCrt(on, animate) {
      document.body.classList.toggle("crt", on);
      write(on);
      // Brief power-on flash when switching on (skipped for reduced motion).
      if (on && animate && !prefersReduced) {
        document.body.classList.add("crt--boot");
        window.clearTimeout(bootTimer);
        bootTimer = window.setTimeout(function () {
          document.body.classList.remove("crt--boot");
        }, 650);
      }
      return on;
    }

    // CLI bridge: `crt` toggles, `crt on` / `crt off` force a state.
    // The handler returns the resulting state so the command can report it.
    document.addEventListener("eschgi:toggle-crt", function (e) {
      var force = e && e.detail ? e.detail.force : null; // "on" | "off" | null
      var on = force === "on" ? true : force === "off" ? false : !document.body.classList.contains("crt");
      setCrt(on, true);
    });
  })();

  // ---------------------------------------------------------------------------
  // GitHub stats (progressive enhancement; hidden until data loads)
  // ---------------------------------------------------------------------------
  (function githubStats() {
    var section = document.getElementById("stats");
    if (!section || !window.fetch) return;

    function animate(el, to) {
      if (prefersReduced || to <= 0) {
        el.textContent = String(to);
        return;
      }
      var start = performance.now(),
        dur = 1100;
      function step(now) {
        var p = Math.min((now - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
        el.textContent = String(Math.round(to * eased));
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    function render(data) {
      if (!data || data.schemaVersion !== 1) return; // unknown shape -> stay hidden
      if (data.placeholder) return; // seed file before first real run -> stay hidden

      var map = {
        repos: (data.repos && data.repos.nonFork) || 0,
        stars: data.stars || 0,
        contribs: (data.contributions && data.contributions.lastYearTotal) || 0,
        followers: data.followers || 0,
      };
      Object.keys(map).forEach(function (k) {
        var el = section.querySelector('[data-stat="' + k + '"]');
        if (el) animate(el, map[k]);
      });

      var bars = document.getElementById("lang-bars");
      (data.languages || []).forEach(function (l, idx) {
        var li = document.createElement("li");
        li.className = "lang-bar";

        var name = document.createElement("span");
        name.className = "lang-bar__name";
        name.textContent = l.name;

        var track = document.createElement("span");
        track.className = "lang-bar__track";
        var fill = document.createElement("span");
        fill.className = "lang-bar__fill";
        if (l.color) fill.style.background = l.color;
        track.appendChild(fill);

        var pct = document.createElement("span");
        pct.className = "lang-bar__pct muted";
        pct.textContent = l.percent + "%";

        li.appendChild(name);
        li.appendChild(track);
        li.appendChild(pct);
        bars.appendChild(li);

        // Grow the bar after a beat so the transition is visible.
        var width = l.percent + "%";
        if (prefersReduced) {
          fill.style.width = width;
        } else {
          window.setTimeout(function () {
            fill.style.width = width;
          }, 120 + idx * 90);
        }
      });

      var meta = document.getElementById("stats-meta");
      if (meta && data.generatedAt) {
        meta.textContent = "# updated " + data.generatedAt.slice(0, 10);
      }
      section.hidden = false; // reveal only on success
    }

    fetch("stats.json", { cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.json();
      })
      .then(render)
      .catch(function () {
        /* leave section hidden; silent fallback */
      });
  })();

  // ---------------------------------------------------------------------------
  // Hidden easter egg: triple-click the avatar to summon a terminal Snake game.
  // No hint anywhere — discovery is the point.
  // ---------------------------------------------------------------------------
  (function snakeEasterEgg() {
    var avatar = document.querySelector(".hero__avatar");
    if (!avatar) return;

    var CELLS = 20; // grid is CELLS x CELLS
    var CELL = 20; // px per cell (canvas internal resolution = 400x400)
    var SIZE = CELLS * CELL;
    var TOKENS = ["{}", ";", "git", "C#", "</>", "()", "[]", "=>", "fn", "0x"];
    var HS_KEY = "eschgi.snake.hi";
    var BASE_MS = 130, // step interval at score 0
      MIN_MS = 70;
    var coarse = !!(
      window.matchMedia && window.matchMedia("(pointer: coarse)").matches
    );

    // --- unlock: 3 clicks within a rolling 700ms window ----------------------
    var clicks = 0,
      lastClick = 0,
      open = false;
    avatar.style.cursor = ""; // leave it as-is; give nothing away
    avatar.addEventListener("click", function () {
      var now = Date.now();
      clicks = now - lastClick < 700 ? clicks + 1 : 1;
      lastClick = now;
      if (clicks >= 3 && !open) {
        clicks = 0;
        launchGame();
      }
    });

    // Also launchable from the interactive CLI (`snake` command).
    document.addEventListener("eschgi:launch-snake", function () {
      if (!open) launchGame();
    });

    // --- helpers -------------------------------------------------------------
    function readHigh() {
      try {
        return parseInt(window.localStorage.getItem(HS_KEY), 10) || 0;
      } catch (e) {
        return 0;
      }
    }
    function writeHigh(v) {
      try {
        window.localStorage.setItem(HS_KEY, String(v));
      } catch (e) {
        /* private mode — ignore */
      }
    }
    function el(tag, cls, html) {
      var n = document.createElement(tag);
      if (cls) n.className = cls;
      if (html != null) n.innerHTML = html;
      return n;
    }

    // --- launch --------------------------------------------------------------
    function launchGame() {
      open = true;

      // Build the overlay DOM (no markup lives in index.html).
      var overlay = el("div", "egg");
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.setAttribute("aria-label", "Hidden Snake game");

      var panel = el("div", "egg__panel");

      var bar = el(
        "header",
        "titlebar",
        '<span class="dots" aria-hidden="true">' +
          '<span class="dot dot--red"></span>' +
          '<span class="dot dot--yellow"></span>' +
          '<span class="dot dot--green"></span>' +
          "</span>" +
          '<span class="titlebar__title">snake@eschgi: ~ — nibbles.exe</span>' +
          '<span class="titlebar__spacer"></span>'
      );
      var closeBtn = el("button", "egg__close", "&#10005;");
      closeBtn.setAttribute("type", "button");
      closeBtn.setAttribute("aria-label", "Close game");
      bar.appendChild(closeBtn);

      var hud = el("div", "egg__hud");
      var scoreEl = el("span", "egg__score", "score <b>0</b>");
      var hiEl = el("span", "egg__hi", "hi <b>" + readHigh() + "</b>");
      hud.appendChild(scoreEl);
      hud.appendChild(hiEl);

      var stage = el("div", "egg__stage");
      var canvas = el("canvas", "egg__canvas");
      canvas.width = SIZE;
      canvas.height = SIZE;
      var msg = el("div", "egg__msg");
      msg.hidden = true;
      stage.appendChild(canvas);
      stage.appendChild(msg);

      // On-screen controls for touch (CSS shows them only on coarse pointers).
      var controls = el("div", "egg__controls");
      controls.innerHTML =
        '<button type="button" class="egg__pad-btn egg__pad--up" data-dir="up" aria-label="Up">&#9650;</button>' +
        '<button type="button" class="egg__pad-btn egg__pad--left" data-dir="left" aria-label="Left">&#9664;</button>' +
        '<button type="button" class="egg__pad-btn egg__pad--mid" data-action="pause" aria-label="Pause or resume">&#9208;</button>' +
        '<button type="button" class="egg__pad-btn egg__pad--right" data-dir="right" aria-label="Right">&#9654;</button>' +
        '<button type="button" class="egg__pad-btn egg__pad--down" data-dir="down" aria-label="Down">&#9660;</button>';

      var hint = el(
        "p",
        "egg__hint muted",
        coarse
          ? "swipe or use the pad&nbsp;·&nbsp;tap board to pause&nbsp;·&nbsp;✕ to quit"
          : "arrows / wasd&nbsp;·&nbsp;p pause&nbsp;·&nbsp;r restart&nbsp;·&nbsp;esc quit"
      );

      var body = el("div", "egg__body");
      body.appendChild(hud);
      body.appendChild(stage);
      body.appendChild(controls);
      body.appendChild(hint);

      panel.appendChild(bar);
      panel.appendChild(body);
      overlay.appendChild(panel);
      document.body.appendChild(overlay);

      // Lock background scroll while the game is open (iOS rubber-banding etc.).
      var prevBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      var ctx = canvas.getContext("2d");
      var prevFocus = document.activeElement;

      // --- game state --------------------------------------------------------
      var snake, dir, queued, food, score, speed, paused, over, rafId, last;

      function reset() {
        var mid = Math.floor(CELLS / 2);
        snake = [
          { x: mid, y: mid },
          { x: mid - 1, y: mid },
          { x: mid - 2, y: mid },
        ];
        dir = { x: 1, y: 0 };
        queued = null;
        score = 0;
        speed = BASE_MS;
        paused = false;
        over = false;
        last = 0;
        placeFood();
        updateHud();
        hideMsg();
      }

      function placeFood() {
        var open2;
        do {
          food = {
            x: (Math.random() * CELLS) | 0,
            y: (Math.random() * CELLS) | 0,
            token: TOKENS[(Math.random() * TOKENS.length) | 0],
          };
          open2 = true;
          for (var i = 0; i < snake.length; i++) {
            if (snake[i].x === food.x && snake[i].y === food.y) {
              open2 = false;
              break;
            }
          }
        } while (!open2);
      }

      function updateHud() {
        scoreEl.innerHTML = "score <b>" + score + "</b>";
        hiEl.innerHTML = "hi <b>" + readHigh() + "</b>";
      }

      function setDir(x, y) {
        // Ignore 180° reversals relative to the *current* committed direction.
        if (dir.x === -x && dir.y === -y) return;
        if (dir.x === x && dir.y === y) return;
        queued = { x: x, y: y };
      }

      function step() {
        if (queued) {
          dir = queued;
          queued = null;
        }
        var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

        // Wall collision.
        if (head.x < 0 || head.y < 0 || head.x >= CELLS || head.y >= CELLS) {
          return gameOver();
        }
        // Self collision (the tail cell is about to move, so it's fair game).
        for (var i = 0; i < snake.length - 1; i++) {
          if (snake[i].x === head.x && snake[i].y === head.y) {
            return gameOver();
          }
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

      // --- rendering ---------------------------------------------------------
      function draw() {
        ctx.fillStyle = "#070b11";
        ctx.fillRect(0, 0, SIZE, SIZE);

        // faint grid
        ctx.strokeStyle = "rgba(56, 224, 123, 0.06)";
        ctx.lineWidth = 1;
        for (var g = 1; g < CELLS; g++) {
          ctx.beginPath();
          ctx.moveTo(g * CELL + 0.5, 0);
          ctx.lineTo(g * CELL + 0.5, SIZE);
          ctx.moveTo(0, g * CELL + 0.5);
          ctx.lineTo(SIZE, g * CELL + 0.5);
          ctx.stroke();
        }

        // food token
        ctx.fillStyle = "#c792ea";
        ctx.font = "bold 13px " + getFont();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          food.token,
          food.x * CELL + CELL / 2,
          food.y * CELL + CELL / 2 + 1
        );

        // snake — head brightest, body fades down the tail
        for (var i = snake.length - 1; i >= 0; i--) {
          var s = snake[i];
          if (i === 0) {
            ctx.fillStyle = "#aef5c8";
          } else {
            var t = 1 - i / (snake.length + 4);
            ctx.fillStyle =
              "rgba(56, 224, 123, " + (0.35 + 0.5 * Math.max(0, t)) + ")";
          }
          roundRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2, 4);
          ctx.fill();
        }
      }

      function roundRect(x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
      }

      var _font;
      function getFont() {
        if (_font) return _font;
        _font =
          (window.getComputedStyle(document.body).fontFamily || "monospace");
        return _font;
      }

      // --- loop --------------------------------------------------------------
      function tick(now) {
        if (!open) return;
        rafId = requestAnimationFrame(tick);
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
        showMsg(
          '<span class="egg__over glitch" data-text="GAME OVER">GAME OVER</span>' +
            '<span class="egg__final">score ' +
            score +
            (record ? ' · <em class="egg__record">new high!</em>' : "") +
            "</span>" +
            '<span class="egg__again muted">' +
            (coarse ? "tap to retry · ✕ to quit" : "press r to retry · esc to quit") +
            "</span>"
        );
      }

      function showMsg(html) {
        msg.innerHTML = html;
        msg.hidden = false;
      }
      function hideMsg() {
        msg.hidden = true;
        msg.innerHTML = "";
      }

      // --- input -------------------------------------------------------------
      function onKey(e) {
        var k = e.key.toLowerCase();
        if (k === "escape") {
          e.preventDefault();
          return exitGame();
        }
        if (over) {
          if (k === "r") {
            e.preventDefault();
            reset();
          }
          return;
        }
        if (k === "arrowup" || k === "w") {
          setDir(0, -1);
          e.preventDefault();
        } else if (k === "arrowdown" || k === "s") {
          setDir(0, 1);
          e.preventDefault();
        } else if (k === "arrowleft" || k === "a") {
          setDir(-1, 0);
          e.preventDefault();
        } else if (k === "arrowright" || k === "d") {
          setDir(1, 0);
          e.preventDefault();
        } else if (k === "p" || k === " ") {
          e.preventDefault();
          togglePause();
        } else if (k === "r") {
          reset();
        }
      }

      function togglePause() {
        if (over) return;
        paused = !paused;
        if (paused) {
          showMsg('<span class="egg__paused">paused</span>');
        } else {
          hideMsg();
          last = 0;
        }
      }

      // Touch: swipe to steer, tap to pause/resume, tap to retry when over.
      var tsx = 0,
        tsy = 0;
      function onTouchStart(e) {
        var t = e.changedTouches[0];
        tsx = t.clientX;
        tsy = t.clientY;
      }
      function onTouchEnd(e) {
        var t = e.changedTouches[0];
        var dx = t.clientX - tsx,
          dy = t.clientY - tsy;
        var isTap = Math.abs(dx) < 16 && Math.abs(dy) < 16;
        if (over) return reset(); // tap the board to retry
        if (isTap) return togglePause(); // tap to pause/resume
        if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 1 : -1, 0);
        else setDir(0, dy > 0 ? 1 : -1);
      }
      function onTouchMove(e) {
        e.preventDefault(); // stop the page scrolling under the board
      }

      // On-screen D-pad / pause button (touch).
      function onPad(e) {
        var btn = e.target.closest("[data-dir],[data-action]");
        if (!btn) return;
        e.preventDefault();
        if (btn.getAttribute("data-action") === "pause") {
          return over ? reset() : togglePause();
        }
        if (over) return reset();
        var d = btn.getAttribute("data-dir");
        if (d === "up") setDir(0, -1);
        else if (d === "down") setDir(0, 1);
        else if (d === "left") setDir(-1, 0);
        else if (d === "right") setDir(1, 0);
      }

      function onVisibility() {
        if (document.hidden && !over) {
          paused = true;
          showMsg('<span class="egg__paused">paused</span>');
        }
      }

      // --- teardown ----------------------------------------------------------
      function exitGame() {
        open = false;
        if (rafId) cancelAnimationFrame(rafId);
        document.body.style.overflow = prevBodyOverflow; // restore scroll
        window.removeEventListener("keydown", onKey, true);
        document.removeEventListener("visibilitychange", onVisibility);
        stage.removeEventListener("touchstart", onTouchStart);
        stage.removeEventListener("touchend", onTouchEnd);
        stage.removeEventListener("touchmove", onTouchMove);
        controls.removeEventListener("pointerdown", onPad);
        closeBtn.removeEventListener("click", exitGame);
        overlay.removeEventListener("mousedown", onBackdrop);
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (prevFocus && prevFocus.focus) prevFocus.focus();
      }

      function onBackdrop(e) {
        if (e.target === overlay) exitGame(); // click outside the panel closes
      }

      // --- wire up & go ------------------------------------------------------
      window.addEventListener("keydown", onKey, true);
      document.addEventListener("visibilitychange", onVisibility);
      stage.addEventListener("touchstart", onTouchStart, { passive: true });
      stage.addEventListener("touchend", onTouchEnd, { passive: true });
      stage.addEventListener("touchmove", onTouchMove, { passive: false });
      controls.addEventListener("pointerdown", onPad);
      closeBtn.addEventListener("click", exitGame);
      overlay.addEventListener("mousedown", onBackdrop);

      reset();
      closeBtn.focus();
      rafId = requestAnimationFrame(tick);
    }
  })();

  // ---------------------------------------------------------------------------
  // Hidden easter egg: DOM gravity. Detaches the visible page into rigid bodies
  // that tumble + pile up at the bottom of the viewport. Discoverable via the
  // `gravity` / `destroy` CLI commands; ↻ reset / Esc rebuild the page.
  // ---------------------------------------------------------------------------
  (function gravityEgg() {
    var open = false; // re-entrancy guard — one demolition at a time

    // Leaf "chunk" selectors — each match becomes one falling rigid body. Order
    // is cosmetic (top-to-bottom). Nested matches are de-duped below.
    var SELECTORS = [
      ".titlebar",
      ".hero__avatar",
      ".hero__name",
      ".hero__role",
      ".hero__greeting",
      ".block .prompt",
      ".block .output > li",
      ".badge",
      ".skill-group__title",
      ".stat",
      ".lang-bar",
      ".footer p",
    ];

    // Physics constants (px / frame, frame ≈ 1/60s).
    var GRAV = 0.45, // downward acceleration
      REST = 0.55, // restitution (bounciness) off floor/walls
      FRIC = 0.82, // tangential friction on floor contact
      AIR = 0.999, // mild horizontal air drag
      SLEEP_V = 0.35; // |v| below which a grounded body sleeps

    function el(tag, cls, html) {
      var n = document.createElement(tag);
      if (cls) n.className = cls;
      if (html != null) n.innerHTML = html;
      return n;
    }

    // Gather matched nodes, then keep only "leaves": drop any node that is
    // contained by another matched node, plus zero-size / hidden ones (which
    // also excludes the still-hidden #stats section).
    function collectTargets() {
      var raw = [];
      SELECTORS.forEach(function (sel) {
        Array.prototype.forEach.call(document.querySelectorAll(sel), function (n) {
          if (raw.indexOf(n) === -1) raw.push(n);
        });
      });
      return raw.filter(function (n, i) {
        var r = n.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) return false;
        for (var j = 0; j < raw.length; j++) {
          if (j !== i && raw[j].contains(n)) return false;
        }
        return true;
      });
    }

    function launch() {
      if (open) return;
      open = true;

      // The physics layer lives above the page but below the reset button.
      var stage = el("div", "gravity-stage");
      stage.setAttribute("aria-hidden", "true");

      // Clone each target at its current on-screen rect (getBoundingClientRect
      // is viewport-relative, so scroll is handled for us). Clones become fixed,
      // size-locked bodies; ids are stripped so nothing duplicates.
      var bodies = collectTargets().map(function (orig) {
        var r = orig.getBoundingClientRect();
        var clone = orig.cloneNode(true);
        clone.removeAttribute("id");
        Array.prototype.forEach.call(clone.querySelectorAll("[id]"), function (d) {
          d.removeAttribute("id");
        });
        clone.classList.add("gravity-body");
        clone.style.width = r.width + "px";
        clone.style.height = r.height + "px";
        stage.appendChild(clone);
        return {
          node: clone,
          x: r.left,
          y: r.top,
          w: r.width,
          h: r.height,
          vx: (Math.random() - 0.5) * 2,
          vy: 0,
          angle: 0,
          vAngle: (Math.random() - 0.5) * 0.04,
          sleeping: false,
        };
      });

      document.body.appendChild(stage);

      // Hide the live page (the chaos is decorative — mute it for AT too).
      document.body.classList.add("gravity-on");
      var terminal = document.getElementById("terminal");
      if (terminal) terminal.setAttribute("aria-hidden", "true");

      // The way back: a focusable button + Esc both rebuild from scratch.
      var resetBtn = el("button", "gravity-reset", "&#8635; reset");
      resetBtn.setAttribute("type", "button");
      resetBtn.setAttribute("aria-label", "Reset the page");
      resetBtn.addEventListener("click", function () {
        window.location.reload();
      });
      document.body.appendChild(resetBtn);
      resetBtn.focus();

      window.addEventListener(
        "keydown",
        function (e) {
          if (e.key === "Escape") window.location.reload();
        },
        true
      );

      // Floor / right wall, recomputed on resize.
      var floorY = window.innerHeight,
        wallR = window.innerWidth;
      window.addEventListener(
        "resize",
        function () {
          floorY = window.innerHeight;
          wallR = window.innerWidth;
        },
        { passive: true }
      );

      function step(b) {
        if (b.sleeping) return;
        b.vy += GRAV;
        b.vx *= AIR;
        b.x += b.vx;
        b.y += b.vy;
        b.angle += b.vAngle;

        // Floor.
        if (b.y + b.h >= floorY) {
          b.y = floorY - b.h;
          b.vy = -b.vy * REST;
          b.vx *= FRIC;
          b.vAngle *= FRIC;
          if (Math.abs(b.vy) < SLEEP_V && Math.abs(b.vx) < SLEEP_V) {
            b.vy = 0;
            b.vx = 0;
            b.vAngle *= 0.5;
            if (Math.abs(b.vAngle) < 0.005) {
              b.vAngle = 0;
              b.sleeping = true;
            }
          }
        }
        // Walls.
        if (b.x <= 0) {
          b.x = 0;
          b.vx = -b.vx * REST;
        } else if (b.x + b.w >= wallR) {
          b.x = wallR - b.w;
          b.vx = -b.vx * REST;
        }

        b.node.style.transform =
          "translate(" + b.x + "px," + b.y + "px) rotate(" + b.angle + "rad)";
      }

      (function frame() {
        for (var i = 0; i < bodies.length; i++) step(bodies[i]);
        window.requestAnimationFrame(frame);
      })();
    }

    document.addEventListener("eschgi:gravity", launch);
  })();

  // ---------------------------------------------------------------------------
  // Hidden easter egg: a 3·2·1 rocket launch. Like gravity it builds a
  // full-screen overlay in JS and listens on a custom event, but it cleans up
  // after itself (~5s) instead of waiting for a reset.
  // ---------------------------------------------------------------------------
  (function rocketEgg() {
    var open = false; // re-entrancy guard — one flight at a time

    // Small ASCII rocket. The base (last line) is where smoke puffs spawn.
    var ROCKET =
      "    /\\\n" +
      "   /  \\\n" +
      "  |    |\n" +
      "  | [] |\n" +
      "  |    |\n" +
      " /|    |\\\n" +
      "/ |    | \\\n" +
      "  '----'";

    function el(tag, cls, html) {
      var n = document.createElement(tag);
      if (cls) n.className = cls;
      if (html != null) n.innerHTML = html;
      return n;
    }

    function launch() {
      if (open) return;
      open = true;

      var stage = el("div", "rocket-stage");
      stage.setAttribute("aria-hidden", "true");

      var rocket = el("pre", "rocket");
      var flame = el("span", "rocket-flame", "▲▼▲");
      rocket.textContent = ROCKET;
      rocket.appendChild(flame);

      var banner = el("div", "rocket-banner");

      stage.appendChild(rocket);
      stage.appendChild(banner);
      document.body.appendChild(stage);

      var timers = [];
      var trail = null;
      function after(ms, fn) {
        timers.push(window.setTimeout(fn, ms));
      }

      function teardown() {
        timers.forEach(window.clearTimeout);
        if (trail) window.clearInterval(trail);
        window.removeEventListener("keydown", onKey, true);
        if (stage.parentNode) stage.parentNode.removeChild(stage);
        open = false;
        var input = document.getElementById("cli-input");
        if (input) input.focus();
      }

      function onKey(e) {
        if (e.key === "Escape") teardown();
      }

      // Reduced motion shouldn't reach here (the CLI command short-circuits),
      // but if it does, bail without animating.
      if (prefersReduced) return teardown();

      window.addEventListener("keydown", onKey, true);

      // Phase 1 — countdown.
      banner.textContent = "3";
      after(450, function () { banner.textContent = "2"; });
      after(900, function () { banner.textContent = "1"; });
      after(1350, function () {
        banner.textContent = "LIFTOFF";
        rocket.classList.add("rocket--shake");
      });

      // Phase 2 — ignite + rise, spilling a smoke trail along the way.
      after(1850, function () {
        banner.textContent = "";
        rocket.classList.remove("rocket--shake");
        rocket.classList.add("rocket--rise");
        trail = window.setInterval(function () {
          var r = rocket.getBoundingClientRect();
          if (r.bottom < 0) return; // rocket has left the viewport
          var puff = el("span", "rocket-smoke");
          var spread = (Math.random() - 0.5) * 24;
          puff.style.left = r.left + r.width / 2 + spread + "px";
          puff.style.top = r.bottom - 12 + "px";
          stage.appendChild(puff);
          window.setTimeout(function () {
            if (puff.parentNode) puff.parentNode.removeChild(puff);
          }, 900);
        }, 90);
      });

      // Phase 3 — payoff, then clean up.
      after(4400, function () {
        if (trail) { window.clearInterval(trail); trail = null; }
        rocket.style.display = "none";
        banner.className = "rocket-banner rocket-banner--orbit";
        banner.textContent = "in orbit ✨";
      });
      after(5400, teardown);
    }

    document.addEventListener("eschgi:launch", launch);
  })();

  // ---------------------------------------------------------------------------
  // Hidden easter egg: a black hole that swallows the page, then a supernova.
  // Like gravity it clones the visible page into a physics stage, but instead of
  // dropping bodies it drags them inward (spiralling + shrinking) toward a
  // singularity at screen center; once everything is consumed it detonates in a
  // flash and — unlike gravity — cleans up after itself (no reload needed).
  // ---------------------------------------------------------------------------
  (function blackHoleEgg() {
    var open = false; // re-entrancy guard — one collapse at a time

    // Same leaf "chunk" selectors gravity uses — each match becomes one body.
    var SELECTORS = [
      ".titlebar",
      ".hero__avatar",
      ".hero__name",
      ".hero__role",
      ".hero__greeting",
      ".block .prompt",
      ".block .output > li",
      ".badge",
      ".skill-group__title",
      ".stat",
      ".lang-bar",
      ".footer p",
    ];

    function el(tag, cls, html) {
      var n = document.createElement(tag);
      if (cls) n.className = cls;
      if (html != null) n.innerHTML = html;
      return n;
    }

    // Keep only visible "leaves" (drop nodes contained by another match, plus
    // zero-size / hidden ones — same shape as gravity's collector).
    function collectTargets() {
      var raw = [];
      SELECTORS.forEach(function (sel) {
        Array.prototype.forEach.call(document.querySelectorAll(sel), function (n) {
          if (raw.indexOf(n) === -1) raw.push(n);
        });
      });
      return raw.filter(function (n, i) {
        var r = n.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) return false;
        for (var j = 0; j < raw.length; j++) {
          if (j !== i && raw[j].contains(n)) return false;
        }
        return true;
      });
    }

    function launch() {
      if (open) return;
      open = true;

      // Reduced motion shouldn't reach here (the CLI command short-circuits),
      // but guard anyway.
      if (prefersReduced) { open = false; return; }

      var stage = el("div", "blackhole-stage");
      stage.setAttribute("aria-hidden", "true");

      // Singularity sits dead center; everything is pulled toward it.
      var cx = window.innerWidth / 2;
      var cy = window.innerHeight / 2;
      var core = el("div", "blackhole-core");
      core.style.left = cx + "px";
      core.style.top = cy + "px";

      // Clone each target at its current on-screen rect into fixed bodies.
      var bodies = collectTargets().map(function (orig) {
        var r = orig.getBoundingClientRect();
        var clone = orig.cloneNode(true);
        clone.removeAttribute("id");
        Array.prototype.forEach.call(clone.querySelectorAll("[id]"), function (d) {
          d.removeAttribute("id");
        });
        clone.classList.add("blackhole-body");
        clone.style.width = r.width + "px";
        clone.style.height = r.height + "px";
        stage.appendChild(clone);
        // Body center, so we can aim its pull at the singularity.
        return {
          node: clone,
          x: r.left,
          y: r.top,
          w: r.width,
          h: r.height,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5,
          angle: 0,
          vAngle: (Math.random() - 0.5) * 0.05,
          scale: 1,
          life: 0,
          gone: false,
        };
      });

      stage.appendChild(core);
      document.body.appendChild(stage);

      // Hide the live page (the chaos is decorative — mute it for AT too).
      document.body.classList.add("blackhole-on");
      var terminal = document.getElementById("terminal");
      if (terminal) terminal.setAttribute("aria-hidden", "true");

      var timers = [];
      var raf = 0;
      var detonated = false;
      function after(ms, fn) { timers.push(window.setTimeout(fn, ms)); }

      function teardown() {
        timers.forEach(window.clearTimeout);
        if (raf) window.cancelAnimationFrame(raf);
        window.removeEventListener("keydown", onKey, true);
        window.removeEventListener("resize", onResize);
        if (stage.parentNode) stage.parentNode.removeChild(stage);
        document.body.classList.remove("blackhole-on");
        if (terminal) terminal.removeAttribute("aria-hidden");
        open = false;
        var input = document.getElementById("cli-input");
        if (input) input.focus();
      }

      function onKey(e) {
        if (e.key === "Escape") teardown();
      }
      window.addEventListener("keydown", onKey, true);

      // Keep the singularity centered if the viewport changes mid-collapse.
      function onResize() {
        cx = window.innerWidth / 2;
        cy = window.innerHeight / 2;
        core.style.left = cx + "px";
        core.style.top = cy + "px";
      }
      window.addEventListener("resize", onResize, { passive: true });

      // Physics tuning (px / frame, frame ≈ 1/60s). Tuned so every body actually
      // spirals into the core (not just orbits): the bodies all reach the
      // singularity within ~1–3s across phone→ultrawide viewports.
      var ACCEL_MIN = 0.45, // constant inward pull so even distant bodies move
        PULL = 9000, // inverse-square term → much stronger up close
        SWIRL = 0.35, // tangential pull as a fraction of inward accel → spiral
        DRAG = 0.93, // bleed off speed so orbits decay inward
        EAT = 40, // distance from center at which a body is swallowed
        MAX_LIFE = 300; // frames after which a straggler is absorbed anyway (~5s)

      function supernova() {
        if (detonated) return;
        detonated = true;
        core.className = "blackhole-core blackhole-supernova";
        after(900, teardown);
      }

      function step(b) {
        if (b.gone) return;
        b.life++;
        var bx = b.x + b.w / 2,
          by = b.y + b.h / 2;
        var dx = cx - bx,
          dy = cy - by;
        var dist = Math.sqrt(dx * dx + dy * dy) || 1;
        if (dist < EAT || b.life > MAX_LIFE) {
          b.gone = true;
          b.node.style.display = "none";
          core.classList.add("blackhole-core--fed");
          // A brief pop on each feeding, then settle back.
          after(140, function () { core.classList.remove("blackhole-core--fed"); });
          return;
        }
        var nx = dx / dist,
          ny = dy / dist;
        // Inward accel: a constant floor plus an inverse-square term that ramps
        // up close. Swirl adds a perpendicular (-ny, nx) component proportional
        // to the pull, so bodies spiral in rather than diving straight.
        var accel = ACCEL_MIN + PULL / (dist * dist);
        b.vx += nx * accel - ny * accel * SWIRL;
        b.vy += ny * accel + nx * accel * SWIRL;
        b.vx *= DRAG;
        b.vy *= DRAG;
        b.x += b.vx;
        b.y += b.vy;
        b.angle += b.vAngle + accel * 0.05;
        // Shrink toward nothing as the body nears the horizon.
        b.scale = Math.max(0.05, Math.min(1, dist / 320));
        b.node.style.transform =
          "translate(" + b.x + "px," + b.y + "px) rotate(" + b.angle +
          "rad) scale(" + b.scale + ")";
      }

      (function frame() {
        var alive = 0;
        for (var i = 0; i < bodies.length; i++) {
          step(bodies[i]);
          if (!bodies[i].gone) alive++;
        }
        if (alive === 0) { supernova(); return; }
        raf = window.requestAnimationFrame(frame);
      })();

      // Safety net: never trap the page if a body somehow can't reach center.
      // Generous so slow (<60fps) devices still finish the frame-based collapse.
      after(8000, supernova);
    }

    document.addEventListener("eschgi:blackhole", launch);
  })();

  // ---------------------------------------------------------------------------
  // Interactive terminal: a real prompt visitors can type into.
  // Commands surface content already on the page (single source of truth).
  // ---------------------------------------------------------------------------
  (function interactiveCli() {
    var form = document.getElementById("cli-form");
    var input = document.getElementById("cli-input");
    var log = document.getElementById("cli-log");
    var root = document.getElementById("cli");
    if (!form || !input || !log) return;

    // --- output helpers ------------------------------------------------------
    function line(html, cls) {
      var div = document.createElement("div");
      div.className = "cli__line" + (cls ? " " + cls : "");
      div.innerHTML = html;
      log.appendChild(div);
      log.scrollTop = log.scrollHeight;
      return div;
    }
    function print(text, cls) {
      // text may be multi-line; render newlines literally (pre-wrap handles it).
      line(esc(text), cls);
    }
    function esc(s) {
      return String(s).replace(/[&<>]/g, function (c) {
        return c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;";
      });
    }
    // Collapse whitespace from DOM text so output reads as clean lines.
    function clean(s) {
      return (s || "").replace(/\s+/g, " ").trim();
    }
    function textOf(sel) {
      var el = document.querySelector(sel);
      return el ? clean(el.textContent) : "";
    }

    // --- command implementations (read from existing DOM where possible) -----
    function cmdAbout() {
      var bio = textOf("#about-cmd ~ .output");
      if (bio) print(bio);
      var bullets = document.querySelectorAll("#about-cmd ~ .bullets li");
      Array.prototype.forEach.call(bullets, function (li) {
        print("> " + clean(li.textContent).replace(/^>\s*/, ""));
      });
    }
    function cmdNow() {
      print(textOf(".now") || "Nothing scheduled.");
    }
    function cmdSkills(arg) {
      var groups = document.querySelectorAll(".skill-group");
      var want = (arg || "").toLowerCase().replace(/\/$/, "");
      var matched = false;
      Array.prototype.forEach.call(groups, function (g) {
        var title = clean(g.querySelector(".skill-group__title").textContent);
        var key = title.toLowerCase().replace(/\/$/, "");
        if (want && key !== want) return;
        matched = true;
        var badges = [];
        Array.prototype.forEach.call(g.querySelectorAll(".badge"), function (b) {
          badges.push(clean(b.textContent));
        });
        line(
          '<span class="cli__key">' + esc(title) + "</span> " + esc(badges.join("  ·  "))
        );
      });
      if (want && !matched) {
        print("skills: no such group: " + want + " (try: languages, frameworks, databases, tools)", "cli__err");
      }
    }
    function cmdContact() {
      var links = document.querySelectorAll(".links a");
      if (!links.length) return print("No contacts listed.");
      Array.prototype.forEach.call(links, function (a) {
        // Anchor text minus the muted "— url" suffix, plus the real href.
        var label = clean(a.childNodes[2] ? a.childNodes[2].textContent : a.textContent);
        line(
          '<a href="' + esc(a.href) + '" target="_blank" rel="noopener noreferrer">' +
            esc(label || a.href) + "</a> " +
            '<span class="muted">' + esc(a.getAttribute("href")) + "</span>"
        );
      });
    }
    function cmdStats() {
      var section = document.getElementById("stats");
      if (!section || section.hidden) {
        return print("stats: still fetching from github… try again in a moment.", "cli__err");
      }
      var parts = [];
      Array.prototype.forEach.call(section.querySelectorAll(".stat"), function (s) {
        var num = clean(s.querySelector(".stat__num").textContent);
        var label = clean(s.querySelector(".stat__label").textContent);
        parts.push(num + " " + label);
      });
      print(parts.join("  ·  "));
      section.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "center" });
    }
    function cmdLs() {
      line(
        '<span class="cli__key">about.txt</span>  ' +
          '<span class="cli__key">now.txt</span>  ' +
          '<span class="cli__key">skills/</span>  ' +
          '<span class="cli__key">contact.txt</span>'
      );
    }
    function cmdCat(arg) {
      switch ((arg || "").toLowerCase()) {
        case "about.txt": return cmdAbout();
        case "now.txt": return cmdNow();
        case "contact.txt": return cmdContact();
        case "skills":
        case "skills/": return cmdSkills();
        case "": return print("cat: missing file operand (try: cat about.txt)", "cli__err");
        default: return print("cat: " + arg + ": No such file or directory", "cli__err");
      }
    }

    // Hidden easter egg: a cinematic fake "hacking" sequence. Like snake/crt it's
    // discoverable via tab-complete but never advertised in `help`.
    var hacking = false; // re-entrancy guard so two runs can't overlap
    function hackHex() {
      var s = "";
      for (var i = 0; i < 8; i++) {
        s += ("0" + Math.floor(Math.random() * 256).toString(16)).slice(-2).toUpperCase() + " ";
      }
      return s.trim();
    }
    function cmdHack(args) {
      if (hacking) return print("hack: operation already in progress…", "cli__err");
      var target = args && args[0] ? args[0] : "mainframe";
      var grantedHtml =
        '<span class="glitch cli__granted" data-text="ACCESS GRANTED">ACCESS GRANTED</span>';
      var payoff = "…just kidding. it's a static site — nothing to steal but good vibes 😄";
      var hint = "(try `help`, or triple-click the avatar)";

      // Accessibility: skip the timed animation, dump the gist at once.
      if (prefersReduced) {
        print("> establishing uplink to " + target + "…", "cli__hack");
        print("> bypassing firewall… done", "cli__hack");
        print("> cracking root credentials… done", "cli__hack");
        line(grantedHtml);
        print(payoff);
        print(hint, "cli__hack");
        return;
      }

      hacking = true;
      input.disabled = true;

      // Port-scan progress bar, redrawn in place on a single line.
      var bar = null;
      function drawBar(pct) {
        var WIDTH = 20;
        var fill = Math.round((pct / 100) * WIDTH);
        var blocks = new Array(fill + 1).join("█") + new Array(WIDTH - fill + 1).join("░");
        var text = "> scanning ports  [" + blocks + "] " + pct + "%";
        if (!bar) bar = line(esc(text), "cli__hack cli__hack--bar");
        else bar.textContent = text;
        log.scrollTop = log.scrollHeight;
      }

      // Each step is [delayBeforeMs, fn]; run them back to back.
      var steps = [
        [0, function () { print("> initializing exploit framework…", "cli__hack"); }],
        [260, function () { print("> establishing uplink to " + target + "…", "cli__hack"); }],
      ];
      [0, 18, 47, 73, 91, 100].forEach(function (pct, i) {
        steps.push([i === 0 ? 320 : 170, function () { drawBar(pct); }]);
      });
      steps.push([260, function () { print("> firewall breached. dumping memory:", "cli__hack"); }]);
      steps.push([180, function () { print("  " + hackHex(), "cli__hack"); }]);
      steps.push([140, function () { print("  " + hackHex(), "cli__hack"); }]);
      steps.push([140, function () { print("  " + hackHex(), "cli__hack"); }]);
      steps.push([300, function () { print("> cracking root credentials… ✓", "cli__hack"); }]);
      steps.push([360, function () { line(grantedHtml); }]);
      steps.push([420, function () { print(payoff); }]);
      steps.push([180, function () { print(hint, "cli__hack"); }]);

      var idx = 0;
      (function tick() {
        if (idx >= steps.length) {
          hacking = false;
          input.disabled = false;
          input.focus();
          return;
        }
        var step = steps[idx++];
        window.setTimeout(function () {
          step[1]();
          tick();
        }, step[0]);
      })();
    }

    // Hidden easter egg: demolish the page with gravity. Mirrors `matrix`'s
    // guard/dispatch style; the gravityEgg module does the actual work.
    function cmdGravity() {
      if (prefersReduced) {
        return print(
          "gravity: physics is off in reduced-motion mode — everything stays where it belongs.",
          "cli__err"
        );
      }
      if (typeof window.CustomEvent !== "function") {
        return print("gravity: unsupported in this browser", "cli__err");
      }
      print("detaching the DOM… mind your head. (↻ reset or Esc to rebuild)");
      document.dispatchEvent(new CustomEvent("eschgi:gravity"));
    }

    // Hidden easter egg: a 3·2·1 rocket launch. Mirrors gravity/matrix —
    // bail politely under reduced motion, otherwise dispatch to rocketEgg.
    function cmdLaunch() {
      if (prefersReduced) {
        return print("🚀 liftoff! … (animation off in reduced-motion mode) — in orbit ✨");
      }
      if (typeof window.CustomEvent !== "function") {
        return print("launch: unsupported in this browser", "cli__err");
      }
      print("ignition sequence start… 🚀 (Esc to abort)");
      document.dispatchEvent(new CustomEvent("eschgi:launch"));
    }

    // Hidden easter egg: collapse the page into a black hole, then supernova.
    // Mirrors gravity/launch — bail under reduced motion, otherwise dispatch.
    function cmdBlackhole() {
      if (prefersReduced) {
        return print(
          "blackhole: spacetime stays flat in reduced-motion mode — nothing collapses.",
          "cli__err"
        );
      }
      if (typeof window.CustomEvent !== "function") {
        return print("blackhole: unsupported in this browser", "cli__err");
      }
      print("crossing the event horizon… 🕳️ (Esc to escape)");
      document.dispatchEvent(new CustomEvent("eschgi:blackhole"));
    }

    var COMMANDS = {
      help: function () {
        print("available commands:");
        line('  <span class="cli__key">about</span>     who I am');
        line('  <span class="cli__key">now</span>       what I\'m building');
        line('  <span class="cli__key">skills</span>    tech I work with (e.g. skills languages)');
        line('  <span class="cli__key">stats</span>     github numbers');
        line('  <span class="cli__key">contact</span>   where to find me');
        line('  <span class="cli__key">ls</span> · <span class="cli__key">cat</span>   browse the "files"');
        line('  <span class="cli__key">echo</span> · <span class="cli__key">date</span> · <span class="cli__key">clear</span>');
        line('  <span class="muted">… and maybe a game. tab-completes, ↑/↓ for history.</span>');
      },
      about: cmdAbout,
      whoami: cmdAbout,
      now: cmdNow,
      skills: function (args) { cmdSkills(args[0]); },
      contact: cmdContact,
      socials: cmdContact,
      stats: cmdStats,
      ls: cmdLs,
      cat: function (args) { cmdCat(args[0]); },
      echo: function (args) { print(args.join(" ")); },
      date: function () { print(new Date().toString()); },
      clear: function () { log.innerHTML = ""; },
      snake: function () {
        print("launching nibbles.exe…");
        if (typeof window.CustomEvent === "function") {
          document.dispatchEvent(new CustomEvent("eschgi:launch-snake"));
        }
      },
      crt: function (args) {
        // `crt` toggles, `crt on` / `crt off` force a state. The crtMode module
        // handles the event synchronously, so we can read the result right after.
        var arg = (args[0] || "").toLowerCase();
        var force = arg === "on" ? "on" : arg === "off" ? "off" : null;
        if (typeof window.CustomEvent === "function") {
          document.dispatchEvent(new CustomEvent("eschgi:toggle-crt", { detail: { force: force } }));
          var on = document.body.classList.contains("crt");
          line('crt mode: <span class="cli__key">' + (on ? "on" : "off") + "</span>");
        } else {
          print("crt: unsupported in this browser", "cli__err");
        }
      },
      gravity: cmdGravity,
      destroy: cmdGravity,
      blackhole: cmdBlackhole,
      supernova: cmdBlackhole,
      collapse: cmdBlackhole,
      launch: cmdLaunch,
      liftoff: cmdLaunch,
      rocket: cmdLaunch,
      matrix: function (args) {
        // `matrix` toggles, `matrix on` / `matrix off` force a state. The rain
        // canvas doesn't exist under reduced-motion, so bail gracefully there.
        if (prefersReduced) {
          return print("matrix: rain is off in reduced-motion mode — there is no spoon.", "cli__err");
        }
        if (typeof window.CustomEvent !== "function") {
          return print("matrix: unsupported in this browser", "cli__err");
        }
        var arg = (args[0] || "").toLowerCase();
        var force = arg === "on" ? "on" : arg === "off" ? "off" : null;
        document.dispatchEvent(new CustomEvent("eschgi:matrix", { detail: { force: force } }));
        var on = document.body.classList.contains("matrix-deep");
        print(on ? "wake up, Neo… 🐇 following the white rabbit." : "unplugged.");
        line('matrix mode: <span class="cli__key">' + (on ? "on" : "off") + "</span>");
      },
      sudo: function () { print("Permission denied: nice try 😏", "cli__err"); },
      hack: cmdHack,
    };
    var NAMES = Object.keys(COMMANDS).concat(["help"]);

    // --- run a line ----------------------------------------------------------
    function run(raw) {
      var parts = raw.split(/\s+/);
      var name = parts.shift().toLowerCase();
      if (!name) return;
      if (Object.prototype.hasOwnProperty.call(COMMANDS, name)) {
        COMMANDS[name](parts);
      } else {
        print("command not found: " + name + " — type 'help'", "cli__err");
      }
    }

    // --- history -------------------------------------------------------------
    var history = [];
    var hidx = 0; // points one past the newest entry

    // --- submit --------------------------------------------------------------
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var raw = input.value.replace(/\s+$/, "");
      input.value = "";
      // Echo the prompt + command.
      line(
        '<span class="muted">stefan@eschgi</span>:<span class="cli__tilde">~</span>$ ' + esc(raw),
        "cli__echo"
      );
      var trimmed = raw.trim();
      if (trimmed) {
        if (history[history.length - 1] !== trimmed) history.push(trimmed);
        run(trimmed);
      }
      hidx = history.length;
    });

    // --- history nav + tab completion ---------------------------------------
    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowUp") {
        if (!history.length) return;
        e.preventDefault();
        hidx = Math.max(0, hidx - 1);
        input.value = history[hidx] || "";
        moveCaretToEnd();
      } else if (e.key === "ArrowDown") {
        if (!history.length) return;
        e.preventDefault();
        hidx = Math.min(history.length, hidx + 1);
        input.value = history[hidx] || "";
        moveCaretToEnd();
      } else if (e.key === "Tab") {
        e.preventDefault();
        var frag = input.value.trim().toLowerCase();
        if (!frag || /\s/.test(input.value.trim())) return;
        var hits = NAMES.filter(function (n, i, a) {
          return n.indexOf(frag) === 0 && a.indexOf(n) === i;
        });
        if (hits.length === 1) {
          input.value = hits[0] + " ";
          moveCaretToEnd();
        } else if (hits.length > 1) {
          print(hits.join("  "));
        }
      }
    });

    function moveCaretToEnd() {
      var v = input.value;
      // Defer so the value is committed before we set the selection.
      window.setTimeout(function () {
        input.value = v;
        try { input.setSelectionRange(v.length, v.length); } catch (e) {}
      }, 0);
    }

    // Clicking anywhere in the block focuses the input (terminal feel),
    // but don't steal selection or link clicks.
    if (root) {
      root.addEventListener("click", function (e) {
        if (e.target.tagName === "A") return;
        if (window.getSelection && String(window.getSelection())) return;
        input.focus();
      });
    }
  })();
})();
