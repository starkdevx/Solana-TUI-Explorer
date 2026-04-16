// =============================================
// SOLANA TERMINAL — App Logic
// =============================================

/* ── Helpers ──────────────────────────────── */
const fmt = {
  price(v, decimals = null) {
    if (v >= 1000) return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (v >= 1)    return '$' + v.toFixed(decimals ?? 4);
    if (v >= 0.01) return '$' + v.toFixed(decimals ?? 5);
    return '$' + v.toPrecision(4);
  },
  pct(v, showSign = true) {
    const s = showSign && v > 0 ? '+' : '';
    return s + v.toFixed(2) + '%';
  },
  chg(v, decimals = 2) {
    const s = v > 0 ? '+' : '';
    if (Math.abs(v) >= 1000) return s + v.toLocaleString('en-US', { maximumFractionDigits: 0 });
    return s + v.toFixed(decimals);
  },
  num(v) {
    if (typeof v === 'string') return v;
    return v.toLocaleString('en-US');
  },
  time(d) {
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  },
  date(d) {
    return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
  },
  colorClass(v) {
    if (v > 0) return 'up';
    if (v < 0) return 'down';
    return 'flat';
  },
  arrowUp: '▲', arrowDown: '▼', arrowFlat: '─'
};

/* ── Clock ────────────────────────────────── */
function updateClock() {
  const now = new Date();
  document.getElementById('clock').textContent =
    fmt.date(now) + '  ' + fmt.time(now) + '  IST';
}
setInterval(updateClock, 1000);
updateClock();

/* ── Tab Navigation ───────────────────────── */
const panels = ['market', 'price', 'wallet', 'token', 'news', 'live', 'alerts'];

function showPanel(id) {
  // Nav tabs
  document.querySelectorAll('.nav-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.panel === id);
  });
  // Panel views
  document.querySelectorAll('.panel-view').forEach(p => {
    p.classList.toggle('active', p.id === 'panel-' + id);
  });
  // Update command hint
  const hints = {
    market:  'st market   |   st price <TOKEN>   |   st top',
    price:   'st price SOL   |   st price BONK   |   st price <TOKEN>',
    wallet:  'st wallet <ADDRESS>   |   st wallet me',
    token:   'st token <MINT>   |   st token BONK',
    news:    'st news   |   st news --filter=whale   |   st news --live',
    live:    'st live SOL   |   st live --all   |   st live --filter=whale',
    alerts:  'st alerts   |   st alerts add SOL>150   |   st alerts clear',
  };
  document.getElementById('cmd-hint').textContent = hints[id] || '';
}

document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => showPanel(tab.dataset.panel));
});

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  if (document.activeElement === document.getElementById('cmd-input')) {
    if (e.key === 'Enter') handleCmd();
    if (e.key === 'Escape') {
      document.getElementById('cmd-input').blur();
      document.getElementById('cmd-input').value = '';
    }
    return;
  }
  const map = { F1:'market', F2:'price', F3:'wallet', F4:'token', F5:'news', F6:'live', F7:'alerts' };
  if (map[e.key]) { e.preventDefault(); showPanel(map[e.key]); }
  if (e.key === '/') {
    e.preventDefault();
    document.getElementById('cmd-input').focus();
  }
});

document.querySelectorAll('.fkey-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const p = btn.dataset.panel;
    if (p) showPanel(p);
  });
});

/* ── Command Input ────────────────────────── */
function handleCmd() {
  const raw = document.getElementById('cmd-input').value.trim().toLowerCase();
  if (!raw) return;

  const parts = raw.replace(/^st\s*/, '').split(/\s+/);
  const cmd = parts[0];
  const arg = parts[1];

  document.getElementById('cmd-input').value = '';

  if (['price', 'prices', 'market'].includes(cmd) && !arg) { showPanel('market'); return; }
  if (cmd === 'price' && arg) { showPanel('price'); return; }
  if (cmd === 'wallet') { showPanel('wallet'); return; }
  if (cmd === 'token') { showPanel('token'); return; }
  if (cmd === 'news') { showPanel('news'); return; }
  if (cmd === 'live') { showPanel('live'); return; }
  if (cmd === 'alerts' || cmd === 'alert') { showPanel('alerts'); return; }
  if (cmd === 'top' || cmd === 'movers') { showPanel('market'); return; }

  // Default: flash the input
  const input = document.getElementById('cmd-input');
  input.placeholder = `Unknown command: "${raw}" — try st price, st wallet, st news`;
  setTimeout(() => input.placeholder = 'Type a command or press / to focus...', 2500);
}

