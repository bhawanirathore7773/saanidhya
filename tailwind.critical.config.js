/**
 * Second, tiny build: only the classes used by the header, hero, mobile bar and
 * base layout. Its output (public/static/css/critical.css) is inlined in <head>, so the
 * first screen paints without waiting for the full stylesheet.
 */
const base = require("./tailwind.config.js");

module.exports = {
  ...base,
  content: [
    "./views/base.html",
    "./views/includes/header.html",
    "./views/includes/mobile_bar.html",
    "./views/includes/hero*.html",
    "./views/home/trust_bar.html",
    "./views/includes/breadcrumbs.html",
    "./views/**/hero*.html",
  ],
};
