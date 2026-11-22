// Checks the German and Italian in docs/js/i18n.js against the pages and scripts that use them.
//
// The English is the key (see i18n.js): every text marked data-i18n in docs/*.html, every attribute
// named in a data-i18n-attr, and every literal passed to t("…") in docs/js/*.js needs its German and
// Italian. Reports English with no translation, translations whose {placeholders} or markup differ
// from the English, incomplete forms by number, keys given twice, and entries nothing uses any more.
//
// Node 18 or later, no dependencies.
//   node scripts/check-i18n.mjs            exits with 1 if anything is missing or wrong
//   node scripts/check-i18n.mjs --missing  also prints the missing entries, ready to fill in
import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOCS = join(ROOT, "docs");
const CATALOG = join(DOCS, "js", "i18n.js");
const LANGUAGES = ["de", "it"];
const FORMS = ["one", "other"];
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
const TAG = /<(\/?)([a-zA-Z][\w:-]*)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*)\s*(\/?)>/g;
const ATTRIBUTE = /([^\s=>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", mdash: "—", ndash: "–", hellip: "…", rarr: "→", larr: "←", uarr: "↑", darr: "↓", times: "×", copy: "©" };

const errors = [];
const warnings = [];

// ------------------------------------------------------------------ the catalog
// i18n.js runs as it would in a page, on a stand-in document with nothing in it.
async function loadCatalog() {
  const code = await readFile(CATALOG, "utf8");
  const noop = () => {};
  const element = { getAttribute: () => null, setAttribute: noop, removeAttribute: noop, hasAttribute: () => false, classList: { add: noop, remove: noop } };
  const document = { documentElement: element, querySelectorAll: () => [], querySelector: () => null, addEventListener: noop, dispatchEvent: noop };
  const window = { document, localStorage: { getItem: () => null, setItem: noop }, addEventListener: noop };
  window.window = window;
  vm.runInNewContext(code, { window, document, CustomEvent: class {}, console }, { filename: "docs/js/i18n.js" });
  const strings = window.eschgi && window.eschgi.i18n && window.eschgi.i18n.strings;
  if (!strings) throw new Error("docs/js/i18n.js has no eschgi.i18n.strings");

  // An object literal keeps the last of two equal keys without a word, so they are looked for here.
  const start = code.indexOf("var STRINGS = {");
  const end = code.indexOf("\n  };", start);
  const seen = new Map();
  code
    .slice(start, end)
    .split("\n")
    .forEach((text, index) => {
      const match = /^\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*:/.exec(text);
      if (!match) return;
      const key = parseLiteral(match[1]);
      const line = lineAt(code, start) + index;
      if (seen.has(key)) errors.push(`i18n.js:${line}: given twice (first at line ${seen.get(key)}): ${show(key)}`);
      else seen.set(key, line);
    });
  return strings;
}

// ------------------------------------------------------------------ the pages
// The key of a page text is its HTML as the browser gives it back (innerHTML), with the white
// space collapsed; serialize() writes a piece of source HTML that way.
function decode(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, name) => {
    if (name[0] === "#") return String.fromCodePoint(name[1] === "x" || name[1] === "X" ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10));
    return ENTITIES[name] !== undefined ? ENTITIES[name] : match;
  });
}

function escapeText(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/ /g, "&nbsp;");
}

function escapeAttribute(text) {
  return text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/ /g, "&nbsp;");
}

function attributesOf(text) {
  const list = [];
  for (const match of text.matchAll(ATTRIBUTE)) {
    const value = match[2] !== undefined ? match[2] : match[3] !== undefined ? match[3] : match[4] !== undefined ? match[4] : "";
    list.push([match[1].toLowerCase(), decode(value)]);
  }
  return list;
}

function serialize(html) {
  let out = "";
  let last = 0;
  for (const match of html.matchAll(TAG)) {
    out += escapeText(decode(html.slice(last, match.index)));
    const name = match[2].toLowerCase();
    if (match[1]) out += `</${name}>`;
    else out += `<${name}` + attributesOf(match[3]).map(([key, value]) => ` ${key}="${escapeAttribute(value)}"`).join("") + ">";
    last = match.index + match[0].length;
  }
  return out + escapeText(decode(html.slice(last)));
}

function keyOf(html) {
  return html.replace(/\s+/g, " ").trim();
}

// Comments and scripts are blanked, keeping their line breaks, so nothing in them is read as a tag.
function blank(html) {
  const spaces = (text) => text.replace(/[^\n]/g, " ");
  return html
    .replace(/<!--[\s\S]*?-->/g, spaces)
    .replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)/gi, (match, open, body, close) => open + spaces(body) + close);
}

function pageTexts(file, html) {
  const source = blank(html);
  const tags = [...source.matchAll(TAG)];
  const texts = [];
  tags.forEach((tag, index) => {
    if (tag[1]) return;
    const attributes = new Map(attributesOf(tag[3]));
    const where = `${file}:${lineAt(source, tag.index)}`;
    if (attributes.has("data-i18n-attr")) {
      attributes
        .get("data-i18n-attr")
        .split(/\s+/)
        .filter(Boolean)
        .forEach((name) => {
          if (!attributes.has(name)) errors.push(`${where}: data-i18n-attr names ${name}, which the element doesn't have`);
          else texts.push({ key: keyOf(attributes.get(name)), where, page: true });
        });
    }
    if (!attributes.has("data-i18n")) return;
    const name = tag[2].toLowerCase();
    if (VOID.has(name) || tag[4]) return errors.push(`${where}: <${name}> has no content for data-i18n`);
    let depth = 1;
    for (let next = index + 1; next < tags.length; next++) {
      if (tags[next][2].toLowerCase() !== name) continue;
      depth += tags[next][1] ? -1 : 1;
      if (depth === 0) {
        texts.push({ key: keyOf(serialize(source.slice(tag.index + tag[0].length, tags[next].index))), where, page: true });
        return;
      }
    }
    errors.push(`${where}: <${name} data-i18n> is never closed`);
  });
  return texts;
}

