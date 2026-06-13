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
})();
