/* =====================================================================
   REGISTRO A / B / C
   Índice:
   1. CONFIGURACIÓN            (nombres, colores, prioridad)  <-- empieza por aquí
   2. DATOS Y ALMACENAMIENTO
   3. UTILIDADES
   4. PANTALLA "HOY"
   5. CALENDARIO
   6. BOTONES Y EVENTOS
   7. ARRANQUE
   ===================================================================== */


/* ---------------------------------------------------------------------
   1. CONFIGURACIÓN
   - id:   lo que se guarda en los datos (no lo cambies si ya tienes datos)
   - name: lo que se ve en pantalla (cámbialo cuando quieras)
   - css:  variable de color definida en style.css (--a, --b, --c)
   --------------------------------------------------------------------- */
const TYPES = [
  { id: 'A', name: 'FOLLAR', css: '--a' },
  { id: 'B', name: 'PAJA', css: '--b' },
  { id: 'C', name: 'PORNO', css: '--c' }
];

// Qué color gana si en un mismo día hay varios tipos (el primero gana)
const PRIORITY = ['A', 'C', 'B'];

// Tipo del que se muestra "tiempo desde el último..."
const SINCE_TYPE = 'C';


/* ---------------------------------------------------------------------
   2. DATOS Y ALMACENAMIENTO
   Todo vive en el objeto `S` y se guarda en el navegador (localStorage).
   Cada registro = { t: timestamp en ms, k: 'A' | 'B' | 'C' }
   --------------------------------------------------------------------- */
const KEY = 'filia_v1';
const S = { log: [] };

try {
  const raw = localStorage.getItem(KEY);
  if (raw) S.log = (JSON.parse(raw).log || []);
} catch (e) {}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
}


/* ---------------------------------------------------------------------
   3. UTILIDADES
   --------------------------------------------------------------------- */
const $ = id => document.getElementById(id);
const pad2 = n => String(n).padStart(2, '0');
const HOUR = 36e5, DAY = 864e5;

const typeOf = id => TYPES.find(x => x.id === id);
const colorOf = id => `var(${typeOf(id).css})`;
const hhmm = t => { const d = new Date(t); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); };

// "YYYY-MM-DD" de un Date / de un timestamp
const dateStr = d => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
const dayKey = t => dateStr(new Date(t));

// Inicio (en ms) de la semana (lunes), mes y año actuales
function periodStarts() {
  const n = new Date();
  const mondayOffset = (n.getDay() + 6) % 7;
  return {
    week:  new Date(n.getFullYear(), n.getMonth(), n.getDate() - mondayOffset).getTime(),
    month: new Date(n.getFullYear(), n.getMonth(), 1).getTime(),
    year:  new Date(n.getFullYear(), 0, 1).getTime()
  };
}

// Cuenta registros por tipo: { A: 3, B: 0, C: 1 }
function countTypes(entries) {
  const c = {};
  TYPES.forEach(x => c[x.id] = 0);
  entries.forEach(e => { if (c[e.k] !== undefined) c[e.k]++; });
  return c;
}

// Suma n meses a una fecha sin desbordar (31 ene + 1 mes = 28/29 feb)
function addMonths(date, n) {
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  return d;
}

// Tiempo transcurrido entre dos instantes, en meses/días/horas/min/seg
function elapsed(fromMs, toMs) {
  const from = new Date(fromMs), to = new Date(toMs);
  let months = (to.getFullYear() - from.getFullYear()) * 12 + to.getMonth() - from.getMonth();
  if (addMonths(from, months) > to) months--;
  months = Math.max(0, months);
  const rest = Math.max(0, toMs - addMonths(from, months).getTime());
  return {
    months,
    days:  Math.floor(rest / DAY),
    hours: Math.floor(rest % DAY / HOUR),
    mins:  Math.floor(rest % HOUR / 6e4),
    secs:  Math.floor(rest % 6e4 / 1e3)
  };
}


/* ---------------------------------------------------------------------
   4. PANTALLA "HOY"
   render() lo vuelve a pintar todo. Se llama tras cada cambio y cada minuto.
   --------------------------------------------------------------------- */
function render() {
  renderButtons();
  renderSince();
  renderStats();
  renderWeekList();
  renderCalendar();
}

// Fecha + botones A, B, C (cada uno enseña cuántos llevas hoy)
function renderButtons() {
  const now = Date.now();
  $('dlabel').textContent = new Date(now)
    .toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

    $('btns').innerHTML = TYPES.map(x =>
    `<button class="abtn" data-add="${x.id}" style="background:var(${x.css})">${x.name}</button>`
  ).join('');
}

// Tiempo desde el último registro de SINCE_TYPE (se repinta cada segundo)
function renderSince() {
  const name = typeOf(SINCE_TYPE).name;
  $('sincel').textContent = `Tiempo desde el último ${name}`;

  const times = S.log.filter(e => e.k === SINCE_TYPE).map(e => e.t);
  if (!times.length) {
    $('since').innerHTML = `<div class="since-empty">Aún no hay registros de ${name}</div>`;
    return;
  }
  const e = elapsed(Math.max(...times), Date.now());
  const cell = (n, label) => `<div><b>${n}</b><span>${label}</span></div>`;
  $('since').innerHTML =
    cell(e.months, 'meses') + cell(e.days, 'días') + cell(e.hours, 'horas') +
    cell(e.mins, 'min') + cell(e.secs, 'seg');
}