/* ── Market Panel ─────────────────────────── */
function buildMarketPanel() {
  // Stats bar
  const solData = DATA.market.find(d => d.symbol === 'SOL');
  document.getElementById('sol-price').textContent = fmt.price(solData.price, 2);
  const sp = document.getElementById('sol-pct');
  sp.textContent = fmt.pct(solData.pct);
  sp.className = fmt.colorClass(solData.pct);

  // Main market table
  const tbody = document.getElementById('market-tbody');
  tbody.innerHTML = '';
  DATA.market.forEach((d, i) => {
    const tr = document.createElement('tr');
    if (i === 0) tr.classList.add('hl-row');
    const cc = fmt.colorClass(d.pct);
    const arrow = d.pct > 0 ? fmt.arrowUp : d.pct < 0 ? fmt.arrowDown : fmt.arrowFlat;
    const spark = DATA.sparklines[d.symbol] || '▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄';
    tr.innerHTML = `
      <td class="sym">${d.symbol}</td>
      <td class="down" style="color:var(--text-dim); font-size:10px;">${d.name}</td>
      <td style="text-align:right; font-weight:600; color:var(--text-bright)">${fmt.price(d.price, 2)}</td>
      <td class="${cc} td-right">${arrow} ${fmt.pct(d.pct)}</td>
      <td class="${cc} td-right" style="font-size:10px;">${d.pct > 0 ? '+' : ''}${fmt.price(Math.abs(d.change), 4).replace('$','')}</td>
      <td class="td-right" style="color:var(--text-secondary); font-size:10px;">$${d.vol}</td>
      <td class="td-right" style="color:var(--text-dim); font-size:10px;">$${d.mcap}</td>
      <td><span class="sparkline ${cc}">${spark}</span></td>
    `;
    tr.addEventListener('click', () => showPanel('price'));
    tbody.appendChild(tr);
  });

  // Top movers sidebar
  buildMovers();
}

function buildMovers() {
  const g = document.getElementById('side-gainers');
  const l = document.getElementById('side-losers');
  g.innerHTML = '';
  l.innerHTML = '';

  DATA.topGainers.forEach(d => {
    const div = document.createElement('div');
    div.className = 'mover-row';
    div.innerHTML = `
      <span class="mover-sym">${d.symbol}</span>
      <div class="mover-bar"><div class="mover-bar-fill up" style="width:${Math.min(d.pct/50*100,100)}%"></div></div>
      <span class="up">${fmt.pct(d.pct)}</span>
    `;
    g.appendChild(div);
  });

  DATA.topLosers.forEach(d => {
    const div = document.createElement('div');
    div.className = 'mover-row';
    div.innerHTML = `
      <span class="mover-sym">${d.symbol}</span>
      <div class="mover-bar"><div class="mover-bar-fill dn" style="width:${Math.min(Math.abs(d.pct)/20*100,100)}%"></div></div>
      <span class="down">${fmt.pct(d.pct)}</span>
    `;
    l.appendChild(div);
  });
}

