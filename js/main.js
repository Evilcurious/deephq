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
  return `<div class="card">
    <div class="icon">${esc(s.icon)}</div>
    <h3>${esc(s.name)}</h3>
    <p>${esc(s.description)}</p>
    ${withPrice ? `<div class="price-tag">${esc(fmtPrice(site, s))}</div>` : ''}
  </div>`;
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
