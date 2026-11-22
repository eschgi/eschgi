// eschgi.com — the page's behaviour: navigation, scroll reveal, the typing code card,
// GitHub stats, the technology sphere, the live demo card and the AI session.
//
// A classic deferred script rather than a module, so the page also works when opened
// from disk. It runs first of the three and shares a few helpers on `window.eschgi`.
(function () {
  "use strict";

  var reducedQuery = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : { matches: false };

  var eschgi = (window.eschgi = window.eschgi || {});
  Object.defineProperty(eschgi, "reducedMotion", {
    get: function () {
      return reducedQuery.matches;
    },
  });

  var numberFormat = new Intl.NumberFormat("en-US");
  eschgi.formatNumber = function (value) {
    return numberFormat.format(value);
  };

  // Calls `callback` once, the first time `element` scrolls into view.
  eschgi.onceVisible = function (element, callback, options) {
    if (!element) return;
    if (!("IntersectionObserver" in window)) {
      callback();
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        callback();
      });
    }, options || { threshold: 0.2 });
    observer.observe(element);
  };

  // Reports whether `element` is on screen, now and whenever that changes.
  eschgi.watchVisibility = function (element, callback, threshold) {
    if (!element) return;
    if (!("IntersectionObserver" in window)) {
      callback(true);
      return;
    }
    new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          callback(entry.isIntersecting);
        });
      },
      { threshold: threshold || 0 }
    ).observe(element);
  };

  // A small notification at the bottom of the screen, with an optional action button.
  eschgi.toast = function (message, action) {
    var previous = document.querySelector(".toast");
    if (previous) previous.remove();

    var toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("role", "status");
    var text = document.createElement("span");
    text.textContent = message;
    toast.appendChild(text);

    var timer = 0;
    function hide() {
      window.clearTimeout(timer);
      toast.classList.remove("is-shown");
      window.setTimeout(function () {
        toast.remove();
      }, 400);
    }

    if (action) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "btn btn--primary btn--sm";
      button.textContent = action.label;
      button.addEventListener("click", function () {
        hide();
        if (action.onClick) action.onClick();
      });
      toast.appendChild(button);
    }

    document.body.appendChild(toast);
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        toast.classList.add("is-shown");
      });
    });
    timer = window.setTimeout(hide, action ? 7000 : 4000);
    return hide;
  };

  eschgi.scrollToSection = function (id) {
    var target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: eschgi.reducedMotion ? "auto" : "smooth", block: "start" });
  };

  // ------------------------------------------------------------------ navigation
  function wireNav() {
    var toggle = document.querySelector("[data-nav-toggle]");
    var menu = document.querySelector("[data-nav-menu]");
    if (!toggle || !menu) return;

    function setOpen(open) {
      menu.hidden = !open;
      toggle.setAttribute("aria-expanded", String(open));
    }

    toggle.addEventListener("click", function () {
      setOpen(menu.hidden);
    });
    menu.addEventListener("click", function (event) {
      if (event.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !menu.hidden) {
        setOpen(false);
        toggle.focus();
      }
    });
  }

  // Marks the nav link of whichever section is in the middle of the screen.
  function wireScrollSpy() {
    var links = document.querySelectorAll("[data-navlinks] a");
    if (!("IntersectionObserver" in window) || !links.length) return;

    var bySection = new Map();
    Array.prototype.forEach.call(links, function (link) {
      var section = document.querySelector(link.getAttribute("href"));
      if (section) bySection.set(section, link);
    });

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var link = bySection.get(entry.target);
          if (!link) return;
          if (entry.isIntersecting) link.setAttribute("aria-current", "true");
          else link.removeAttribute("aria-current");
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    bySection.forEach(function (_, section) {
      observer.observe(section);
    });
  }

  function wireReveal() {
    var elements = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      Array.prototype.forEach.call(elements, function (el) {
        el.classList.add("is-visible");
      });
      return;
    }
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    Array.prototype.forEach.call(elements, function (el) {
      observer.observe(el);
    });
  }

  // -------------------------------------------------------------- hero code card
  // The code is in the markup (readable without JavaScript); this types it out again.
  function typeHeroCode() {
    var pre = document.querySelector("[data-typed]");
    var output = document.querySelector("[data-typed-output]");
    if (!pre || eschgi.reducedMotion) return;

    var code = pre.querySelector("code") || pre;
    var walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    var texts = nodes.map(function (node) {
      return node.nodeValue;
    });

    // Hold the finished size so nothing below moves while the code types itself.
    pre.style.minHeight = pre.offsetHeight + "px";
    nodes.forEach(function (node) {
      node.nodeValue = "";
    });
    if (output) output.classList.add("is-waiting");

    var caret = document.createElement("span");
    caret.className = "typing-caret";
    nodes[0].parentNode.insertBefore(caret, nodes[0].nextSibling);

    var nodeIndex = 0;
    var charIndex = 0;

    function step() {
      var delay = 16;
      var budget = 3;
      while (budget > 0 && nodeIndex < nodes.length) {
        var full = texts[nodeIndex];
        charIndex++;
        nodes[nodeIndex].nodeValue = full.slice(0, charIndex);
        nodes[nodeIndex].parentNode.insertBefore(caret, nodes[nodeIndex].nextSibling);
        var typed = full.charAt(charIndex - 1);
        if (charIndex >= full.length) {
          nodeIndex++;
          charIndex = 0;
        }
        budget--;
        if (typed === "\n") {
          delay = 70;
          budget = 0;
        }
      }
      if (nodeIndex < nodes.length) {
        window.setTimeout(step, delay);
        return;
      }
      window.setTimeout(function () {
        if (output) output.classList.remove("is-waiting");
      }, 450);
    }

    window.setTimeout(step, 500);
  }

  // ---------------------------------------------------------------- GitHub stats
  function loadStats() {
    var root = document.querySelector("[data-stats]");
    if (!root || !window.fetch) return;

    fetch("stats.json", { cache: "no-cache" })
      .then(function (response) {
        if (!response.ok) throw new Error(String(response.status));
        return response.json();
      })
      .then(function (data) {
        renderStats(root, data);
      })
      .catch(function () {
        /* the fallback line with the profile link stays */
      });
  }

  function countUp(element, to) {
    if (eschgi.reducedMotion || to <= 0) {
      element.textContent = eschgi.formatNumber(to);
      return;
    }
    var start = performance.now();
    var duration = 1300;
    function frame(now) {
      var progress = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = eschgi.formatNumber(Math.round(to * eased));
      if (progress < 1) window.requestAnimationFrame(frame);
    }
    window.requestAnimationFrame(frame);
  }

  function renderStats(root, data) {
    if (!data || typeof data !== "object" || !(data.schemaVersion >= 1) || data.placeholder) return;
    eschgi.stats = data;

    var contributions = data.contributions || {};
    var values = {
      contributions: contributions.lastYearTotal || 0,
      commits: contributions.commits || 0,
      pullRequests: contributions.pullRequests || 0,
      issues: contributions.issues || 0,
      repositories: (data.repos && data.repos.nonFork) || 0,
    };

    root.hidden = false;
    var fallback = document.querySelector("[data-stats-fallback]");
    if (fallback) fallback.hidden = true;

    var tiles = root.querySelector(".stat-tiles");
    eschgi.onceVisible(
      tiles,
      function () {
        Object.keys(values).forEach(function (key) {
          var element = root.querySelector('[data-stat="' + key + '"]');
          if (element) countUp(element, values[key]);
        });
      },
      { threshold: 0.3 }
    );

    renderLanguages(root, data.languages || []);

    renderCalendar(root, data.calendar);

    var meta = root.querySelector("[data-stats-meta]");
    if (meta && data.generatedAt) {
      var updated = new Date(data.generatedAt);
      if (!isNaN(updated)) {
        meta.textContent =
          "Updated " +
          updated.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) +
          " · github.com/" +
          (data.login || "eschgi");
      }
    }

    // The hero's badge, with the year's contributions.
    var badge = document.querySelector("[data-hero-stat]");
    var badgeValue = document.querySelector("[data-hero-contributions]");
    if (badge && badgeValue && values.contributions > 0) {
      badgeValue.textContent = eschgi.formatNumber(values.contributions);
      badge.hidden = false;
    }
  }

  function renderLanguages(root, languages) {
    var stack = root.querySelector("[data-lang-stack]");
    var legend = root.querySelector("[data-lang-legend]");
    if (!stack || !legend) return;

    var list = languages.filter(function (language) {
      return language && language.name && language.percent > 0;
    });
    var listed = list.reduce(function (sum, language) {
      return sum + language.percent;
    }, 0);
    if (100 - listed >= 0.5) list.push({ name: "Other", color: "#4a4a54", percent: 100 - listed });

    var segments = list.map(function (language) {
      var color = language.color || "#94a3b8";

      var segment = document.createElement("span");
      segment.style.background = color;
      stack.appendChild(segment);

      var item = document.createElement("li");
      var dot = document.createElement("i");
      dot.style.background = color;
      var name = document.createElement("span");
      name.textContent = language.name;
      var percent = document.createElement("b");
      percent.textContent = language.percent.toFixed(1) + "%";
      item.appendChild(dot);
      item.appendChild(name);
      item.appendChild(percent);
      legend.appendChild(item);

      return { element: segment, width: language.percent + "%" };
    });

    function grow() {
      segments.forEach(function (segment, index) {
        window.setTimeout(function () {
          segment.element.style.width = segment.width;
        }, eschgi.reducedMotion ? 0 : index * 70);
      });
    }
    if (eschgi.reducedMotion) grow();
    else eschgi.onceVisible(stack, grow, { threshold: 0.5 });
  }

  // `calendar` is { start: "YYYY-MM-DD" (a Sunday), counts: [n, …], levels: "0123…" }, one entry a day.
  function renderCalendar(root, calendar) {
    var card = root.querySelector("[data-calendar-card]");
    var grid = root.querySelector("[data-calendar-grid]");
    var months = root.querySelector("[data-calendar-months]");
    if (!card || !grid || !months) return false;
    if (!calendar || typeof calendar.start !== "string" || !Array.isArray(calendar.counts) || !calendar.counts.length) {
      return false;
    }

    var start = new Date(calendar.start + "T00:00:00Z");
    if (isNaN(start)) return false;

    var counts = calendar.counts;
    var levels = typeof calendar.levels === "string" && calendar.levels.length === counts.length ? calendar.levels : null;
    var thresholds = quartiles(counts);
    var offset = start.getUTCDay();
    var weeks = Math.ceil((offset + counts.length) / 7);
    var dayMs = 86400000;
    var dateFormat = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
    var monthFormat = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });

    grid.style.setProperty("--weeks", weeks);
    months.style.setProperty("--weeks", weeks);

    var fragment = document.createDocumentFragment();
    var lastLabelWeek = -3;
    for (var cell = 0; cell < weeks * 7; cell++) {
      var day = cell - offset;
      var week = Math.floor(cell / 7);
      var element = document.createElement("i");
      element.style.setProperty("--w", week);
      if (day < 0 || day >= counts.length) {
        element.className = "is-future";
      } else {
        var count = counts[day] || 0;
        var date = new Date(start.getTime() + day * dayMs);
        element.dataset.level = levels ? levels.charAt(day) : levelFor(count, thresholds);
        element.dataset.label =
          (count === 0 ? "No" : eschgi.formatNumber(count)) +
          (count === 1 ? " contribution" : " contributions") +
          " · " +
          dateFormat.format(date);
        element.title = element.dataset.label;

        // A month's label goes over the week that holds its first day.
        if (date.getUTCDate() === 1 && week - lastLabelWeek >= 3 && week <= weeks - 3) {
          var label = document.createElement("span");
          label.textContent = monthFormat.format(date);
          label.style.gridColumn = week + 1 + " / span 3";
          label.style.gridRow = "1";
          months.appendChild(label);
          lastLabelWeek = week;
        }
      }
      fragment.appendChild(element);
    }
    grid.appendChild(fragment);

    var total = counts.reduce(function (sum, count) {
      return sum + count;
    }, 0);
    grid.setAttribute(
      "aria-label",
      "Contribution calendar: " + eschgi.formatNumber(total) + " contributions over the last year"
    );

    var readout = root.querySelector("[data-calendar-readout]");
    grid.addEventListener("pointerover", function (event) {
      var target = event.target;
      if (target.dataset && target.dataset.label && readout) readout.textContent = target.dataset.label;
    });
    grid.addEventListener("pointerleave", function () {
      if (readout) readout.textContent = "Point at a day";
    });

    renderCalendarFacts(root, counts, start);
    card.hidden = false;

    // On a phone the calendar scrolls; start at the most recent weeks.
    var scroller = root.querySelector(".calendar__scroll");
    window.requestAnimationFrame(function () {
      if (scroller) scroller.scrollLeft = scroller.scrollWidth;
    });
    return true;
  }

  function quartiles(counts) {
    var active = counts
      .filter(function (count) {
        return count > 0;
      })
      .sort(function (a, b) {
        return a - b;
      });
    if (!active.length) return [0, 0, 0];
    function at(fraction) {
      return active[Math.min(active.length - 1, Math.floor(fraction * active.length))];
    }
    return [at(0.25), at(0.5), at(0.75)];
  }

  function levelFor(count, thresholds) {
    if (count <= 0) return "0";
    if (count <= thresholds[0]) return "1";
    if (count <= thresholds[1]) return "2";
    if (count <= thresholds[2]) return "3";
    return "4";
  }

  function renderCalendarFacts(root, counts, start) {
    var facts = root.querySelector("[data-calendar-facts]");
    if (!facts) return;

    var activeDays = 0;
    var longest = 0;
    var run = 0;
    var best = 0;
    var bestDay = -1;
    counts.forEach(function (count, index) {
      if (count > 0) {
        activeDays++;
        run++;
        longest = Math.max(longest, run);
      } else {
        run = 0;
      }
      if (count > best) {
        best = count;
        bestDay = index;
      }
    });

    // The current streak may end yesterday: today is not over yet.
    var current = 0;
    var last = counts.length - 1;
    if (counts[last] === 0) last--;
    for (var i = last; i >= 0 && counts[i] > 0; i--) current++;

    var bestDate = bestDay >= 0 ? new Date(start.getTime() + bestDay * 86400000) : null;
    var items = [
      ["Active days", eschgi.formatNumber(activeDays)],
      ["Longest streak", longest + (longest === 1 ? " day" : " days")],
      ["Current streak", current + (current === 1 ? " day" : " days")],
      [
        "Busiest day",
        best > 0
          ? eschgi.formatNumber(best) +
            " · " +
            bestDate.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
          : "—",
      ],
    ];
    items.forEach(function (pair) {
      var wrapper = document.createElement("div");
      var term = document.createElement("dt");
      term.textContent = pair[0];
      var value = document.createElement("dd");
      value.textContent = pair[1];
      wrapper.appendChild(term);
      wrapper.appendChild(value);
      facts.appendChild(wrapper);
    });
  }

  // -------------------------------------------------------- technology sphere
  // The lists in #stack are the source of truth; each item becomes a tag on a
  // Fibonacci sphere that turns by itself, follows a drag and turns a pointed-at
  // item of the lists to the front.
  function initSphere() {
    var stage = document.querySelector("[data-sphere]");
    if (!stage) return;
    var groups = Array.prototype.slice.call(document.querySelectorAll("[data-stack-group]"));
    if (!groups.length) return;

    var items = [];
    groups.forEach(function (group) {
      Array.prototype.forEach.call(group.querySelectorAll("li"), function (chip) {
        items.push({
          label: chip.textContent.trim(),
          group: group.getAttribute("data-stack-group"),
          weight: Number(chip.getAttribute("data-weight")) || 1,
          chip: chip,
        });
      });
    });

    // A fixed shuffle, so the groups mix over the sphere but the layout never changes.
    var seed = 7;
    function random() {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    }
    for (var i = items.length - 1; i > 0; i--) {
      var j = Math.floor(random() * (i + 1));
      var swap = items[i];
      items[i] = items[j];
      items[j] = swap;
    }

    var count = items.length;
    var golden = Math.PI * (3 - Math.sqrt(5));
    var tags = items.map(function (item, index) {
      var y = 1 - ((index + 0.5) / count) * 2;
      var ring = Math.sqrt(1 - y * y);
      var theta = golden * index;
      var element = document.createElement("span");
      element.className = "sphere__tag";
      element.textContent = item.label;
      element.setAttribute("data-group", item.group);
      element.setAttribute("data-weight", String(item.weight));
      stage.appendChild(element);
      return {
        element: element,
        chip: item.chip,
        group: item.group,
        x: Math.cos(theta) * ring,
        y: y,
        z: Math.sin(theta) * ring,
        dim: false,
      };
    });

    var radius = 0;
    function measure() {
      var size = Math.min(stage.clientWidth, stage.clientHeight);
      radius = size * 0.39;
    }
    measure();
    if ("ResizeObserver" in window) {
      new ResizeObserver(function () {
        measure();
        render();
      }).observe(stage);
    } else {
      window.addEventListener("resize", function () {
        measure();
        render();
      });
    }

    function rotate(ax, ay) {
      var cosX = Math.cos(ax);
      var sinX = Math.sin(ax);
      var cosY = Math.cos(ay);
      var sinY = Math.sin(ay);
      tags.forEach(function (tag) {
        var x = tag.x * cosY + tag.z * sinY;
        var z = -tag.x * sinY + tag.z * cosY;
        var y = tag.y * cosX - z * sinX;
        tag.z = tag.y * sinX + z * cosX;
        tag.x = x;
        tag.y = y;
      });
    }

    // Rodrigues' rotation about the unit axis (kx, ky, 0) by `angle`.
    function rotateAbout(kx, ky, angle) {
      var cos = Math.cos(angle);
      var sin = Math.sin(angle);
      tags.forEach(function (tag) {
        var dot = kx * tag.x + ky * tag.y;
        var crossX = ky * tag.z;
        var crossY = -kx * tag.z;
        var crossZ = kx * tag.y - ky * tag.x;
        var x = tag.x * cos + crossX * sin + kx * dot * (1 - cos);
        var y = tag.y * cos + crossY * sin + ky * dot * (1 - cos);
        var z = tag.z * cos + crossZ * sin;
        tag.x = x;
        tag.y = y;
        tag.z = z;
      });
    }

    function render() {
      tags.forEach(function (tag) {
        var depth = (tag.z + 1) / 2;
        var scale = 0.62 + depth * 0.48;
        var opacity = 0.18 + depth * 0.82;
        if (tag.dim) opacity *= 0.35;
        tag.element.style.transform =
          "translate3d(" +
          (tag.x * radius).toFixed(1) +
          "px," +
          (tag.y * radius).toFixed(1) +
          "px,0) translate(-50%,-50%) scale(" +
          scale.toFixed(3) +
          ")";
        tag.element.style.opacity = opacity.toFixed(3);
        tag.element.style.zIndex = String(Math.round(depth * 100));
      });
    }

    var BASE_X = -0.0012;
    var BASE_Y = 0.0034;
    var velocityX = BASE_X;
    var velocityY = BASE_Y;
    var dragging = false;
    var hovering = false;
    var focused = null;
    var lastX = 0;
    var lastY = 0;
    var lastMove = 0;

    stage.addEventListener("pointerdown", function (event) {
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      lastMove = performance.now();
      velocityX = 0;
      velocityY = 0;
      stage.classList.add("is-dragging");
      try {
        stage.setPointerCapture(event.pointerId);
      } catch (error) {
        /* not every pointer can be captured */
      }
    });
    stage.addEventListener("pointermove", function (event) {
      if (!dragging) return;
      var dx = event.clientX - lastX;
      var dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      var now = performance.now();
      var frames = Math.max(1, (now - lastMove) / 16.7);
      lastMove = now;
      var ax = -dy * 0.0065;
      var ay = dx * 0.0065;
      rotate(ax, ay);
      velocityX = ax / frames;
      velocityY = ay / frames;
      render();
    });
    function endDrag() {
      if (!dragging) return;
      dragging = false;
      stage.classList.remove("is-dragging");
      if (eschgi.reducedMotion || performance.now() - lastMove > 90) {
        velocityX = 0;
        velocityY = 0;
      }
    }
    stage.addEventListener("pointerup", endDrag);
    stage.addEventListener("pointercancel", endDrag);
    stage.addEventListener("pointerenter", function () {
      hovering = true;
    });
    stage.addEventListener("pointerleave", function () {
      hovering = false;
    });

    // A tag pointed at lights up its item in the lists, and the other way round.
    tags.forEach(function (tag) {
      tag.element.addEventListener("pointerenter", function () {
        tag.element.classList.add("is-hot");
      });
      tag.element.addEventListener("pointerleave", function () {
        tag.element.classList.remove("is-hot");
      });
      tag.chip.addEventListener("pointerenter", function () {
        focused = tag;
        tag.element.classList.add("is-hot");
        start();
      });
      tag.chip.addEventListener("pointerleave", function () {
        if (focused === tag) focused = null;
        tag.element.classList.remove("is-hot");
      });
    });

    groups.forEach(function (group) {
      var key = group.getAttribute("data-stack-group");
      group.addEventListener("pointerenter", function () {
        group.classList.add("is-active");
        tags.forEach(function (tag) {
          tag.dim = tag.group !== key;
          tag.element.classList.toggle("is-dim", tag.dim);
        });
        render();
      });
      group.addEventListener("pointerleave", function () {
        group.classList.remove("is-active");
        tags.forEach(function (tag) {
          tag.dim = false;
          tag.element.classList.remove("is-dim");
        });
        render();
      });
    });

    // A pleasant first angle, then the loop while the sphere is on screen.
    rotate(0.35, 0.6);
    render();

    var running = false;
    var visible = false;
    var lastFrame = 0;

    function frame(now) {
      if (!running) return;
      var dt = lastFrame ? Math.min(3, (now - lastFrame) / 16.7) : 1;
      lastFrame = now;

      if (focused) {
        var angle = Math.acos(Math.max(-1, Math.min(1, focused.z)));
        var axisLength = Math.sqrt(focused.y * focused.y + focused.x * focused.x);
        if (angle > 0.003 && axisLength > 1e-6) {
          rotateAbout(focused.y / axisLength, -focused.x / axisLength, angle * Math.min(1, 0.11 * dt));
        }
      } else if (!dragging) {
        if (eschgi.reducedMotion) {
          // No spin of its own: the sphere moves only while it is dragged.
          velocityX = 0;
          velocityY = 0;
        } else {
          var slow = hovering ? 0.3 : 1;
          velocityX += (BASE_X * slow - velocityX) * 0.03 * dt;
          velocityY += (BASE_Y * slow - velocityY) * 0.03 * dt;
        }
        if (velocityX || velocityY) rotate(velocityX * dt, velocityY * dt);
      }
      render();

      var idle = eschgi.reducedMotion && !focused && !dragging;
      if (!visible || document.hidden || idle) {
        running = false;
        return;
      }
      window.requestAnimationFrame(frame);
    }

    function start() {
      if (running || !visible || document.hidden) return;
      running = true;
      lastFrame = 0;
      window.requestAnimationFrame(frame);
    }

    eschgi.watchVisibility(stage, function (isVisible) {
      visible = isVisible;
      if (visible && !eschgi.reducedMotion) start();
    });
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden && !eschgi.reducedMotion) start();
    });
    stage.addEventListener("pointerdown", start);
  }

  // ------------------------------------------------------- live demo card
  // Demo figures that drift a little every couple of seconds, like the app's dashboard.
  function initLiveCard() {
    var card = document.querySelector("[data-live-card]");
    if (!card) return;
    var line = card.querySelector(".live-card__line");
    var area = card.querySelector(".live-card__area");
    var money = card.querySelector("[data-live-money]");
    var change = card.querySelector("[data-live-change]");
    var agentChanges = card.querySelectorAll("[data-agent-change]");
    if (!line || !area) return;

    var WIDTH = 320;
    var HEIGHT = 90;
    var POINTS = 72;
    var first = 67677.32;
    var last = 67763.83;

    var seed = 42;
    function random() {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    }

    // A random walk, bent to start and end at the figures in the markup.
    var walk = [0];
    for (var i = 1; i < POINTS; i++) walk.push(walk[i - 1] + (random() - 0.47) * 40);
    var series = walk.map(function (value, index) {
      var t = index / (POINTS - 1);
      return first + value - walk[POINTS - 1] * t + (last - first) * t;
    });

    var euro = new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" });

    function draw() {
      var min = Math.min.apply(null, series);
      var max = Math.max.apply(null, series);
      var span = max - min || 1;
      var path = series
        .map(function (value, index) {
          var x = (index / (POINTS - 1)) * WIDTH;
          var y = 6 + (1 - (value - min) / span) * (HEIGHT - 12);
          return (index ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
        })
        .join(" ");
      line.setAttribute("d", path);
      area.setAttribute("d", path + " L" + WIDTH + " " + HEIGHT + " L0 " + HEIGHT + " Z");
    }

    function tick() {
      var previous = series[series.length - 1];
      series.push(previous * (1 + (random() - 0.46) * 0.0011));
      series.shift();
      draw();

      var now = series[series.length - 1];
      var delta = now - series[0];
      var percent = (delta / series[0]) * 100;
      if (money) money.textContent = euro.format(now);
      if (change) {
        change.textContent =
          (delta >= 0 ? "+" : "−") + euro.format(Math.abs(delta)) + " " + (delta >= 0 ? "+" : "−") + Math.abs(percent).toFixed(2) + "%";
        change.className = delta >= 0 ? "text-positive" : "text-negative";
      }
      Array.prototype.forEach.call(agentChanges, function (element) {
        var value = parseFloat(element.textContent.replace(/[^\d.-]/g, "")) || 0;
        value = Math.max(0.05, value + (random() - 0.48) * 0.04);
        element.textContent = "+" + value.toFixed(2) + "%";
      });
    }

    draw();
    if (eschgi.reducedMotion) return;

    var timer = 0;
    eschgi.watchVisibility(card, function (visible) {
      window.clearInterval(timer);
      if (visible) timer = window.setInterval(tick, 2200);
    });
  }

  // ---------------------------------------------------------------- AI session
  function initAgentSession() {
    var root = document.querySelector("[data-agent-session]");
    if (!root) return;
    var log = root.querySelector(".agent__log");
    var replay = root.querySelector("[data-agent-replay]");
    var lines = Array.prototype.slice.call(log.children);
    if (!lines.length || eschgi.reducedMotion) return;

    var cursor = document.createElement("li");
    cursor.className = "agent__cursor";
    cursor.innerHTML = '<span class="text-accent">❯</span> <span class="typing-caret"></span>';
    cursor.setAttribute("aria-hidden", "true");

    // The prompt line types itself; find its text after the ❯.
    var promptLine = lines[0];
    var promptText = promptLine.lastChild;
    var promptFull = promptText && promptText.nodeType === 3 ? promptText.nodeValue : null;

    // Keep the finished height so the page does not move during the replay.
    log.appendChild(cursor);
    log.style.minHeight = log.offsetHeight + "px";
    cursor.remove();

    var timers = [];
    function later(ms, fn) {
      timers.push(window.setTimeout(fn, ms));
    }
    var SPINNER = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏";

    function play() {
      timers.forEach(window.clearTimeout);
      timers = [];
      cursor.remove();
      if (replay) replay.hidden = true;
      lines.forEach(function (line) {
        line.classList.add("is-pending");
        line.classList.remove("is-entering");
      });

      var at = 200;
      lines.forEach(function (line, index) {
        later(at, function () {
          line.classList.remove("is-pending");
          line.classList.add("is-entering");
        });

        if (index === 0 && promptFull) {
          later(at, function () {
            promptText.nodeValue = "";
          });
          for (var c = 1; c <= promptFull.length; c++) {
            (function (length) {
              later(at + length * 22, function () {
                promptText.nodeValue = promptFull.slice(0, length);
              });
            })(c);
          }
          at += promptFull.length * 22 + 500;
          return;
        }

        var result = line.hasAttribute("data-run") ? line.querySelector(".agent__result") : null;
        if (result) {
          var finalText = result.textContent;
          var finalClass = result.className;
          later(at, function () {
            result.className = "agent__result is-running";
          });
          for (var s = 0; s < 12; s++) {
            (function (step) {
              later(at + step * 80, function () {
                result.textContent = SPINNER.charAt(step % SPINNER.length) + " running";
              });
            })(s);
          }
          later(at + 960, function () {
            result.className = finalClass;
            result.textContent = finalText;
          });
          at += 1180;
          return;
        }
        at += index === lines.length - 1 ? 300 : 420;
      });

      later(at + 200, function () {
        log.appendChild(cursor);
        if (replay) replay.hidden = false;
      });
    }

    lines.forEach(function (line) {
      line.classList.add("is-pending");
    });
    eschgi.onceVisible(root, play, { threshold: 0.45 });
    if (replay) replay.addEventListener("click", play);
  }

  function setYear() {
    var element = document.querySelector("[data-year]");
    if (element) element.textContent = String(new Date().getFullYear());
  }

  wireNav();
  wireScrollSpy();
  wireReveal();
  typeHeroCode();
  loadStats();
  initSphere();
  initLiveCard();
  initAgentSession();
  setYear();
})();
