// lang.js — language toggle for diorama, markdown, and home pages

var KEY = "garden-lang";
var ALL_LANGS = ["en", "ru", "zh"];

function getDefault() {
  // URL hash first
  var hash = location.hash.replace("#", "");
  if (hash && ALL_LANGS.indexOf(hash) !== -1) {
    return hash;
  }
  // localStorage
  try {
    var stored = localStorage.getItem(KEY);
    if (stored && ALL_LANGS.indexOf(stored) !== -1) {
      return stored;
    }
  } catch (e) {}
  // browser language
  var nav = (navigator.language || "").slice(0, 2).toLowerCase();
  if (ALL_LANGS.indexOf(nav) !== -1) {
    return nav;
  }
  // default
  return "en";
}

function pageLangs() {
  var langs = {};
  document.querySelectorAll("[lang]").forEach(function (el) {
    if (el.tagName === "HTML") return;
    langs[el.getAttribute("lang")] = true;
  });
  return Object.keys(langs);
}

function setLang(lang, persist) {
  // check if page has this language; if not, fall back without persisting
  var available = pageLangs();
  if (available.length > 0 && available.indexOf(lang) === -1) {
    lang = available[0];
    persist = false;
  }
  // articles
  document.querySelectorAll("article[lang]").forEach(function (el) {
    el.classList.toggle("hidden", el.getAttribute("lang") !== lang);
  });
  // all elements with lang attribute (paragraphs, spans, etc.)
  document.querySelectorAll("main [lang], footer [lang], button [lang]").forEach(function (el) {
    el.style.display = el.getAttribute("lang") === lang ? "" : "none";
  });
  // also hide/show top-level lang paragraphs in main
  document.querySelectorAll("main > [lang]").forEach(function (el) {
    el.style.display = el.getAttribute("lang") === lang ? "" : "none";
  });
  // nav link spans
  document.querySelectorAll("nav ul a").forEach(function (a) {
    var spans = a.querySelectorAll("span[lang]");
    if (spans.length === 0) return;
    var match = a.querySelector('span[lang="' + lang + '"]');
    spans.forEach(function (s) {
      s.style.display = "none";
    });
    if (match) {
      match.style.display = "";
    } else {
      spans[0].style.display = "";
    }
  });
  // toggle buttons
  document.querySelectorAll(".lang-toggle button").forEach(function (btn) {
    btn.classList.toggle("active", btn.getAttribute("data-lang") === lang);
  });
  // persist only when language is actually available on this page
  if (persist !== false) {
    try {
      localStorage.setItem(KEY, lang);
    } catch (e) {}
  }
}

document.addEventListener("DOMContentLoaded", function () {
  // bind toggle buttons
  document.querySelectorAll(".lang-toggle button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      setLang(btn.getAttribute("data-lang"));
    });
  });

  // ambient play/pause
  var audio = document.getElementById("ambient");
  var ambientBtn = document.getElementById("ambient-play");
  if (audio && ambientBtn) {
    ambientBtn.addEventListener("click", function () {
      if (audio.paused) {
        audio.play();
        ambientBtn.classList.add("playing");
        ambientBtn.textContent = "pause";
      } else {
        audio.pause();
        ambientBtn.classList.remove("playing");
        ambientBtn.textContent = "enter";
      }
    });
  }

  // init
  var lang = getDefault();
  setLang(lang);
});