// Tabla: esta semana / mes / año / total, con una columna por tipo
function renderStats() {
  const st = periodStarts();
  const rows = [
    ['Esta semana', S.log.filter(e => e.t >= st.week)],
    ['Este mes',    S.log.filter(e => e.t >= st.month)],
    ['Este año',    S.log.filter(e => e.t >= st.year)],
    ['Total',       S.log]
  ];
  $('stats').innerHTML =
    '<tr><th></th>' + TYPES.map(x => `<th>${x.name}</th>`).join('') + '</tr>' +
    rows.map(([label, entries]) => {
      const c = countTypes(entries);
      return `<tr><td>${label}</td>${TYPES.map(x => `<td>${c[x.id]}</td>`).join('')}</tr>`;
    }).join('');
}

// Una entrada de lista: etiqueta de color + día/hora + botón borrar.
// data-i = posición en S.log (así sabemos cuál borrar)
function entryRow(e, i, showDay) {
  const day = showDay
    ? new Date(e.t).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }) + ' · '
    : '';
  return `<div class="li"><span><span class="tag" style="background:${colorOf(e.k)}">${typeOf(e.k).name}</span>${day}${hhmm(e.t)}</span><button data-i="${i}">Borrar</button></div>`;
}

// Lista de la semana, de más reciente a más antigua
function renderWeekList() {
  const start = periodStarts().week;
  const items = S.log
    .map((e, i) => ({ e, i }))
    .filter(o => o.e.t >= start)
    .sort((a, b) => b.e.t - a.e.t);
  $('list').innerHTML = items.length
    ? items.map(o => entryRow(o.e, o.i, true)).join('')
    : '<span class="mut">Nada esta semana.</span>';
}


/* ---------------------------------------------------------------------
   5. CALENDARIO
   calMonth = mes que se está viendo { y, m (0-11) }
   selectedDay = día pulsado ("YYYY-MM-DD")
   --------------------------------------------------------------------- */
let calMonth = null;
let selectedDay = null;

// Tipo ganador de un día según PRIORITY
const winner = types => PRIORITY.find(id => types.has(id));

function renderCalendar() {
  const todayKey = dayKey(Date.now());
  const [ty, tm] = todayKey.split('-').map(Number);
  if (!calMonth) calMonth = { y: ty, m: tm - 1 };
  if (!selectedDay) selectedDay = todayKey;

  // Tipos presentes en cada día: { "2026-11-20": Set('A','C') }
  const byDay = {};
  S.log.forEach(e => { (byDay[dayKey(e.t)] = byDay[dayKey(e.t)] || new Set()).add(e.k); });

  const first = new Date(calMonth.y, calMonth.m, 1);
  const daysInMonth = new Date(calMonth.y, calMonth.m + 1, 0).getDate();
  const blanks = (first.getDay() + 6) % 7;      // semana empieza en lunes

  $('cmon').textContent = first
    .toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).replace(' de ', ' ');

  // --- Cuadrícula ---
  let html = '';
  for (let i = 0; i < blanks; i++) html += '<div></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const k = calMonth.y + '-' + pad2(calMonth.m + 1) + '-' + pad2(d);
    if (k > todayKey) {
      html += `<div class="cd fut"><span>${d}</span></div>`;
      continue;
    }
    const types = byDay[k];
    const sel = k === selectedDay ? ' sel' : '';
    if (!types) {
      html += `<button class="cd${sel}" data-k="${k}"><span>${d}</span></button>`;
    } else if (types.size > 1) {
      html += `<button class="cd colored more${sel}" data-k="${k}" style="background:${colorOf(winner(types))}"><span>${d}</span><b>+</b></button>`;
    } else {
      html += `<button class="cd colored${sel}" data-k="${k}" style="background:${colorOf(winner(types))}"><span>${d}</span></button>`;
    }
  }
  $('cal').innerHTML = html;

  // --- Leyenda (en orden de prioridad) ---
  $('leg').innerHTML = PRIORITY.map(id =>
    `<span><i style="background:${colorOf(id)}"></i>${typeOf(id).name}</span>`).join('') +
    '<span>+ = hay más tipos ese día</span>';

  // --- Detalle del día seleccionado ---
  const [sy, sm, sd] = selectedDay.split('-').map(Number);
  $('dtitle').textContent = new Date(sy, sm - 1, sd)
    .toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const dayItems = S.log
    .map((e, i) => ({ e, i }))
    .filter(o => dayKey(o.e.t) === selectedDay)
    .sort((a, b) => a.e.t - b.e.t);
  $('dinfo').innerHTML = dayItems.length
    ? dayItems.map(o => entryRow(o.e, o.i, false)).join('')
    : '<span class="mut">Sin registros este día.</span>';

  // --- Resumen del mes ---
  const prefix = calMonth.y + '-' + pad2(calMonth.m + 1);
  const monthEntries = S.log.filter(e => dayKey(e.t).startsWith(prefix));
  const c = countTypes(monthEntries);
  $('msum').innerHTML = monthEntries.length
    ? `<b>${monthEntries.length}</b> registros<div class="mut" style="margin-top:6px">` +
      TYPES.map(x => `${x.name}: ${c[x.id]}`).join(' · ') +
      ` · Días con registros: ${Object.keys(byDay).filter(k => k.startsWith(prefix)).length}</div>`
    : '<span class="mut">Sin datos.</span>';
}


