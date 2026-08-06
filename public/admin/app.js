const navItems = document.querySelectorAll('.nav-item');
const overview = document.getElementById('overview');
const placeholder = document.getElementById('placeholder');
const pageTitle = document.getElementById('page-title');
const placeholderTitle = document.getElementById('placeholder-title');

navItems.forEach((item) => {
  item.addEventListener('click', () => {
    navItems.forEach((button) => button.classList.remove('active'));
    item.classList.add('active');

    const label = item.textContent.trim();
    pageTitle.textContent = label;

    if (item.dataset.view === 'overview') {
      overview.classList.add('active-view');
      placeholder.classList.remove('active-view');
      return;
    }

    overview.classList.remove('active-view');
    placeholder.classList.add('active-view');
    placeholderTitle.textContent = label;
  });
});
