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

      var hint = el(
        "p",
        "egg__hint muted",
        "arrows / wasd&nbsp;·&nbsp;p pause&nbsp;·&nbsp;r restart&nbsp;·&nbsp;esc quit"
      );

      var body = el("div", "egg__body");
      body.appendChild(hud);
      body.appendChild(stage);
      body.appendChild(hint);

      panel.appendChild(bar);
      panel.appendChild(body);
      overlay.appendChild(panel);
      document.body.appendChild(overlay);

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
            '<span class="egg__again muted">press r to retry · esc to quit</span>'
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
          paused = !paused;
          e.preventDefault();
          if (paused) {
            showMsg('<span class="egg__paused">paused</span>');
          } else {
            hideMsg();
            last = 0;
          }
        } else if (k === "r") {
          reset();
        }
      }

      // Touch: swipe to steer.
      var tsx = 0,
        tsy = 0;
      function onTouchStart(e) {
        var t = e.changedTouches[0];
        tsx = t.clientX;
        tsy = t.clientY;
      }
      function onTouchEnd(e) {
        if (over) {
          reset();
          return;
        }
        var t = e.changedTouches[0];
        var dx = t.clientX - tsx,
          dy = t.clientY - tsy;
        if (Math.abs(dx) < 16 && Math.abs(dy) < 16) return; // a tap, not a swipe
        if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 1 : -1, 0);
        else setDir(0, dy > 0 ? 1 : -1);
      }
      function onTouchMove(e) {
        e.preventDefault(); // stop the page scrolling under the board
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
        window.removeEventListener("keydown", onKey, true);
        document.removeEventListener("visibilitychange", onVisibility);
        canvas.removeEventListener("touchstart", onTouchStart);
        canvas.removeEventListener("touchend", onTouchEnd);
        canvas.removeEventListener("touchmove", onTouchMove);
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
      canvas.addEventListener("touchstart", onTouchStart, { passive: true });
      canvas.addEventListener("touchend", onTouchEnd, { passive: true });
      canvas.addEventListener("touchmove", onTouchMove, { passive: false });
      closeBtn.addEventListener("click", exitGame);
      overlay.addEventListener("mousedown", onBackdrop);

      reset();
      closeBtn.focus();
      rafId = requestAnimationFrame(tick);
    }
  })();
})();
