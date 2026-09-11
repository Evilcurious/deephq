// Mobile nav toggle
const toggle = document.querySelector('.nav-toggle');
const links = document.querySelector('.nav-links');
if (toggle && links) {
  toggle.addEventListener('click', () => links.classList.toggle('open'));
}

// Order page logic
const form = document.getElementById('orderForm');
if (form) {
  const planSelect = document.getElementById('plan');
  const checks = form.querySelectorAll('input[name="services"]');
  const sumPlan = document.getElementById('sumPlan');
  const sumServices = document.getElementById('sumServices');
  const sumTotal = document.getElementById('sumTotal');

  // Preselect plan from ?plan= query
  const params = new URLSearchParams(window.location.search);
  const plan = params.get('plan');
  if (plan && planSelect.querySelector(`option[value="${plan}"]`)) {
    planSelect.value = plan;
  }

  function updateSummary() {
    const opt = planSelect.options[planSelect.selectedIndex];
    const price = Number(opt.dataset.price);
    sumPlan.textContent = opt.textContent.split('—')[0].trim();
    const count = [...checks].filter(c => c.checked).length;
    sumServices.textContent = `${count} selected`;
    sumTotal.textContent = `$${price.toLocaleString()}/mo`;
  }

  planSelect.addEventListener('change', updateSummary);
  checks.forEach(c => c.addEventListener('change', updateSummary));
  updateSummary();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    if (![...checks].some(c => c.checked)) {
      alert('Please select at least one service.');
      return;
    }
    const data = Object.fromEntries(new FormData(form).entries());
    data.services = [...checks].filter(c => c.checked).map(c => c.value);
    console.log('Order submitted:', data);

    document.getElementById('successName').textContent = data.name;
    document.getElementById('successEmail').textContent = data.email;
    form.style.display = 'none';
    document.getElementById('successMsg').classList.add('show');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}