/* ---------------------------------------------------------------------
   6. BOTONES Y EVENTOS
   --------------------------------------------------------------------- */

// Pulsar A, B o C
$('btns').onclick = e => {
  const b = e.target.closest('[data-add]');
  if (!b) return;
  S.log.push({ t: Date.now(), k: b.dataset.add });
  save(); render();
  try { navigator.vibrate && navigator.vibrate(30); } catch (err) {}
};

// Borrar una entrada (sirve para la lista de la semana y la del calendario)
function deleteHandler(e) {
  const i = e.target.dataset && e.target.dataset.i;
  if (i !== undefined && i !== '') { S.log.splice(+i, 1); save(); render(); }
}
$('list').onclick = deleteHandler;
$('dinfo').onclick = deleteHandler;

// Copia de seguridad: exportar
$('exp').onclick = async () => {
  const text = JSON.stringify(S);
  $('bk').value = text;
  try { await navigator.clipboard.writeText(text); $('exp').textContent = '¡Copiado!'; }
  catch (e) { $('bk').select(); }
  setTimeout(() => $('exp').textContent = 'Copiar datos', 1500);
};

// Copia de seguridad: importar
$('imp').onclick = () => {
  try {
    const p = JSON.parse($('bk').value);
    if (!Array.isArray(p.log)) throw 0;
    S.log = p.log.filter(e => e && Number.isFinite(e.t) && typeOf(e.k));
    save(); render();
    $('bk').value = '';
    $('imp').textContent = '¡Importado!';
  } catch (e) {
    $('imp').textContent = 'Datos no válidos';
  }
  setTimeout(() => $('imp').textContent = 'Importar', 1500);
};

// Añadir una entrada a mano (calendario)
$('mtype').innerHTML = TYPES.map(x => `<option value="${x.id}">${x.name}</option>`).join('');

// Pone en el selector el día seleccionado y la hora actual
function resetManualDate() {
  $('mdate').value = selectedDay + 'T' + hhmm(Date.now());
}

$('madd').onclick = () => {
  const t = new Date($('mdate').value).getTime();
  if (!Number.isFinite(t) || t > Date.now()) {          // vacío o en el futuro: no se añade
    $('madd').textContent = 'Fecha no válida';
    setTimeout(() => $('madd').textContent = 'Añadir', 1500);
    return;
  }
  S.log.push({ t, k: $('mtype').value });
  const d = new Date(t);
  calMonth = { y: d.getFullYear(), m: d.getMonth() };   // el calendario salta a ese mes
  selectedDay = dayKey(t);
  save(); render();
  resetManualDate();
};

// Pestañas
function showTab(name) {
  $('v-hoy').hidden = name !== 'hoy';
  $('v-cal').hidden = name !== 'cal';
  $('t-hoy').classList.toggle('on', name === 'hoy');
  $('t-cal').classList.toggle('on', name === 'cal');
  window.scrollTo(0, 0);
    if (name === 'cal') { calMonth = null; selectedDay = null; render(); resetManualDate(); }
}
$('t-hoy').onclick = () => showTab('hoy');
$('t-cal').onclick = () => showTab('cal');

// Calendario: mes anterior / siguiente (no deja ir al futuro)
$('cprev').onclick = () => {
  calMonth = calMonth.m ? { y: calMonth.y, m: calMonth.m - 1 } : { y: calMonth.y - 1, m: 11 };
  render();
};
$('cnext').onclick = () => {
  const [ty, tm] = dayKey(Date.now()).split('-').map(Number);
  if (calMonth.y * 12 + calMonth.m < ty * 12 + tm - 1) {
    calMonth = calMonth.m < 11 ? { y: calMonth.y, m: calMonth.m + 1 } : { y: calMonth.y + 1, m: 0 };
    render();
  }
};

// Calendario: pulsar un día
$('cal').onclick = e => {
  const b = e.target.closest('[data-k]');
  if (b) { selectedDay = b.dataset.k; render(); resetManualDate(); }
};


/* ---------------------------------------------------------------------
   7. ARRANQUE
   --------------------------------------------------------------------- */
render();
setInterval(render, 60000);        // repinta todo cada minuto (por si cambia el día)
setInterval(renderSince, 1000);    // el reloj "desde el último C" avanza cada segundo
