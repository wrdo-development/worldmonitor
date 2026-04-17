import { SITE_VARIANT } from '@/config/variant';

interface TabDef {
  id: string;
  label: string;
  url: string | null; // null = Dashboard (panel grid)
}

const TABS: TabDef[] = [
  { id: 'dashboard', label: 'Dashboard', url: null },
  { id: 'agents',    label: 'Agents',    url: 'agents' },     // special: coming-soon page
  { id: 'langfuse',  label: 'Langfuse',  url: 'https://langfuse.wrdo.co.za' },
  { id: 'sonarqube', label: 'SonarQube', url: 'https://sonar.wrdo.co.za' },
  { id: 'litellm',   label: 'LiteLLM',   url: 'https://llm.wrdo.co.za' },
  { id: 'letta',     label: 'Letta',     url: 'https://letta.wrdo.co.za' },
  { id: 'status',    label: 'Status',    url: 'https://status.wrdo.co.za' },
  { id: 'wiki',      label: 'Wiki',      url: 'https://wiki.wrdo.co.za' },
  { id: 'deploy',    label: 'Deploy',    url: 'https://deploy.wrdo.co.za' },
];

export class TopNav {
  private nav: HTMLElement;
  private iframeContainer: HTMLElement;
  private iframeEl: HTMLIFrameElement;
  private comingSoonEl: HTMLElement;
  private activeTabId = 'dashboard';
  private mainContent: HTMLElement | null = null;

  constructor() {
    // Build nav bar
    this.nav = this.buildNav();

    // Build iframe container (hidden by default)
    this.iframeContainer = document.createElement('div');
    this.iframeContainer.className = 'wrdo-topnav-iframe-container';
    this.iframeContainer.setAttribute('aria-hidden', 'true');

    this.iframeEl = document.createElement('iframe');
    this.iframeEl.className = 'wrdo-topnav-iframe';
    this.iframeEl.setAttribute('title', 'WRDO Tool');
    this.iframeEl.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation');
    this.iframeEl.setAttribute('allow', 'clipboard-write');

    this.comingSoonEl = document.createElement('div');
    this.comingSoonEl.className = 'wrdo-topnav-coming-soon';
    this.comingSoonEl.innerHTML = `
      <div class="wrdo-topnav-coming-soon-inner">
        <span class="wrdo-topnav-coming-soon-title">Agents</span>
        <span class="wrdo-topnav-coming-soon-label">Coming Soon</span>
        <p class="wrdo-topnav-coming-soon-body">The WRDO Agents console is under construction. Check back soon.</p>
      </div>
    `;

    this.iframeContainer.appendChild(this.iframeEl);
    this.iframeContainer.appendChild(this.comingSoonEl);
  }

  private buildNav(): HTMLElement {
    const nav = document.createElement('nav');
    nav.className = 'wrdo-topnav';
    nav.setAttribute('aria-label', 'WRDO navigation');

    // Logo
    const logo = document.createElement('a');
    logo.className = 'wrdo-topnav-logo';
    logo.href = '#';
    logo.setAttribute('aria-label', 'WRDO');
    logo.addEventListener('click', (e) => { e.preventDefault(); this.activateTab('dashboard'); });
    const logoImg = document.createElement('img');
    logoImg.src = '/wrdo/wrdo-logo.svg';
    logoImg.alt = 'WRDO';
    logoImg.className = 'wrdo-topnav-logo-img';
    logo.appendChild(logoImg);
    nav.appendChild(logo);

    // Tab list
    const tabList = document.createElement('div');
    tabList.className = 'wrdo-topnav-tabs';
    tabList.setAttribute('role', 'tablist');

    for (const tab of TABS) {
      const btn = document.createElement('button');
      btn.className = 'wrdo-topnav-tab' + (tab.id === 'dashboard' ? ' wrdo-topnav-tab--active' : '');
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', tab.id === 'dashboard' ? 'true' : 'false');
      btn.setAttribute('data-tab-id', tab.id);
      btn.textContent = tab.label;
      btn.type = 'button';

      btn.addEventListener('click', () => this.activateTab(tab.id));
      tabList.appendChild(btn);
    }

    nav.appendChild(tabList);

    // Actions (right side) — Fix 4
    const actions = document.createElement('div');
    actions.className = 'wrdo-topnav-actions';

    const actionDefs: Array<{ id: string; title: string; label: string; extraClass?: string; svg: string }> = [
      {
        id: 'wrdo-search-btn',
        title: 'Search',
        label: 'Search',
        svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
      },
      {
        id: 'wrdo-notif-btn',
        title: 'Notifications',
        label: 'Notifications',
        svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
      },
      {
        id: 'wrdo-settings-btn',
        title: 'Settings',
        label: 'Settings',
        svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
      },
      {
        id: 'wrdo-logout-btn',
        title: 'Logout',
        label: 'Logout',
        extraClass: 'wrdo-logout-action',
        svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
      },
    ];

    for (const def of actionDefs) {
      const btn = document.createElement('button');
      btn.className = 'wrdo-topnav-action' + (def.extraClass ? ` ${def.extraClass}` : '');
      btn.id = def.id;
      btn.title = def.title;
      btn.setAttribute('aria-label', def.label);
      btn.type = 'button';
      btn.innerHTML = def.svg;
      actions.appendChild(btn);
    }

    nav.appendChild(actions);

    // Wire up action buttons after DOM is available (deferred)
    setTimeout(() => {
      document.getElementById('wrdo-search-btn')?.addEventListener('click', () => {
        document.querySelector<HTMLElement>('.search-btn')?.click();
      });
      document.getElementById('wrdo-settings-btn')?.addEventListener('click', () => {
        document.querySelector<HTMLElement>('.settings-btn')?.click();
      });
      document.getElementById('wrdo-notif-btn')?.addEventListener('click', () => {
        document.querySelector<HTMLElement>('#fullscreenBtn')?.click();
      });
      document.getElementById('wrdo-logout-btn')?.addEventListener('click', () => {
        document.querySelector<HTMLElement>('#wrdoLogoutBtn')?.click();
      });
    }, 0);

    return nav;
  }