// ------------------------------------------------------------------ the scripts
function parseLiteral(literal) {
  const quote = literal[0];
  let out = "";
  for (let i = 1; i < literal.length - 1; i++) {
    const c = literal[i];
    if (c !== "\\") {
      out += c;
      continue;
    }
    const n = literal[++i];
    if (n === "n") out += "\n";
    else if (n === "t") out += "\t";
    else if (n === "u") {
      out += String.fromCharCode(parseInt(literal.slice(i + 1, i + 5), 16));
      i += 4;
    } else out += n;
  }
  if (literal[literal.length - 1] !== quote) throw new Error(`not a string literal: ${literal}`);
  return out;
}

function scriptTexts(file, code) {
  const texts = [];
  for (const match of code.matchAll(/\bt\(\s*("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')/g)) {
    texts.push({ key: parseLiteral(match[1]), where: `${file}:${lineAt(code, match.index)}`, page: false });
  }
  return texts;
}

// ------------------------------------------------------------------ the checks
function lineAt(text, index) {
  return text.slice(0, index).split("\n").length;
}

function show(text) {
  return JSON.stringify(text.length > 110 ? text.slice(0, 107) + "…" : text);
}

function placeholders(text) {
  return [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

function markup(text) {
  return [...text.matchAll(TAG)].map((match) => serialize(match[0])).sort();
}

function same(a, b) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function checkText(use, english, translated, label) {
  if (typeof translated !== "string" || !translated.trim()) {
    errors.push(`${use.where}: ${label} is empty: ${show(use.key)}`);
    return;
  }
  // A form for one may say "one" instead of {count}.
  const counted = label.endsWith(".one") ? (list) => list.filter((name) => name !== "count") : (list) => list;
  const wanted = counted(placeholders(english));
  const found = counted(placeholders(translated));
  if (!same(wanted, found)) {
    errors.push(`${use.where}: ${label} has {${found.join("}, {")}}, the English {${wanted.join("}, {")}}: ${show(use.key)}`);
  }
  if (!same(markup(english), markup(translated))) {
    errors.push(`${use.where}: ${label} has other markup than the English: ${show(translated)}`);
  }
}

function checkEntry(use, entry) {
  Object.keys(entry).forEach((lang) => {
    if (lang !== "en" && !LANGUAGES.includes(lang)) errors.push(`${use.where}: unknown language "${lang}": ${show(use.key)}`);
  });
  if (entry.en !== undefined) {
    if (use.page) errors.push(`${use.where}: page text takes its English from the page, not from "en": ${show(use.key)}`);
    if (typeof entry.en !== "object" || FORMS.some((form) => typeof entry.en[form] !== "string")) {
      return errors.push(`${use.where}: "en" is only for forms by number, { one, other }: ${show(use.key)}`);
    }
    // The key is what shows when i18n.js isn't there, so it is the English for many.
    if (entry.en.other !== use.key) errors.push(`${use.where}: the key should be the English "other" form: ${show(use.key)}`);
  }
  LANGUAGES.forEach((lang) => {
    const value = entry[lang];
    if (value === undefined) return errors.push(`${use.where}: no ${lang === "de" ? "German" : "Italian"}: ${show(use.key)}`);
    if (entry.en === undefined) return checkText(use, use.key, value, lang);
    if (typeof value !== "object") return errors.push(`${use.where}: ${lang} needs forms by number, { one, other }: ${show(use.key)}`);
    FORMS.forEach((form) => checkText(use, entry.en[form], value[form], `${lang}.${form}`));
  });
}

async function main() {
  const strings = await loadCatalog();
  const uses = [];
  for (const name of (await readdir(DOCS)).filter((name) => name.endsWith(".html")).sort()) {
    uses.push(...pageTexts(name, await readFile(join(DOCS, name), "utf8")));
  }
  for (const name of (await readdir(join(DOCS, "js"))).filter((name) => name.endsWith(".js") && name !== "i18n.js").sort()) {
    uses.push(...scriptTexts(`js/${name}`, await readFile(join(DOCS, "js", name), "utf8")));
  }

  const used = new Set();
  const missing = [];
  uses.forEach((use) => {
    if (used.has(use.key)) return;
    used.add(use.key);
    const entry = Object.prototype.hasOwnProperty.call(strings, use.key) ? strings[use.key] : null;
    if (!entry) {
      missing.push(use);
      errors.push(`${use.where}: no translation: ${show(use.key)}`);
    } else {
      checkEntry(use, entry);
    }
  });
  Object.keys(strings).forEach((key) => {
    if (!used.has(key)) warnings.push(`i18n.js: no longer used: ${show(key)}`);
  });

  warnings.forEach((text) => console.warn("warning  " + text));
  errors.forEach((text) => console.error("error    " + text));
  if (process.argv.includes("--missing") && missing.length) {
    console.log("\n// Missing, in the order the pages and scripts use them:");
    missing.forEach((use) => console.log(`  // ${use.where}\n  ${JSON.stringify(use.key)}: { de: "", it: "" },`));
  }
  console.log(
    `${used.size} texts, ${Object.keys(strings).length} entries: ${errors.length} error${errors.length === 1 ? "" : "s"}, ` +
      `${warnings.length} warning${warnings.length === 1 ? "" : "s"}.`
  );
  process.exitCode = errors.length ? 1 : 0;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