/* ── Price Panel ──────────────────────────── */
function buildPricePanel() {
  const d = DATA.market.find(x => x.symbol === 'SOL');
  const cc = fmt.colorClass(d.pct);
  const arrow = d.pct > 0 ? '▲' : '▼';

  document.getElementById('price-hero').innerHTML = `
    <div class="stat-card">
      <div class="stat-label">SYMBOL</div>
      <div class="stat-value" style="color:var(--orange); font-size:22px;">SOL / USD</div>
      <div class="stat-sub" style="font-size:10px; color:var(--text-dim)">Solana · Binance · Jupiter</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">LAST PRICE</div>
      <div class="stat-value big">${fmt.price(d.price, 2)}</div>
      <div class="stat-sub ${cc}">${arrow} ${fmt.pct(d.pct)} (24h)</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">24H CHANGE</div>
      <div class="stat-value ${cc}">${d.pct > 0 ? '+' : ''}$${Math.abs(d.change).toFixed(2)}</div>
      <div class="stat-sub" style="color:var(--text-dim)">vs USD closing</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">24H HIGH</div>
      <div class="stat-value up">${fmt.price(d.high, 2)}</div>
      <div class="stat-sub" style="color:var(--text-dim)">intraday</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">24H LOW</div>
      <div class="stat-value dn">${fmt.price(d.low, 2)}</div>
      <div class="stat-sub" style="color:var(--text-dim)">intraday</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">24H VOLUME</div>
      <div class="stat-value" style="color:var(--cyan)">$${d.vol}</div>
      <div class="stat-sub" style="color:var(--text-dim)">all exchanges</div>
    </div>
  `;

  // ASCII chart (fake)
  const asciiChart = `
  145.20 ┤                                             ╭─╮
  143.80 ┤                                        ╭───╯  │
  142.37 ┤───────────────────────────────────────╯       ╰──  ← NOW
  141.20 ┤                              ╭────────╯
  139.60 ┤                 ╭──╮         │
  138.90 ┤        ╭──╮     │  │    ╭───╯
  137.40 ┤   ╭────╯  ╰─────╯  ╰────╯
  136.00 ┼───╯
         └────────────────────────────────────────────────
         00:00  04:00  08:00  12:00  16:00  20:00  22:59`.trim();

  document.getElementById('price-chart').innerHTML = asciiChart;

  // Exchange breakdown
  document.getElementById('price-exchanges').innerHTML = `
    <tr><td class="sym">Binance</td><td style="text-align:right;color:var(--text-bright)">$142.41</td><td class="up td-right">+1.67%</td><td style="text-align:right;color:var(--text-dim)">$820M</td></tr>
    <tr><td class="sym">Coinbase</td><td style="text-align:right;color:var(--text-bright)">$142.39</td><td class="up td-right">+1.65%</td><td style="text-align:right;color:var(--text-dim)">$340M</td></tr>
    <tr><td class="sym">OKX</td><td style="text-align:right;color:var(--text-bright)">$142.35</td><td class="up td-right">+1.62%</td><td style="text-align:right;color:var(--text-dim)">$290M</td></tr>
    <tr><td class="sym">Kraken</td><td style="text-align:right;color:var(--text-bright)">$142.42</td><td class="up td-right">+1.68%</td><td style="text-align:right;color:var(--text-dim)">$180M</td></tr>
    <tr><td class="sym">Jupiter</td><td style="text-align:right;color:var(--text-bright)">$142.37</td><td class="up td-right">+1.65%</td><td style="text-align:right;color:var(--text-dim)">$280M</td></tr>
    <tr><td class="sym">Raydium</td><td style="text-align:right;color:var(--text-bright)">$142.33</td><td class="up td-right">+1.63%</td><td style="text-align:right;color:var(--text-dim)">$190M</td></tr>
  `;
}

