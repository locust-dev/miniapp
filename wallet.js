// The wallet section of the mini app (ADR-0099, v=wallet). Everything it
// shows comes from the query the bot put into the web_app button
// (src/tg/pay/wallet-app.ts): b — balance in kopecks, e — end of the links
// (Unix seconds), h c s q n x — texts from locales/*.ftl,
// o=<rub>~<stars>~<invoice link> per sum, p=<rub>~<Prodamus link> (not sent
// until ADR-0097 intake works). Texts go in as textContent only; links are
// opened only when they match the Telegram invoice or the Prodamus pattern.

const starLink = /^https:\/\/t\.me\/(?:\$|invoice\/)[A-Za-z0-9_-]+$/;
const sbpLink = /^https:\/\/[a-z0-9-]{1,63}\.payform\.ru\/\?[^\s#]+$/;
const number = /^[1-9][0-9]{0,6}$/;
// b (kopecks) and e (Unix seconds) are longer.
const digits = /^[0-9]{1,12}$/;

const byId = (id) => document.getElementById(id);

// The shell (app.js) and what start() read from it.
let shell;
let methods = { stars: [], sbp: [] };
let expiresAt = 0;
let method = 'stars';
let busy = false;

const format = (value, fraction = 0) =>
  new Intl.NumberFormat(shell.locale, {
    maximumFractionDigits: fraction,
  }).format(value);

// o and p: only well-formed entries, in the bot's order.
function sums(name, link) {
  const found = [];
  for (const entry of shell.query.getAll(name)) {
    const parts = entry.split('~');
    const [rub = '', stars = '', url = ''] =
      parts.length === 3 ? parts : [parts[0], '', parts[1]];
    if (!number.test(rub) || !link.test(url)) continue;
    if (stars !== '' && !number.test(stars)) continue;
    found.push({ rub: Number(rub), stars: Number(stars), url });
  }
  return found;
}

const expired = () => Date.now() / 1000 >= expiresAt;

function pay(sum) {
  const { tg } = shell;
  if (busy || !shell.inTelegram) return;
  if (expired()) return render();
  if (method === 'sbp') return tg.openLink(sum.url);
  busy = true;
  tg.openInvoice(sum.url, (status) => {
    busy = false;
    // Paid: the bot credits the balance and says so in the chat; the shown
    // balance is stale and the link is spent.
    if (status !== 'paid') return;
    tg.HapticFeedback?.notificationOccurred('success');
    tg.close();
  });
}

function sumButton(sum) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'sum';
  const rub = document.createElement('b');
  rub.textContent = `+${format(sum.rub)}`;
  const price = document.createElement('span');
  price.textContent = method === 'stars' ? `⭐ ${format(sum.stars)}` : '₽';
  button.append(rub, price);
  button.disabled = !shell.inTelegram;
  button.addEventListener('click', () => pay(sum));
  return button;
}

function render() {
  const over = expired();
  byId('sums').replaceChildren(...(over ? [] : methods[method].map(sumButton)));
  byId('expired').hidden = !over;
  byId('stars').classList.toggle('active', method === 'stars');
  byId('sbp').classList.toggle('active', method === 'sbp');
}

function choose(next) {
  if (methods[next].length === 0) return;
  method = next;
  render();
}

/** Fills the wallet <section>; the shell shows it. */
export function wallet(_root, given) {
  shell = given;
  const { query, text } = shell;
  methods = { stars: sums('o', starLink), sbp: sums('p', sbpLink) };
  expiresAt = digits.test(query.get('e') ?? '') ? Number(query.get('e')) : 0;
  document.title = text('h');
  byId('title').textContent = text('h');
  const kopecks = digits.test(query.get('b') ?? '')
    ? Number(query.get('b'))
    : 0;
  byId('credits').textContent = format(kopecks / 100, 2);
  byId('label').textContent = text('c');
  byId('stars').textContent = text('s');
  byId('sbp-name').textContent = text('q');
  // Prodamus stays dark until the bot sends its links (ADR-0097).
  byId('soon').textContent = methods.sbp.length === 0 ? text('n') : '';
  byId('sbp').disabled = methods.sbp.length === 0;
  byId('expired').textContent = text('x');
  byId('stars').addEventListener('click', () => choose('stars'));
  byId('sbp').addEventListener('click', () => choose('sbp'));
  render();
}
