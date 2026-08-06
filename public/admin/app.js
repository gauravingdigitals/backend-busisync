const navItems = document.querySelectorAll('.nav-item');
const overview = document.getElementById('overview');
const moduleView = document.getElementById('module-view');
const moduleContent = document.getElementById('module-content');
const pageTitle = document.getElementById('page-title');
const searchInput = document.getElementById('global-search');

const moduleDefinitions = {
  workspaces: {
    title: 'Workspaces',
    eyebrow: 'Tenant operations',
    description: 'Manage organizations, plans, health, owners and connected tools.',
    stats: [['24', 'Active'], ['3', 'Trial'], ['2', 'Attention']],
    rows: [
      ['Hidden Leaf Agency', 'Agency', 'Healthy', '18 members'],
      ['BusiSync Demo', 'Growth', 'Healthy', '7 members'],
      ['Retail Operations', 'Starter', 'Attention', '4 members'],
    ],
  },
  members: {
    title: 'Users & roles',
    eyebrow: 'Identity and access',
    description: 'Control workspace membership, invitations, roles and permissions.',
    stats: [['86', 'Members'], ['12', 'Online'], ['3', 'Invited']],
    rows: [
      ['Gaurav Sharma', 'Owner', 'Active', 'All workspaces'],
      ['Priya Mehta', 'Administrator', 'Active', 'Hidden Leaf Agency'],
      ['Arjun Singh', 'Support agent', 'Invited', 'Retail Operations'],
    ],
  },
  integrations: {
    title: 'Integrations',
    eyebrow: 'Connected services',
    description: 'Monitor OAuth connections, webhooks, sync health and provider errors.',
    stats: [['18', 'WhatsApp'], ['14', 'Gmail'], ['9', 'Slack']],
    rows: [
      ['WhatsApp Business', '18 workspaces', 'Connected', 'Webhook healthy'],
      ['Gmail', '14 workspaces', 'Connected', 'Sync 2m ago'],
      ['Slack', '9 workspaces', 'Attention', '1 token expiring'],
    ],
  },
  intelligence: {
    title: 'Mr. FOX AI',
    eyebrow: 'Intelligence governance',
    description: 'Configure models, prompts, business memory, limits and approval policies.',
    stats: [['2,941', 'Actions'], ['97.2%', 'Success'], ['₹8.4K', 'Usage']],
    rows: [
      ['Executive assistant', 'Gemini / OpenAI', 'Active', '24 workspaces'],
      ['Suggested replies', 'Gemini Flash', 'Active', '18 workspaces'],
      ['Daily brief', 'OpenRouter', 'Review', '6 workspaces'],
    ],
  },
  audit: {
    title: 'Audit logs',
    eyebrow: 'Security and governance',
    description: 'Review administrative actions, access events and integration changes.',
    stats: [['1,284', 'Events'], ['0', 'Critical'], ['14', 'Warnings']],
    rows: [
      ['WhatsApp integration updated', 'Gaurav Sharma', 'Success', '8 minutes ago'],
      ['Role permissions changed', 'Priya Mehta', 'Success', '42 minutes ago'],
      ['Failed admin login', 'Unknown device', 'Warning', '2 hours ago'],
    ],
  },
  settings: {
    title: 'Settings',
    eyebrow: 'Platform configuration',
    description: 'Manage branding, security, notifications, billing and environment controls.',
    stats: [['Production', 'Environment'], ['Asia/Kolkata', 'Timezone'], ['Enabled', '2FA']],
    rows: [
      ['Branding', 'Mr. FOX violet system', 'Configured', 'Updated today'],
      ['Security', 'Firebase + RBAC', 'Configured', 'No alerts'],
      ['Notifications', 'Email and push', 'Configured', '4 channels'],
    ],
  },
};

function renderModule(key) {
  const module = moduleDefinitions[key];
  if (!module) return;
  moduleContent.innerHTML = `
    <div class="module-hero glass">
      <div><p class="eyebrow">${module.eyebrow}</p><h2>${module.title}</h2><p>${module.description}</p></div>
      <button class="primary">Create new</button>
    </div>
    <div class="metrics module-metrics">
      ${module.stats.map(([value, label]) => `<article class="metric glass"><span>${label}</span><strong>${value}</strong><small>Live administration</small></article>`).join('')}
    </div>
    <article class="panel glass module-table">
      <div class="panel-head"><div><p class="eyebrow">Management</p><h3>${module.title} overview</h3></div><button class="ghost">Export</button></div>
      <div class="admin-table">
        ${module.rows.map((row) => `<div class="admin-row">${row.map((cell, index) => `<span class="${index === 0 ? 'primary-cell' : ''}">${cell}</span>`).join('')}<button class="ghost">Open</button></div>`).join('')}
      </div>
    </article>`;
}

function activateView(key) {
  navItems.forEach((button) => button.classList.toggle('active', button.dataset.view === key));
  const label = document.querySelector(`[data-view="${key}"]`)?.textContent.trim() || 'Overview';
  pageTitle.textContent = label;
  const isOverview = key === 'overview';
  overview.classList.toggle('active-view', isOverview);
  moduleView.classList.toggle('active-view', !isOverview);
  if (!isOverview) renderModule(key);
}

navItems.forEach((item) => item.addEventListener('click', () => activateView(item.dataset.view)));
document.querySelectorAll('[data-view-link]').forEach((button) => button.addEventListener('click', () => activateView(button.dataset.viewLink)));

searchInput?.addEventListener('input', (event) => {
  const query = event.target.value.trim().toLowerCase();
  document.querySelectorAll('.admin-row').forEach((row) => {
    row.style.display = !query || row.textContent.toLowerCase().includes(query) ? 'grid' : 'none';
  });
});

async function loadPlatformHealth() {
  const status = document.getElementById('system-status');
  const detail = document.getElementById('system-detail');
  const score = document.getElementById('health-score');
  const label = document.getElementById('health-label');
  const description = document.getElementById('health-description');
  const fox = document.getElementById('fox-online-label');

  try {
    const response = await fetch('/ready', { headers: { Accept: 'application/json' } });
    const data = await response.json();
    if (!response.ok || data.status !== 'ready') throw new Error(data.error || 'Platform unavailable');

    status.textContent = 'All systems healthy';
    detail.textContent = `${data.environment || 'production'} · database connected`;
    score.innerHTML = '100<span>%</span>';
    label.textContent = 'Operational';
    description.textContent = 'API, database and Firebase readiness checks passed.';
    fox.textContent = 'Mr. FOX online';
  } catch (error) {
    status.textContent = 'System attention required';
    detail.textContent = 'Readiness check failed';
    score.innerHTML = '62<span>%</span>';
    label.textContent = 'Degraded';
    description.textContent = 'One or more platform dependencies require attention.';
    fox.textContent = 'Mr. FOX limited';
  }
}

loadPlatformHealth();
setInterval(loadPlatformHealth, 60000);
