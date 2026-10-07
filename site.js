'use strict';

const ns = 'http://www.w3.org/2000/svg';
const eventsNode = document.getElementById('events');
const detailNode = document.getElementById('detail');
const filterNode = document.getElementById('category');
let catalog;
let selectedId;
let selectionVersion = 0;

function percent(value) {
  const n = Number(value) * 100;
  return `${Number(n.toFixed(n >= 10 ? 1 : 2))}%`;
}

function beijing(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const formatted = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d);
  return `${formatted.replace(' ', ' ')} 北京时间`;
}

function svg(tag, attributes = {}) {
  const element = document.createElementNS(ns, tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value));
  return element;
}

function color(index) {
  return `hsl(${Math.round(index * 137.508 + 210) % 360} 60% 40%)`;
}

async function read(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`数据读取失败 (${response.status})`);
  return response.json();
}

function renderList() {
  const category = filterNode.value;
  const visible = catalog.events.filter(e => !category || e.categories.includes(category));
  document.getElementById('count').textContent = `${visible.length} / ${catalog.event_count}`;
  eventsNode.replaceChildren();
  for (const event of visible) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `event-button${event.event_id === selectedId ? ' active' : ''}`;
    button.textContent = event.title;
    button.addEventListener('click', () => { location.hash = event.event_id; selectEvent(event); });
    eventsNode.append(button);
  }
}

function drawChart(markets) {
  const box = document.createElement('section');
  box.className = 'chart-area';
  const heading = document.createElement('h3');
  heading.textContent = '历史概率走势';
  box.append(heading);
  const layout = document.createElement('div');
  layout.className = 'chart-layout';
  const chart = svg('svg', { viewBox: '0 0 760 340', class: 'chart', role: 'img', 'aria-label': '各选项历史概率走势；右侧显示最新概率，下面的表格也列出数值' });
  const left = 50, right = 740, top = 18, bottom = 282;
  const times = markets.flatMap(m => m.history.map(p => Date.parse(p.t)));
  const earliest = Math.min(...times), latest = Math.max(...times);
  const scaleX = t => left + (t - earliest) / Math.max(latest - earliest, 1) * (right - left);
  const scaleY = p => bottom - p * (bottom - top);
  for (const probability of [0, .25, .5, .75, 1]) {
    const y = scaleY(probability);
    chart.append(svg('line', { x1: left, x2: right, y1: y, y2: y, stroke: '#e6ebf1', 'stroke-width': 1 }));
    const tick = svg('text', { x: left - 7, y: y + 4, 'text-anchor': 'end' });
    tick.textContent = `${probability * 100}%`;
    chart.append(tick);
  }
  markets.forEach((market, index) => {
    const points = market.history;
    const path = svg('polyline', { points: points.map(p => `${scaleX(Date.parse(p.t)).toFixed(2)},${scaleY(p.p).toFixed(2)}`).join(' '), fill: 'none', stroke: color(index), 'stroke-width': '2', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
    const title = svg('title');
    title.textContent = `${market.question} · ${percent(market.current_probability)} · ${beijing(market.probability_as_of)}`;
    path.append(title);
    chart.append(path);
    const final = points[points.length - 1];
    chart.append(svg('circle', { cx: scaleX(Date.parse(final.t)), cy: scaleY(final.p), r: 4, fill: color(index), stroke: '#fff', 'stroke-width': 1.5 }));
  });
  const firstLabel = svg('text', { x: left, y: 313 });
  firstLabel.textContent = beijing(new Date(earliest).toISOString());
  const lastLabel = svg('text', { x: right, y: 313, 'text-anchor': 'end' });
  lastLabel.textContent = beijing(new Date(latest).toISOString());
  chart.append(firstLabel, lastLabel);
  layout.append(chart);
  const legend = document.createElement('div');
  legend.className = 'legend';
  const legendTitle = document.createElement('strong');
  legendTitle.textContent = '最新概率 · 按概率降序';
  legend.append(legendTitle);
  markets.forEach((market, index) => {
    const row = document.createElement('div');
    row.className = 'legend-item';
    const dot = document.createElement('span');
    dot.className = 'swatch';
    dot.style.background = color(index);
    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = market.question;
    const value = document.createElement('span');
    value.className = 'value';
    value.textContent = percent(market.current_probability);
    row.append(dot, label, value);
    legend.append(row);
  });
  layout.append(legend);
  box.append(layout);
  return box;
}

function drawTable(markets) {
  const container = document.createElement('section');
  container.className = 'table-wrap';
  const heading = document.createElement('h3');
  heading.textContent = '各选项最新数据';
  const table = document.createElement('table');
  const header = document.createElement('thead');
  const headerRow = document.createElement('tr');
  for (const text of ['事件走向', '来源时间（北京时间）', '概率']) {
    const th = document.createElement('th'); th.scope = 'col'; th.textContent = text; headerRow.append(th);
  }
  header.append(headerRow);
  const body = document.createElement('tbody');
  markets.forEach((market, index) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th'); th.scope = 'row';
    const swatch = document.createElement('span'); swatch.className = 'swatch'; swatch.style.background = color(index);
    th.append(swatch, document.createTextNode(market.question));
    const time = document.createElement('td'); time.textContent = beijing(market.probability_as_of);
    const value = document.createElement('td'); value.textContent = percent(market.current_probability);
    tr.append(th, time, value); body.append(tr);
  });
  table.append(header, body); container.append(heading, table);
  return container;
}

async function selectEvent(entry) {
  selectedId = entry.event_id;
  const version = ++selectionVersion;
  renderList();
  detailNode.textContent = '正在加载历史数据…';
  try {
    const event = await read(entry.path);
    const markets = await Promise.all(event.markets.map(m => read(m.path)));
    if (version !== selectionVersion) return;
    markets.sort((a, b) => b.current_probability - a.current_probability || a.question.localeCompare(b.question));
    const heading = document.createElement('h2');
    heading.textContent = event.title;
    const note = document.createElement('p');
    note.className = 'minor';
    note.textContent = `${markets.length} 个选项 · 每个选项的最新时间单独标示 · 历史覆盖可能不完整`;
    detailNode.replaceChildren(heading, note, drawChart(markets), drawTable(markets));
  } catch (err) {
    if (version === selectionVersion) detailNode.textContent = `无法加载事件：${err.message}`;
  }
}

async function start() {
  try {
    catalog = await read('data/v1/index.json');
    document.getElementById('snapshot').textContent =
      `当前最新共 ${catalog.event_count} 个事件；更新时间 ${beijing(catalog.data_as_of)}`;
    for (const category of [...new Set(catalog.events.flatMap(e => e.categories))].sort()) {
      const option = document.createElement('option'); option.value = category; option.textContent = category; filterNode.append(option);
    }
    filterNode.addEventListener('change', renderList);
    renderList();
    const hash = location.hash.slice(1);
    selectEvent(catalog.events.find(e => e.event_id === hash) || catalog.events[0]);
    window.addEventListener('hashchange', () => {
      const chosen = catalog.events.find(e => e.event_id === location.hash.slice(1));
      if (chosen && chosen.event_id !== selectedId) selectEvent(chosen);
    });
  } catch (err) {
    document.getElementById('snapshot').textContent = `数据加载失败：${err.message}`;
  }
}

start();
