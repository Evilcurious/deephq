// ---------- Shared ----------
const toggle = document.querySelector('.nav-toggle');
const links = document.querySelector('.nav-links');
if (toggle && links) toggle.addEventListener('click', () => links.classList.toggle('open'));

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtPrice = (site, s) => `${site.currency}${Number(s.price).toLocaleString()}` + (s.period === 'one-time' ? ' one-time' : `/${s.period}`);

async function loadSite() {
  const res = await fetch('/data/site.json?v=' + Date.now(), { cache: 'no-store' });
  return res.json();
}

function serviceCard(site, s, withPrice) {
  return `<a class="card card-link" href="/order?service=${encodeURIComponent(s.id)}" title="Order ${esc(s.name)}">
    <div class="icon">${esc(s.icon)}</div>
    <h3>${esc(s.name)}</h3>
    <p>${esc(s.description)}</p>
    ${withPrice ? `<div class="price-tag">${esc(fmtPrice(site, s))}</div>` : ''}
    <span class="card-cta">Order this service →</span>
  </a>`;
}

loadSite().then(site => {
  // WhatsApp links everywhere
  document.querySelectorAll('[data-wa]').forEach(a => {
    a.href = `https://wa.me/${site.whatsapp}`;
    if (a.dataset.wa === 'text') a.textContent = '+' + site.whatsapp;
  });

  // Stats
  Object.entries(site.stats).forEach(([k, v]) => {
    document.querySelectorAll(`[data-stat="${k}"]`).forEach(el => el.textContent = v);
  });

  // Service lists
  const home = document.getElementById('homeServices');
  if (home) home.innerHTML = site.services.slice(0, 3).map(s => serviceCard(site, s, false)).join('');
  const all = document.getElementById('allServices');
  if (all) all.innerHTML = site.services.map(s => serviceCard(site, s, true)).join('');

  // ---------- Order page ----------
  const form = document.getElementById('orderForm');
  if (!form) return;

  const box = document.getElementById('serviceChecks');
  const params = new URLSearchParams(location.search);
  const pre = (params.get('service') || '').split(',');
  box.innerHTML = site.services.map((s, i) => `
    <label class="check">
      <input type="checkbox" name="services" value="${esc(s.id)}" ${pre.includes(s.id) || (!params.get('service') && i < 2) ? 'checked' : ''} />
      <span>${esc(s.name)}<small>${esc(fmtPrice(site, s))}</small></span>
    </label>`).join('');

  const checks = () => [...form.querySelectorAll('input[name="services"]')];
  const sumList = document.getElementById('sumList');
  const sumTotal = document.getElementById('sumTotal');

  function selected() { return checks().filter(c => c.checked).map(c => site.services.find(s => s.id === c.value)); }

  function updateSummary() {
    const sel = selected();
    sumList.innerHTML = sel.length
      ? sel.map(s => `<div class="summary-row"><span>${esc(s.name)}</span><span>${esc(fmtPrice(site, s))}</span></div>`).join('')
      : '<div class="summary-row"><span>No services selected</span></div>';
    const monthly = sel.filter(s => s.period !== 'one-time').reduce((a, s) => a + Number(s.price), 0);
    const once = sel.filter(s => s.period === 'one-time').reduce((a, s) => a + Number(s.price), 0);
    let t = [];
    if (monthly) t.push(`${site.currency}${monthly.toLocaleString()}/mo`);
    if (once) t.push(`${site.currency}${once.toLocaleString()} one-time`);
    sumTotal.textContent = t.join(' + ') || `${site.currency}0`;
  }
  checks().forEach(c => c.addEventListener('change', updateSummary));
  updateSummary();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.checkValidity()) return form.reportValidity();
    const sel = selected();
    if (!sel.length) return alert('Please select at least one service.');

    const d = Object.fromEntries(new FormData(form).entries());
    const lines = [
      `*New Order — DEEP.HQ*`,
      ``,
      `*Name:* ${d.name}`,
      `*Email:* ${d.email}`,
      `*Phone:* ${d.phone || '-'}`,
      `*Business:* ${d.business}`,
      `*Website/Instagram:* ${d.website || '-'}`,
      ``,
      `*Services:*`,
      ...sel.map(s => `• ${s.name} — ${fmtPrice(site, s)}`),
      ``,
      `*Total:* ${sumTotal.textContent}`,
      `*Ad Budget:* ${d.budget || '-'}`,
      `*Start Date:* ${d.start || '-'}`,
      `*Goals:* ${d.message || '-'}`
    ];
    const url = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(lines.join('\n'))}`;
    window.open(url, '_blank');

    document.getElementById('successName').textContent = d.name;
    document.getElementById('waLink').href = url;
    form.style.display = 'none';
    document.getElementById('successMsg').classList.add('show');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

// ---------- Reviews page ----------
(function () {
  const list = document.getElementById('reviewsList');
  if (!list) return;
  const summary = document.getElementById('ratingSummary');
  const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);
  const initials = (n) => n.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();

  function render(reviews) {
    if (!reviews.length) {
      list.innerHTML = '<p style="color:var(--muted)">No reviews yet — be the first to share your experience!</p>';
      return;
    }
    const avg = reviews.reduce((a, r) => a + r.rating, 0) / reviews.length;
    summary.innerHTML = `<strong>${avg.toFixed(1)} <small class="star-gold">${stars(Math.round(avg))}</small></strong><span>${reviews.length} review${reviews.length === 1 ? '' : 's'}</span>`;
    list.innerHTML = reviews.map(r => `<div class="card">
      <div class="star-gold" style="font-size:1.1rem;margin-bottom:10px;">${stars(r.rating)}</div>
      <p class="quote">"${esc(r.text)}"</p>
      <div class="author"><div class="avatar">${esc(initials(r.name))}</div><div><strong>${esc(r.name)}</strong><small>${esc(r.business || '')}${r.business ? ' · ' : ''}${esc(r.date || '')}</small></div></div>
    </div>`).join('');
  }

  async function load() {
    try {
      const r = await fetch('/api/reviews', { cache: 'no-store' });
      if (!r.ok) throw 0;
      render((await r.json()).reviews || []);
    } catch {
      const r = await fetch('/data/reviews.json?v=' + Date.now(), { cache: 'no-store' });
      render(await r.json());
    }
  }
  load();

  const form = document.getElementById('reviewForm');
  const note = document.getElementById('reviewNote');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) return form.reportValidity();
    const btn = form.querySelector('button'); btn.disabled = true; note.textContent = 'Submitting…';
    try {
      const r = await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form).entries())) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Failed');
      note.textContent = 'Thank you! Your review has been published.';
      form.reset();
      load();
    } catch (err) { note.textContent = 'Could not submit: ' + err.message; }
    btn.disabled = false;
  });
})();
