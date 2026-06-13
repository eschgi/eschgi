// Terminal portfolio — small, dependency-free enhancements.
(function () {
  "use strict";

  // Footer year
  var yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  // Typed hero tagline (cycles through phrases).
  var target = document.getElementById("typed");
  if (!target) return;

  var phrases = [
    "Software Developer",
    "C# · C++ · Python",
    "ASP.NET Core · gRPC · EF Core",
    "PostgreSQL · Qt · Docker",
    "~2 decades of building things",
  ];

  var prefersReduced =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Respect reduced-motion: show a static line, no animation.
  if (prefersReduced) {
    target.textContent = phrases[0];
    return;
  }

  var TYPE_SPEED = 70; // ms per char while typing
  var ERASE_SPEED = 35; // ms per char while erasing
  var HOLD_TIME = 1600; // ms to hold a complete phrase

  var phraseIndex = 0;
  var charIndex = 0;
  var erasing = false;

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