/* ── Wallet Panel ─────────────────────────── */
function buildWalletPanel() {
  const w = DATA.wallet;

  // Header
  document.getElementById('wallet-addr').textContent = w.fullAddress;
  document.getElementById('wallet-total').textContent = '$' + w.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  document.getElementById('wallet-pnl-day').textContent = (w.pnl.day > 0 ? '+' : '') + '$' + w.pnl.day.toFixed(2) + ' (' + fmt.pct(w.pnl.dayPct) + ')';
  document.getElementById('wallet-pnl-day').className = 'wallet-pnl-val ' + fmt.colorClass(w.pnl.day);
  document.getElementById('wallet-pnl-month').textContent = (w.pnl.month > 0 ? '+' : '') + '$' + w.pnl.month.toFixed(2) + ' (' + fmt.pct(w.pnl.monthPct) + ')';
  document.getElementById('wallet-pnl-month').className = 'wallet-pnl-val ' + fmt.colorClass(w.pnl.month);

  // Holdings table
  const tb = document.getElementById('wallet-holdings-tbody');
  tb.innerHTML = '';
  w.holdings.forEach(h => {
    const cc = fmt.colorClass(h.change);
    const tr = document.createElement('tr');
    const barW = h.pct.toFixed(0);
    tr.innerHTML = `
      <td class="sym">${h.token}</td>
      <td style="color:var(--text-secondary)">${typeof h.amount === 'number' ? h.amount.toFixed(2) : h.amount}</td>
      <td class="td-right" style="font-weight:600; color:var(--text-bright)">$${h.value.toLocaleString('en-US', {maximumFractionDigits:2})}</td>
      <td class="td-right">
        <div style="display:flex;align-items:center;gap:6px;justify-content:flex-end">
          <span style="color:var(--text-dim);font-size:10px">${h.pct}%</span>
          <div style="width:50px;height:3px;background:var(--border)">
            <div style="width:${barW}%;height:100%;background:var(--orange);max-width:100%"></div>
          </div>
        </div>
      </td>
      <td class="${cc} td-right">${fmt.pct(h.change)}</td>
    `;
    tb.appendChild(tr);
  });

  // Transactions table
  const tt = document.getElementById('wallet-txns-tbody');
  tt.innerHTML = '';
  w.recentTxns.forEach(tx => {
    const typeColors = { SWAP: 'color:var(--cyan)', BUY: 'color:var(--green)', SELL: 'color:var(--red)', STAKE: 'color:var(--yellow)', RECEIVE: 'color:var(--purple)' };
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="color:var(--text-dim); font-size:10px">${tx.time}</td>
      <td style="font-weight:700; font-size:10px; ${typeColors[tx.type] || ''}">${tx.type}</td>
      <td style="color:var(--text-secondary)">${tx.from}</td>
      <td style="color:var(--text-secondary)">→ ${tx.to}</td>
      <td><span class="alert-status status-${tx.status}" style="background:var(--green-glow);color:var(--green);border:1px solid var(--green-dim)">${tx.status}</span></td>
      <td style="color:var(--cyan); font-size:10px">${tx.sig}</td>
    `;
    tt.appendChild(tr);
  });
}

/* ── Token Panel ──────────────────────────── */
function buildTokenPanel() {
  const t = DATA.token;
  const cc = fmt.colorClass(t.priceChange24h);

  // Hero stats
  document.getElementById('token-hero').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:6px">
      <div style="font-size:9px;color:var(--text-dim);letter-spacing:2px">TOKEN</div>
      <div style="font-size:24px;font-weight:700;color:var(--orange)">${t.symbol}</div>
      <div style="font-size:11px;color:var(--text-secondary)">${t.name}</div>
      <div style="font-size:10px;color:var(--cyan)">${t.shortMint}</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:6px">
      <div style="font-size:9px;color:var(--text-dim);letter-spacing:2px">PRICE</div>
      <div class="token-price-big">${fmt.price(t.price)}</div>
      <div class="${cc}" style="font-size:12px;font-weight:600">${fmt.arrowUp} ${fmt.pct(t.priceChange24h)} (24h)</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <div><div style="font-size:9px;color:var(--text-dim)">MARKET CAP</div><div style="color:var(--text-bright);font-weight:600">${t.marketCap}</div></div>
      <div><div style="font-size:9px;color:var(--text-dim)">VOLUME 24H</div><div style="color:var(--cyan);font-weight:600">${t.volume24h}</div></div>
      <div><div style="font-size:9px;color:var(--text-dim)">LIQUIDITY</div><div style="color:var(--green);font-weight:600">${t.liquidity}</div></div>
      <div><div style="font-size:9px;color:var(--text-dim)">HOLDERS</div><div style="color:var(--text-bright);font-weight:600">${t.holders}</div></div>
      <div><div style="font-size:9px;color:var(--text-dim)">FDV</div><div style="color:var(--text-secondary)">${t.fdv}</div></div>
      <div><div style="font-size:9px;color:var(--text-dim)">SUPPLY</div><div style="color:var(--text-secondary)">${t.supply}</div></div>
    </div>
  `;

  // Risk signals
  const rb = document.getElementById('token-risk-tbody');
  rb.innerHTML = '';
  t.riskSignals.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="risk-badge risk-${r.level}">${r.level}</span></td>
      <td style="color:var(--text-primary)">${r.label}</td>
      <td style="color:var(--text-secondary); font-size:10px">${r.detail}</td>
    `;
    rb.appendChild(tr);
  });

  // Top holders
  const hb = document.getElementById('token-holders-tbody');
  hb.innerHTML = '';
  t.topHolders.forEach(h => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="color:var(--text-dim)">#${h.rank}</td>
      <td style="color:var(--cyan); font-size:10px">${h.address}</td>
      <td style="color:var(--text-secondary); font-size:10px">${h.label}</td>
      <td class="td-right" style="color:var(--orange); font-weight:600">${h.pct}%</td>
      <td style="padding-left:8px">
        <div style="width:80px;height:4px;background:var(--border)">
          <div style="width:${h.pct*8}px;height:100%;background:var(--orange);max-width:80px;opacity:0.7"></div>
        </div>
      </td>
    `;
    hb.appendChild(tr);
  });

  // DEX pools
  const pb = document.getElementById('token-pools-tbody');
  pb.innerHTML = '';
  t.dexPools.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="sym">${p.dex}</td>
      <td style="color:var(--text-secondary)">${p.pair}</td>
      <td class="td-right" style="color:var(--green)">${p.tvl}</td>
      <td class="td-right" style="color:var(--cyan)">${p.volume}</td>
    `;
    pb.appendChild(tr);
  });
}

/* ── News Panel ───────────────────────────── */
function buildNewsPanel() {
  const container = document.getElementById('news-list');
  container.innerHTML = '';
  DATA.news.forEach(n => {
    const div = document.createElement('div');
    div.className = `news-item priority-${n.priority}`;
    div.innerHTML = `
      <div class="news-item-meta">
        <span class="news-tag">${n.tag}</span>
        <span class="news-src">${n.source}</span>
        <span class="news-time">${n.time}</span>
      </div>
      <div class="news-text">${n.text}</div>
    `;
    container.appendChild(div);
  });
}

/* ── Live Panel ───────────────────────────── */
function buildLivePanel() {
  const d = DATA.market.find(x => x.symbol === 'SOL');
  document.getElementById('live-price-val').textContent = fmt.price(d.price, 2);
  document.getElementById('live-price-val').className = 'stat-value big ' + fmt.colorClass(d.pct);

  buildLiveFeed(true);
}

function buildLiveFeed(reset = false) {
  const container = document.getElementById('live-feed-large');
  if (reset) container.innerHTML = '';

  const idx = Math.floor(Math.random() * DATA.liveFeed.length);
  const entry = DATA.liveFeed[idx];

  const now = new Date();
  const timeStr = fmt.time(now);

  const row = document.createElement('div');
  row.className = 'lf-large-entry';
  row.innerHTML = `
    <span style="color:var(--text-dim); font-size:10px">${timeStr}</span>
    <span class="lf-type-badge lf-type-${entry.type}">${entry.type}</span>
    <span style="color:var(--text-secondary); font-size:11px">${entry.text}</span>
    <span style="color:var(--text-dim); font-size:9px">⬡ SOL</span>
  `;
  container.insertBefore(row, container.firstChild);

  // Keep only last 50 entries
  while (container.children.length > 50) {
    container.removeChild(container.lastChild);
  }
}

/* ── Alerts Panel ─────────────────────────── */
function buildAlertsPanel() {
  const container = document.getElementById('alerts-list');
  container.innerHTML = '';

  // Stats row
  const triggered = DATA.alerts.filter(a => a.triggered).length;
  const active = DATA.alerts.filter(a => !a.triggered).length;
  document.getElementById('alerts-stats').innerHTML = `
    <span style="color:var(--text-dim)">TOTAL: <span style="color:var(--text-bright)">${DATA.alerts.length}</span></span>
    <span style="margin-left:12px; color:var(--green)">ACTIVE: ${active}</span>
    <span style="margin-left:12px; color:var(--red)">TRIGGERED: ${triggered}</span>
  `;

  DATA.alerts.forEach(a => {
    const row = document.createElement('div');
    row.className = 'alert-row';
    row.innerHTML = `
      <span style="color:var(--text-dim); font-size:10px">${a.id}</span>
      <span class="sym">${a.token}</span>
      <span style="color:var(--text-secondary)">${a.condition}</span>
      <span style="color:var(--text-dim); font-size:10px">${a.triggered ? 'FIRED ' + a.triggeredAt : a.created}</span>
      <span class="alert-status status-${a.status}">${a.status}</span>
    `;
    container.appendChild(row);
  });
}

/* ── Side Panel Live Feed ─────────────────── */
function buildSideLiveFeed() {
  const container = document.getElementById('live-feed-list');

  const addEntry = () => {
    const idx = Math.floor(Math.random() * DATA.liveFeed.length);
    const entry = DATA.liveFeed[idx];
    const now = new Date();

    const div = document.createElement('div');
    div.className = `lf-entry type-${entry.type}`;
    div.innerHTML = `<span class="lf-time">${fmt.time(now)}</span>${entry.text}`;
    container.insertBefore(div, container.lastChild);

    while (container.children.length > 40) {
      container.removeChild(container.lastChild);
    }
  };

  // Initial entries
  for (let i = 0; i < 12; i++) addEntry();

  // Keep streaming
  setInterval(addEntry, 2800);
}

/* ── Price Flash (market table) ───────────── */
function startPriceFlashing() {
  setInterval(() => {
    const rows = document.querySelectorAll('#market-tbody tr');
    if (!rows.length) return;
    const idx = Math.floor(Math.random() * rows.length);
    const row = rows[idx];
    const isUp = Math.random() > 0.35;
    row.classList.add(isUp ? 'flash-up' : 'flash-down');
    setTimeout(() => row.classList.remove('flash-up', 'flash-down'), 700);
  }, 1800);
}

/* ── Top bar market strip ─────────────────── */
function buildTopbarStrip() {
  const strip = document.getElementById('market-strip');
  const subset = DATA.market.slice(0, 8);

  subset.forEach(d => {
    const cc = fmt.colorClass(d.pct);
    const arrow = d.pct > 0 ? '▲' : d.pct < 0 ? '▼' : '─';
    const div = document.createElement('div');
    div.className = 'market-strip-item';
    div.innerHTML = `
      <span class="sym">${d.symbol}</span>
      <span class="price">${fmt.price(d.price, 2)}</span>
      <span class="chg ${cc}">${arrow} ${fmt.pct(d.pct)}</span>
    `;
    div.addEventListener('click', () => showPanel('price'));
    strip.appendChild(div);
  });
}

/* ── Live live-mode price update ─────────── */
function startLivePrice() {
  setInterval(() => {
    const d = DATA.market.find(x => x.symbol === 'SOL');
    const drift = (Math.random() - 0.48) * 0.8;
    d.price = Math.max(130, d.price + drift);

    // Update top bar
    const items = document.querySelectorAll('.market-strip-item');
    if (items[0]) {
      const priceEl = items[0].querySelector('.price');
      if (priceEl) priceEl.textContent = fmt.price(d.price, 2);
    }

    // Update live panel if visible
    const lp = document.getElementById('live-price-val');
    if (lp) {
      const prev = parseFloat(lp.textContent.replace('$','').replace(',',''));
      lp.textContent = fmt.price(d.price, 2);
      lp.classList.add(drift >= 0 ? 'flash-up' : 'flash-down');
      setTimeout(() => lp.classList.remove('flash-up','flash-down'), 500);
    }

    // Feed new live entry
    buildLiveFeed(false);
  }, 2000);
}

/* ── Init ─────────────────────────────────── */
function init() {
  buildTopbarStrip();
  buildMarketPanel();
  buildPricePanel();
  buildWalletPanel();
  buildTokenPanel();
  buildNewsPanel();
  buildLivePanel();
  buildAlertsPanel();
  buildSideLiveFeed();
  startPriceFlashing();
  startLivePrice();
  showPanel('market');
}

window.addEventListener('DOMContentLoaded', init);
