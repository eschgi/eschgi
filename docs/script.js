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
    var FRAME = 55; // ms between frames (~18fps, gentle + cheap)
    function draw(now) {
      if (!running) return;
      if (now - last >= FRAME) {
        last = now;
        ctx.fillStyle = "rgba(5, 7, 13, 0.10)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = fontSize + "px monospace";
        for (var i = 0; i < drops.length; i++) {
          var text = glyphs[Math.floor(Math.random() * glyphs.length)];
          var x = i * fontSize;
          var y = drops[i] * fontSize;
          // Leading glyph brighter than the trail.
          ctx.fillStyle = Math.random() > 0.975 ? "#aef5c8" : "#2fae62";
          ctx.fillText(text, x, y);
          if (y > canvas.height && Math.random() > 0.975) drops[i] = 0;
          drops[i]++;
        }
      }
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);

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
      sudo: function () { print("Permission denied: nice try 😏", "cli__err"); },
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
