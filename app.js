// The bot's mini app (ADR-0101): a shell of sections, no backend, no build
// step. The web_app button opens the root (MINIAPP_URL) with v — the section
// — and l — the language; the rest of the query belongs to the section. The
// wallet (ADR-0099, wallet.js) is the only section for now and the default.
// A new section — its file next to this one, its <section> in index.html and
// a line in `sections`.

import { wallet } from './wallet.js';

const tg = window.Telegram?.WebApp;
const query = new URLSearchParams(window.location.search);
const sections = new Map([['wallet', wallet]]);

function language() {
  const code = query.get('l') ?? '';
  return /^[a-z]{2}(?:-[a-z]{2,4})?$/.test(code) ? code : 'ru';
}

const lang = language();
// What a section gets: texts go in as textContent only.
const shell = {
  tg,
  query,
  lang,
  // Latin digits in Arabic, as the bot writes them (src/tg/render.ts).
  locale: lang === 'ar' ? 'ar-u-nu-latn' : lang,
  inTelegram: tg !== undefined && tg.initData !== '',
  text: (name) => (query.get(name) ?? '').slice(0, 300),
};

function start() {
  if (lang === 'ar') document.documentElement.dir = 'rtl';
  document.documentElement.lang = lang;
  const asked = query.get('v') ?? '';
  const name = sections.has(asked) ? asked : 'wallet';
  const root = document.getElementById(name);
  sections.get(name)(root, shell);
  root.hidden = false;
  document.getElementById('app').hidden = false;
  tg?.ready();
  tg?.expand();
}

start();