  private activateTab(tabId: string): void {
    if (tabId === this.activeTabId) return;
    this.activeTabId = tabId;

    // Update button states
    const buttons = this.nav.querySelectorAll<HTMLButtonElement>('[data-tab-id]');
    buttons.forEach(btn => {
      const isActive = btn.getAttribute('data-tab-id') === tabId;
      btn.classList.toggle('wrdo-topnav-tab--active', isActive);
      btn.setAttribute('aria-selected', String(isActive));
    });

    const tab = TABS.find(t => t.id === tabId);
    if (!tab) return;

    if (tab.url === null) {
      // Dashboard — show panel grid, hide iframe
      this.showDashboard();
    } else if (tab.url === 'agents') {
      // Coming soon page
      this.showComingSoon();
    } else {
      // External URL in iframe
      this.showIframe(tab.url, tab.label);
    }
  }

  private showDashboard(): void {
    this.mainContent?.classList.remove('wrdo-topnav-hidden');
    this.iframeContainer.setAttribute('aria-hidden', 'true');
    this.iframeContainer.classList.remove('wrdo-topnav-iframe-container--visible');
    this.iframeEl.classList.remove('wrdo-topnav-iframe--active');
    this.comingSoonEl.classList.remove('wrdo-topnav-coming-soon--visible');
  }

  private showIframe(url: string, label: string): void {
    this.mainContent?.classList.add('wrdo-topnav-hidden');
    this.iframeEl.src = url;
    this.iframeEl.setAttribute('title', label);
    this.iframeEl.classList.add('wrdo-topnav-iframe--active');
    this.comingSoonEl.classList.remove('wrdo-topnav-coming-soon--visible');
    this.iframeContainer.removeAttribute('aria-hidden');
    this.iframeContainer.classList.add('wrdo-topnav-iframe-container--visible');
  }

  private showComingSoon(): void {
    this.mainContent?.classList.add('wrdo-topnav-hidden');
    this.iframeEl.src = 'about:blank';
    this.iframeEl.classList.remove('wrdo-topnav-iframe--active');
    this.comingSoonEl.classList.add('wrdo-topnav-coming-soon--visible');
    this.iframeContainer.removeAttribute('aria-hidden');
    this.iframeContainer.classList.add('wrdo-topnav-iframe-container--visible');
  }

  /**
   * Mount the TopNav into the app container.
   * Must be called after the container's innerHTML has been set by renderLayout().
   * Inserts the nav before the .header, and inserts the iframe wrapper after .main-content.
   */
  mount(container: HTMLElement): void {
    this.mainContent = container.querySelector<HTMLElement>('.main-content');

    // Insert nav before the .header element
    const header = container.querySelector<HTMLElement>('.header');
    if (header) {
      container.insertBefore(this.nav, header);
    } else {
      container.prepend(this.nav);
    }

    // Insert iframe container right after main-content
    if (this.mainContent && this.mainContent.parentNode) {
      this.mainContent.insertAdjacentElement('afterend', this.iframeContainer);
    } else {
      container.appendChild(this.iframeContainer);
    }
  }

  destroy(): void {
    this.nav.remove();
    this.iframeContainer.remove();
    this.mainContent?.classList.remove('wrdo-topnav-hidden');
  }
}

/**
 * Creates and mounts the TopNav, but only for the wrdo variant.
 * Returns the instance so callers can destroy() it, or null if not applicable.
 */
export function mountTopNav(container: HTMLElement): TopNav | null {
  if (SITE_VARIANT !== 'wrdo') return null;
  const nav = new TopNav();
  nav.mount(container);
  return nav;
}
