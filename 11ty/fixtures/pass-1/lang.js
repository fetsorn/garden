// lang.js — language toggle for diorama and markdown pages

var KEY = "garden-lang";

function getDefault() {
  // URL hash first: index.html#ru
  var hash = location.hash.replace("#", "");
  if (hash && document.querySelector('article[lang="' + hash + '"]')) {
    return hash;
  }
  // localStorage
  try {
    var stored = localStorage.getItem(KEY);
    if (stored && document.querySelector('article[lang="' + stored + '"]')) {
      return stored;
    }
  } catch (e) {}
  // browser language
  var nav = (navigator.language || "").slice(0, 2).toLowerCase();
  if (document.querySelector('article[lang="' + nav + '"]')) {
    return nav;
  }
  // first available article
  var first = document.querySelector("article[lang]");
  return first ? first.getAttribute("lang") : null;
}

function setLang(lang) {
  // articles
  document.querySelectorAll("article[lang]").forEach(function (el) {
    el.classList.toggle("active", el.getAttribute("lang") === lang);
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
      // fallback: show first span
      spans[0].style.display = "";
    }
  });
  // toggle buttons
  document.querySelectorAll(".lang-toggle button").forEach(function (btn) {
    btn.classList.toggle("active", btn.getAttribute("data-lang") === lang);
  });
  // persist
  try {
    localStorage.setItem(KEY, lang);
  } catch (e) {}
  location.hash = lang;
}

// bind toggle buttons
document.querySelectorAll(".lang-toggle button").forEach(function (btn) {
  btn.addEventListener("click", function () {
    setLang(btn.getAttribute("data-lang"));
  });
});

// ambient play/pause
var audio = document.getElementById("ambient");
var btn = document.getElementById("ambient-play");
if (audio && btn) {
  btn.addEventListener("click", function () {
    if (audio.paused) {
      audio.play();
      btn.classList.add("playing");
      btn.textContent = "pause";
    } else {
      audio.pause();
      btn.classList.remove("playing");
      btn.textContent = "enter";
    }
  });
}

// init
var lang = getDefault();
if (lang) setLang(lang);
