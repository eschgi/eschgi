// eschgi.com — the pages' behaviour: navigation, scroll reveal, the GitHub activity on the front
// page and the technology sphere on the Lab page.
//
// A classic deferred script rather than a module, so the pages also work when opened from disk.
// It runs first and shares a few helpers on `window.eschgi` with bugbash.js and terminal.js.
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

  // The front page holds the content: the Lab's sphere and terminal read it from there.
  var homePromise = null;
  eschgi.homeDocument = function () {
    if (document.body.getAttribute("data-page") === "home") return Promise.resolve(document);
    if (!homePromise) {
      homePromise = fetch("index.html", { cache: "no-cache" })
        .then(function (response) {
          if (!response.ok) throw new Error(String(response.status));
          return response.text();
        })
        .then(function (html) {
          return new DOMParser().parseFromString(html, "text/html");
        });
    }
    return homePromise;
  };

  // stats.json, written daily by .github/workflows/stats.yml.
  var statsPromise = null;
  eschgi.loadStats = function () {
    if (!statsPromise) {
      statsPromise = fetch("stats.json", { cache: "no-cache" })
        .then(function (response) {
          if (!response.ok) throw new Error(String(response.status));
          return response.json();
        })
        .then(function (data) {
          if (!data || typeof data !== "object" || !(data.schemaVersion >= 1) || data.placeholder) {
            throw new Error("no stats yet");
          }
          eschgi.stats = data;
          return data;
        });
    }
    return statsPromise;
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
      var href = link.getAttribute("href");
      if (!href || href.charAt(0) !== "#") return;
      var section = document.querySelector(href);
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
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    Array.prototype.forEach.call(elements, function (el) {
      observer.observe(el);
    });
  }

  // ------------------------------------------------------------ GitHub activity
  function renderActivity() {
    var root = document.querySelector("[data-activity]");
    var fact = document.querySelector('[data-fact="contributions"]');
    if (!root && !fact) return;

    eschgi
      .loadStats()
      .then(function (data) {
        var contributions = data.contributions || {};
        if (fact && contributions.lastYearTotal) fact.textContent = eschgi.formatNumber(contributions.lastYearTotal);
        if (!root) return;

        var calendar = data.calendar;
        var counts = calendar && Array.isArray(calendar.counts) && calendar.counts.length ? calendar.counts : null;
        var start = counts && typeof calendar.start === "string" ? new Date(calendar.start + "T00:00:00Z") : null;
        if (start && isNaN(start)) start = null;

        var values = {
          contributions: contributions.lastYearTotal || 0,
          commits: contributions.commits || 0,
          pullRequests: contributions.pullRequests || 0,
          activeDays: counts
            ? counts.filter(function (count) {
                return count > 0;
              }).length
            : null,
        };
        Object.keys(values).forEach(function (key) {
          var element = root.querySelector('[data-stat="' + key + '"]');
          if (!element) return;
          if (values[key] === null) element.parentNode.hidden = true;
          else element.textContent = eschgi.formatNumber(values[key]);
        });

        renderWeeks(root, counts, start);
        renderLanguages(root, data.languages || []);

        var meta = root.querySelector("[data-stats-meta]");
        var updated = data.generatedAt ? new Date(data.generatedAt) : null;
        if (meta && updated && !isNaN(updated)) {
          meta.textContent =
            "Updated " +
            updated.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) +
            " · github.com/" +
            (data.login || "eschgi");
        }

        root.hidden = false;
        var fallback = document.querySelector("[data-stats-fallback]");
        if (fallback) fallback.hidden = true;
      })
      .catch(function () {
        /* the fallback line with the profile link stays */
      });
  }

  // One bar a week, Sunday to Saturday, as GitHub's calendar counts them.
  function renderWeeks(root, counts, start) {
    var bars = root.querySelector("[data-weeks]");
    var figure = bars && bars.closest("figure");
    if (!bars) return;
    if (!counts || !start) {
      if (figure) figure.hidden = true;
      return;
    }

    var dayMs = 86400000;
    var offset = start.getUTCDay();
    var weeks = [];
    counts.forEach(function (count, index) {
      var week = Math.floor((index + offset) / 7);
      if (!weeks[week]) {
        weeks[week] = { total: 0, first: new Date(start.getTime() + index * dayMs) };
      }
      weeks[week].total += count || 0;
    });

    var busiest = weeks.reduce(function (max, week) {
      return Math.max(max, week.total);
    }, 0);
    var dayFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    var monthFormat = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
    var readout = root.querySelector("[data-weeks-readout]");
    var range = root.querySelector("[data-weeks-range]");
    var resting = "Contributions per week, last 12 months";

    var fragment = document.createDocumentFragment();
    weeks.forEach(function (week, index) {
      var bar = document.createElement("span");
      bar.style.height = busiest ? (week.total / busiest) * 100 + "%" : "0";
      if (!week.total) bar.className = "is-empty";
      if (index === weeks.length - 1) bar.classList.add("is-latest");
      var label =
        "Week of " +
        dayFormat.format(week.first) +
        ": " +
        (week.total ? eschgi.formatNumber(week.total) : "no") +
        (week.total === 1 ? " contribution" : " contributions");
      bar.title = label;
      bar.setAttribute("data-label", label);
      fragment.appendChild(bar);
    });
    bars.appendChild(fragment);
    bars.setAttribute(
      "aria-label",
      "Contributions per week over the last twelve months; the busiest week had " + eschgi.formatNumber(busiest) + "."
    );

    if (readout) {
      readout.textContent = resting;
      bars.addEventListener("pointerover", function (event) {
        var label = event.target.getAttribute && event.target.getAttribute("data-label");
        if (label) readout.textContent = label;
      });
      bars.addEventListener("pointerleave", function () {
        readout.textContent = resting;
      });
    }
    if (range) {
      var end = new Date(start.getTime() + (counts.length - 1) * dayMs);
      range.textContent = monthFormat.format(start) + " – " + monthFormat.format(end);
    }
  }

  function renderLanguages(root, languages) {
    var line = root.querySelector("[data-languages]");
    if (!line) return;
    var top = languages
      .filter(function (language) {
        return language && language.name && language.percent > 0;
      })
      .slice(0, 5);
    if (!top.length) {
      line.hidden = true;
      return;
    }
    line.textContent = "Most code in ";
    top.forEach(function (language, index) {
      if (index) line.appendChild(document.createTextNode(" · "));
      var name = document.createElement("b");
      name.textContent = language.name;
      line.appendChild(name);
      line.appendChild(document.createTextNode(" " + language.percent.toFixed(1) + "%"));
    });
  }

  // -------------------------------------------------------- technology sphere
  // On the Lab page. The front page's expertise lists are the source; each item becomes a
  // tag on a Fibonacci sphere that turns by itself and follows a drag, and pointing at a
  // group in the legend lights its tags up.
  function initSphere() {
    var stage = document.querySelector("[data-sphere]");
    if (!stage) return;
    var legend = document.querySelector("[data-sphere-legend]");

    eschgi
      .homeDocument()
      .then(function (doc) {
        buildSphere(stage, legend, doc);
      })
      .catch(function () {
        if (legend) legend.innerHTML = '<li>The lists live on the <a href="./#expertise">front page</a>.</li>';
      });
  }

  function buildSphere(stage, legend, doc) {
    var groups = Array.prototype.slice.call(doc.querySelectorAll("[data-stack-group]"));
    if (!groups.length) return;

    var items = [];
    groups.forEach(function (group) {
      var key = group.getAttribute("data-stack-group");
      var title = group.querySelector("h3");
      var entries = group.querySelectorAll("li");
      Array.prototype.forEach.call(entries, function (entry) {
        items.push({ label: entry.textContent.trim(), group: key, weight: Number(entry.getAttribute("data-weight")) || 1 });
      });
      if (legend) {
        var row = document.createElement("li");
        row.setAttribute("data-group", key);
        var swatch = document.createElement("span");
        swatch.className = "swatch";
        swatch.setAttribute("aria-hidden", "true");
        var name = document.createElement("span");
        name.textContent = title ? title.textContent.trim() : key;
        var size = document.createElement("b");
        size.textContent = String(entries.length);
        row.appendChild(swatch);
        row.appendChild(name);
        row.appendChild(size);
        legend.appendChild(row);
      }
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
      element.addEventListener("pointerenter", function () {
        element.classList.add("is-hot");
      });
      element.addEventListener("pointerleave", function () {
        element.classList.remove("is-hot");
      });
      return { element: element, group: item.group, x: Math.cos(theta) * ring, y: y, z: Math.sin(theta) * ring, dim: false };
    });

    var radius = 0;
    function measure() {
      radius = Math.min(stage.clientWidth, stage.clientHeight) * 0.39;
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

    measure();
    if ("ResizeObserver" in window) {
      new ResizeObserver(function () {
        measure();
        render();
      }).observe(stage);
    }

    var BASE_X = -0.0012;
    var BASE_Y = 0.0034;
    var velocityX = BASE_X;
    var velocityY = BASE_Y;
    var dragging = false;
    var hovering = false;
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
      start();
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

    if (legend) {
      Array.prototype.forEach.call(legend.querySelectorAll("li[data-group]"), function (row) {
        var key = row.getAttribute("data-group");
        row.addEventListener("pointerenter", function () {
          row.classList.add("is-active");
          tags.forEach(function (tag) {
            tag.dim = tag.group !== key;
            tag.element.classList.toggle("is-dim", tag.dim);
          });
          render();
        });
        row.addEventListener("pointerleave", function () {
          row.classList.remove("is-active");
          tags.forEach(function (tag) {
            tag.dim = false;
            tag.element.classList.remove("is-dim");
          });
          render();
        });
      });
    }

    rotate(0.35, 0.6);
    render();

    var running = false;
    var visible = false;
    var lastFrame = 0;

    function frame(now) {
      if (!running) return;
      var dt = lastFrame ? Math.min(3, (now - lastFrame) / 16.7) : 1;
      lastFrame = now;
      if (!dragging) {
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
      if (!visible || document.hidden || (eschgi.reducedMotion && !dragging)) {
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
  }

  function setYear() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-year]"), function (element) {
      element.textContent = String(new Date().getFullYear());
    });
  }

  wireNav();
  wireScrollSpy();
  wireReveal();
  renderActivity();
  initSphere();
  setYear();
})();
