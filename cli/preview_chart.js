// Preview of barChart output
function barChart(values, labels, opts) {
  const { height=10, barWidth=3, gap=1, axisW=8 } = opts||{};
  const n   = values.length;
  const lo  = Math.min(...values);
  const hi  = Math.max(...values);
  const rng = Math.max(hi - lo, 1);
  const barH = v => Math.max(1, Math.round((v - lo) / rng * (height - 1)));
  const fv = v => Math.abs(v)>=1000 ? Math.round(v).toString() : v.toFixed(1);
  let out = '';
  for (let r = 0; r < height; r++) {
    const rowVal = hi - (r / (height - 1)) * rng;
    out += fv(rowVal).padStart(axisW - 1) + '│';
    for (let i = 0; i < n; i++) {
      const bh = barH(values[i]);
      const filled = (height - 1 - r) < bh;
      if (i > 0) out += ' '.repeat(gap);
      out += filled ? '█'.repeat(barWidth) : ' '.repeat(barWidth);
    }
    out += '\n';
  }
  const totalW = n * (barWidth + gap) - gap;
  out += ' '.repeat(axisW) + '└' + '─'.repeat(totalW + 2) + '\n';
  if (labels && labels.length > 0) {
    out += ' '.repeat(axisW + 1);
    for (let i = 0; i < n; i++) {
      if (i > 0) out += ' '.repeat(gap);
      const lbl = String(labels[i]||'').substring(0, barWidth);
      const pad = barWidth - lbl.length;
      out += ' '.repeat(Math.floor(pad/2)) + lbl + ' '.repeat(pad - Math.floor(pad/2));
    }
    out += '\n';
  }
  return out;
}

console.log('══════ TPS HISTORY (last 10 mins) ══════');
console.log(barChart(
  [4194,4116,4270,4153,4077,4228,4201,4256,4309,4147],
  ['11m','10m','9m','8m','7m','6m','5m','4m','3m','2m'],
  {height:10, barWidth:4, gap:1, axisW:7}
));

console.log('══════ BLOCKTIME HISTORY ══════');
console.log(barChart(
  [397,389,394,394,384,384,382,394,394,408],
  ['11m','10m','9m','8m','7m','6m','5m','4m','3m','2m'],
  {height:10, barWidth:4, gap:1, axisW:9}
));

console.log('══════ SOL/USD 24H PRICE ══════');
console.log(barChart(
  [136.2,137.4,138.9,141.2,140.1,142.3,145.2],
  ['00:00','04:00','08:00','12:00','16:00','20:00','Now'],
  {height:10, barWidth:6, gap:1, axisW:9}
));

console.log('══════ STAKE GROWTH BY EPOCH ══════');
console.log(barChart(
  [318,387,402,382,374,383,389,318,375,379,393,389,395],
  ['172','200','260','320','380','430','475','530','575','635','700','750','788'],
  {height:10, barWidth:3, gap:1, axisW:8}
));
