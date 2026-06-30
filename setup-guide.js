import store from './datastore.js';
import toastManager from './toast.js';

class SetupGuideManager {
  constructor() {
    this.currentGuide = null;
    this.currentStep = 0;
    this.guideHistory = [];
    this.isVisible = false;
    this.modal = null;
    this.isDesktop = typeof window !== 'undefined' && window.innerWidth > 768;
    this.setupGuides = {
      windows: this.getWindowsGuide(),
      android: this.getAndroidGuide(),
      ios: this.getIOSGuide(),
      router: this.getRouterGuide(),
      macos: this.getMacGuide(),
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => {
        this.isDesktop = window.innerWidth > 768;
      });
    }
  }

  getEndpoints() {
    const user = store.get('user');
    const profiles = store.get('profiles') || [];
    const activeProfile = profiles.find(p => p.isActive) || profiles[0];
    
    const uid = user?.id || 'demo';
    const baseUrl = window.DNS_SERVER_URL || 'https://toran-dns.onrender.com';
    const doh = `${baseUrl}/${uid}/dns-query`;
    const dot = `${uid}.dns.toran.app`;
    const ipv4 = activeProfile?.ipv4 || '45.90.28.0 / 45.90.30.0';
    
    return { doh, dot, ipv4, uid };
  }

  init() {
    this.createModal();
  }

  createModal() {
    if (typeof document === 'undefined') return;
    const existing = document.getElementById('setup-guide-modal');
    if (existing) {
      this.modal = existing;
      return;
    }
    const modal = document.createElement('div');
    modal.id = 'setup-guide-modal';
    modal.className = 'setup-guide-modal';
    modal.innerHTML = `
      <div class="setup-guide-overlay">
        <div class="setup-guide-container">
          <div class="setup-guide-header">
            <button class="setup-guide-close" onclick="window.setupGuide.hide()">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <div class="setup-guide-title">
              <span class="setup-guide-platform-icon"></span>
              <h3 id="setup-guide-title-text">Setup Guide</h3>
            </div>
            <div class="setup-guide-progress">
              <div class="setup-guide-progress-track"><div class="setup-guide-progress-fill" id="setup-guide-progress-bar" style="width:0%"></div></div>
              <span id="setup-guide-progress-text">Step 0 of 0</span>
            </div>
          </div>
          <div class="setup-guide-body">
            <div class="setup-guide-step-container" id="setup-guide-step-container"></div>
            <div class="setup-guide-navigation">
              <button class="setup-guide-nav-btn setup-guide-prev" onclick="window.setupGuide.previousStep()" disabled>Back</button>
              <div class="setup-guide-step-indicator">
                <span>Step <span id="setup-guide-step-number">1</span> of <span id="setup-guide-total-steps">1</span></span>
              </div>
              <button class="setup-guide-nav-btn setup-guide-next" onclick="window.setupGuide.nextStep()">Next</button>
            </div>
          </div>
          <div class="setup-guide-footer">
            <button class="setup-guide-skip" onclick="window.setupGuide.skip()">Skip — I'll do this later</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    this.modal = modal;
  }

  show(platform) {
    if (!this.setupGuides[platform]) {
      console.error('Setup guide not available for platform: ' + platform);
      return;
    }
    if (!this.modal) {
      this.createModal();
    }
    this.currentGuide = platform;
    this.currentStep = 0;
    const guide = this.setupGuides[platform];
    this.renderStep(guide.steps[0]);
    this.updateProgress(0, guide.steps.length);
    this.isVisible = true;
    this.modal.classList.add('visible');
    this.guideHistory.push({ platform, startedAt: new Date().toISOString(), completed: false });
    if (typeof toastManager !== 'undefined') {
      toastManager.show('Setting up DNS filtering for ' + platform + '...', 'info');
    }
  }

  hide() {
    this.isVisible = false;
    if (this.modal) this.modal.classList.remove('visible');
    if (this.currentGuide) {
      const guide = this.setupGuides[this.currentGuide];
      if (guide && guide.steps[this.currentStep]) {
        guide.steps[this.currentStep].completed = true;
      }
      this.guideHistory = this.guideHistory.map(g => {
        if (g.platform === this.currentGuide && !g.completed) {
          return { ...g, completed: true, completedAt: new Date().toISOString() };
        }
        return g;
      });
    }
    if (typeof toastManager !== 'undefined') {
      toastManager.show('Setup guide closed', 'info', { autoDismiss: 2000 });
    }
  }

  nextStep() {
    const guide = this.setupGuides[this.currentGuide];
    if (!guide) return;
    if (this.currentStep < guide.steps.length - 1) {
      this.currentStep++;
      this.renderStep(guide.steps[this.currentStep]);
      this.updateProgress(this.currentStep + 1, guide.steps.length);
    } else {
      this.finish();
    }
  }

  previousStep() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.renderStep(this.setupGuides[this.currentGuide].steps[this.currentStep]);
      this.updateProgress(this.currentStep + 1, this.setupGuides[this.currentGuide].steps.length);
    }
  }

  finish() {
    const guide = this.setupGuides[this.currentGuide];
    if (guide) {
      guide.steps.forEach(step => { step.completed = true; });
      this.guideHistory = this.guideHistory.map(g => {
        if (g.platform === this.currentGuide) {
          return { ...g, completed: true, completedAt: new Date().toISOString() };
        }
        return g;
      });
    }
    this.isVisible = false;
    if (this.modal) this.modal.classList.remove('visible');
    this.updateProfileForPlatform(this.currentGuide);
    if (typeof toastManager !== 'undefined') {
      toastManager.show(this.currentGuide + ' DNS filtering setup complete!', 'success');
    }
  }

  skip() {
    this.hide();
    if (typeof toastManager !== 'undefined') {
      toastManager.show('Setup guide skipped. You can always access it from Settings > Setup Guide.', 'info', { autoDismiss: 3000 });
    }
  }

  renderStep(step) {
    const container = document.getElementById('setup-guide-step-container');
    if (!container) return;

    // Re-resolve endpoints at render time so user's actual addresses are shown
    const ep = this.getEndpoints();
    const primary = ep.ipv4.split('/')[0].trim();
    const secondary = ep.ipv4.split('/')[1]?.trim() || '45.90.30.0';
    // Override step DNS addresses with current values
    if (step.dnsAddress !== undefined) step.dnsAddress = primary;
    if (step.dnsAddress2 !== undefined) step.dnsAddress2 = secondary;
    const platformIcons = {
      windows: '<svg width="32" height="32" viewBox="0 0 88 88" fill="none"><path d="M0 12.402L35.687 7.42V41.894H0V12.402Z" fill="#00ADEF"/><path d="M40.032 6.856L87.343 0V41.894H40.032V6.856Z" fill="#00ADEF"/><path d="M0 45.506H35.687V79.978L0 74.998V45.506Z" fill="#00ADEF"/><path d="M40.032 45.506H87.343V84.818L40.032 77.976V45.506Z" fill="#00ADEF"/></svg>',
      android: '<svg width="32" height="32" viewBox="0 0 48 48" fill="none"><path d="M7 24C7 16.82 12.82 11 20 11H28C35.18 11 41 16.82 41 24V34C41 35.1 40.1 36 39 36H9C7.9 36 7 35.1 7 34V24Z" fill="#3DDC84"/><circle cx="16" cy="22" r="2" fill="white"/><circle cx="32" cy="22" r="2" fill="white"/><path d="M14 8L11 2" stroke="#3DDC84" stroke-width="2" stroke-linecap="round"/><path d="M34 8L37 2" stroke="#3DDC84" stroke-width="2" stroke-linecap="round"/><rect x="14" y="37" width="4" height="7" rx="2" fill="#3DDC84"/><rect x="30" y="37" width="4" height="7" rx="2" fill="#3DDC84"/><rect x="2" y="20" width="4" height="10" rx="2" fill="#3DDC84"/><rect x="42" y="20" width="4" height="10" rx="2" fill="#3DDC84"/></svg>',
      ios: '<svg width="32" height="32" viewBox="0 0 48 48" fill="none"><rect x="14" y="6" width="20" height="36" rx="4" stroke="#A2AAAD" stroke-width="2.5" fill="none"/><line x1="14" y1="10" x2="34" y2="10" stroke="#A2AAAD" stroke-width="2"/><line x1="22" y1="38" x2="26" y2="38" stroke="#A2AAAD" stroke-width="2" stroke-linecap="round"/></svg>',
      macos: '<svg width="32" height="32" viewBox="0 0 48 48" fill="none"><path d="M33.6 25.2C33.6 21.2 36.8 19.2 37 19.1C34.8 15.8 31.2 15.4 30 15.3C26.6 14.9 23.4 17.2 21.8 17.2C20.1 17.2 17.4 15.3 14.5 15.4C10.8 15.5 7.4 17.7 5.5 21.2C1.4 28.4 4.5 39.2 8.5 44.9C10.5 47.7 12.8 50.8 15.7 50.7C18.5 50.6 19.6 48.9 22.9 48.9C26.2 48.9 27.2 50.7 30.2 50.6C33.2 50.6 35.2 47.9 37.2 45.1C39.4 41.9 40.3 38.8 40.3 38.7C40.3 38.7 37.1 37.3 36.4 33.6C36.4 33.6 35.8 31.2 35.8 28.7C35.8 25.5 37.5 24.2 38.2 23.4C35.4 20.5 31.4 20.4 30 20.3C26.2 20 22.7 22.6 21.5 22.6C20.3 22.6 17.6 20.3 14.2 20.3C10 20.3 6.1 22.8 4 27.1L33.6 25.2Z" fill="#A2AAAD"/></svg>',
      router: '<svg width="32" height="32" viewBox="0 0 48 48" fill="none"><rect x="6" y="20" width="36" height="16" rx="3" stroke="#F59E0B" stroke-width="2.5" fill="none"/><circle cx="14" cy="28" r="2" fill="#F59E0B"/><circle cx="20" cy="28" r="2" fill="#F59E0B"/><line x1="28" y1="28" x2="38" y2="28" stroke="#F59E0B" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="12" x2="12" y2="20" stroke="#F59E0B" stroke-width="2" stroke-linecap="round"/><line x1="24" y1="12" x2="24" y2="20" stroke="#F59E0B" stroke-width="2" stroke-linecap="round"/><line x1="36" y1="12" x2="36" y2="20" stroke="#F59E0B" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="10" r="2" fill="#F59E0B"/><circle cx="24" cy="10" r="2" fill="#F59E0B"/><circle cx="36" cy="10" r="2" fill="#F59E0B"/></svg>',
    };

    const devicesHtml = step.devices && step.devices.length > 0 ? `
      <div class="setup-guide-devices-section">
        <h5>Works on:</h5>
        <div class="setup-guide-devices-list">
          ${step.devices.map(d => `
            <div class="setup-guide-device-item">
              <div class="setup-guide-device-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="1.8"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
              </div>
              <div class="setup-guide-device-info">
                <div class="setup-guide-device-name">${d.name}</div>
                <div class="setup-guide-device-subtitle">${d.subtitle}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : '';

    container.innerHTML = `
      <div class="setup-guide-step-content">
        <div class="setup-guide-step-header">
          <div class="setup-guide-step-icon">${platformIcons[this.currentGuide] || ''}</div>
          <div class="setup-guide-step-title-section">
            <h4>${step.title}</h4>
            <div class="setup-guide-step-meta">
              <span class="setup-guide-step-difficulty">${step.difficulty}</span>
              <span class="setup-guide-step-time">${step.time} min</span>
            </div>
          </div>
        </div>
        <div class="setup-guide-step-body">
          <p class="setup-guide-step-description">${step.description}</p>
          ${step.dnsAddress ? `
            <div style="margin:16px 0;padding:16px;background:linear-gradient(135deg,#EFF4FF,#F0F2F7);border-radius:var(--radius);border:2px solid var(--blue);position:relative;">
              <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;font-weight:600;">Your DNS address</div>
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <code style="flex:1;padding:10px 14px;background:var(--white);border:1px solid var(--border);border-radius:var(--radius-sm);font-size:14px;font-family:var(--font-mono);word-break:break-all;font-weight:500;color:var(--blue-dim);min-width:0;">${step.dnsAddress}</code>
                <button onclick="navigator.clipboard.writeText('${step.dnsAddress.replace(/'/g, "\\'")}').then(()=>{this.innerHTML='<svg width=\\'14\\' height=\\'14\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'#059669\\' stroke-width=\\'2\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\'><polyline points=\\'20 6 9 17 4 12\\'></polyline></svg> Copied!';setTimeout(()=>{this.innerHTML='<svg width=\\'14\\' height=\\'14\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'2\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\'><rect x=\\'9\\' y=\\'9\\' width=\\'13\\' height=\\'13\\' rx=\\'2\\' ry=\\'2\\'></rect><path d=\\'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1\\'></path></svg> Copy';},2000)})" style="display:flex;align-items:center;gap:6px;padding:10px 16px;background:var(--blue);color:var(--white);border:none;border-radius:var(--radius-sm);cursor:pointer;font-size:13px;font-weight:500;font-family:inherit;white-space:nowrap;transition:background 0.2s;" onmouseover="this.style.background='#3B6DE0'" onmouseout="this.style.background='var(--blue)'">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                  Copy
                </button>
              </div>
            </div>
          ` : ''}
          ${step.dnsAddress2 ? `
            <div style="margin:0 0 16px 0;padding:16px;background:linear-gradient(135deg,#ECFDF5,#F0F2F7);border-radius:var(--radius);border:2px solid var(--green);position:relative;">
              <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;font-weight:600;">Alternate DNS address</div>
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <code style="flex:1;padding:10px 14px;background:var(--white);border:1px solid var(--border);border-radius:var(--radius-sm);font-size:14px;font-family:var(--font-mono);word-break:break-all;font-weight:500;color:#059669;min-width:0;">${step.dnsAddress2}</code>
                <button onclick="navigator.clipboard.writeText('${step.dnsAddress2.replace(/'/g, "\\'")}').then(()=>{this.innerHTML='<svg width=\\'14\\' height=\\'14\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'#059669\\' stroke-width=\\'2\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\'><polyline points=\\'20 6 9 17 4 12\\'></polyline></svg> Copied!';setTimeout(()=>{this.innerHTML='<svg width=\\'14\\' height=\\'14\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'2\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\'><rect x=\\'9\\' y=\\'9\\' width=\\'13\\' height=\\'13\\' rx=\\'2\\' ry=\\'2\\'></rect><path d=\\'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1\\'></path></svg> Copy';},2000)})" style="display:flex;align-items:center;gap:6px;padding:10px 16px;background:#059669;color:var(--white);border:none;border-radius:var(--radius-sm);cursor:pointer;font-size:13px;font-weight:500;font-family:inherit;white-space:nowrap;transition:background 0.2s;" onmouseover="this.style.background='#047857'" onmouseout="this.style.background='#059669'">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                  Copy
                </button>
              </div>
            </div>
          ` : ''}
          <div class="setup-guide-instructions">
            <h5>Steps:</h5>
            <ol class="setup-guide-instruction-list">
              ${step.instructions.map(instr => `<li>${instr}</li>`).join('')}
            </ol>
          </div>
          ${step.tip ? `
            <div class="setup-guide-tip">
              <div class="setup-guide-tip-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <div class="setup-guide-tip-content"><strong>Tip:</strong> ${step.tip}</div>
            </div>
          ` : ''}
          ${devicesHtml}
        </div>
      </div>
    `;

    document.getElementById('setup-guide-title-text').textContent = 'Setup Guide: ' + (this.setupGuides[this.currentGuide]?.name || '');
    const prevBtn = document.querySelector('.setup-guide-prev');
    const nextBtn = document.querySelector('.setup-guide-next');
    if (prevBtn) prevBtn.disabled = this.currentStep === 0;
    if (nextBtn) nextBtn.textContent = this.currentStep < this.setupGuides[this.currentGuide].steps.length - 1 ? 'Next' : 'Done';
  }

  updateProgress(current, total) {
    const percentage = (current / total) * 100;
    const bar = document.getElementById('setup-guide-progress-bar');
    const text = document.getElementById('setup-guide-progress-text');
    if (bar) bar.style.width = percentage + '%';
    if (text) text.textContent = 'Step ' + (current + 1) + ' of ' + total;
  }

  updateProfileForPlatform(platform) {
    const profiles = store.get('profiles') || [];
    const activeProfile = profiles.find(p => p.isActive) || profiles[0];
    if (!activeProfile) return;
    const updatedProfile = {
      ...activeProfile,
      setupCompleted: true,
      setupPlatform: platform,
      lastSetupDate: new Date().toISOString(),
      devices: activeProfile.devices?.length > 0 ? activeProfile.devices : [],
      upstreamDns: activeProfile.upstreamDns || 'cloudflare',
      dnssecEnabled: activeProfile.dnssecEnabled !== false,
      ipv6Enabled: activeProfile.ipv6Enabled !== false,
    };
    const updatedProfiles = profiles.map(p => p.id === activeProfile.id ? updatedProfile : p);
    store.set('profiles', updatedProfiles);
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('profile-updated', { detail: updatedProfile }));
    }
  }

  getWindowsGuide() {
    const ep = this.getEndpoints();
    const primary = ep.ipv4.split('/')[0].trim();
    const secondary = ep.ipv4.split('/')[1]?.trim() || '45.90.30.0';
    return {
      name: 'Windows',
      steps: [
        {
          title: 'Open DNS Settings',
          description: 'We need to change where your computer looks up website addresses.',
          difficulty: 'Easy',
          time: 2,
          instructions: [
            'Press <strong>Windows key + I</strong> to open Settings.',
            'Click <strong>Network & internet</strong> on the left.',
            'Click <strong>Ethernet</strong> (or <strong>Wi-Fi</strong> if on wireless).',
            'Click <strong>Edit</strong> next to "DNS server assignment".',
          ],
          tip: 'On Windows 10: Go to Control Panel > Network and Sharing Center > Change adapter settings.',
          devices: [
            { name: 'Windows 11 PC', subtitle: 'Desktop or laptop' },
          ],
        },
        {
          title: 'Enter Your DNS Address',
          description: 'Type in your personal Toran DNS address. This filters out ads and trackers.',
          difficulty: 'Easy',
          time: 1,
          dnsAddress: primary,
          dnsAddress2: secondary,
          instructions: [
            'In the DNS dropdown, select <strong>Manual</strong>.',
            'Turn on <strong>IPv4</strong>.',
            'Copy the <strong>blue address</strong> above and paste it into "Preferred DNS".',
            'Copy the <strong>green address</strong> above and paste it into "Alternate DNS".',
            'Click <strong>Save</strong>.',
          ],
          tip: '',
          devices: [],
        },
        {
          title: 'Check It Works',
          description: 'Make sure your computer is now using Toran DNS.',
          difficulty: 'Easy',
          time: 1,
          instructions: [
            'Open your web browser.',
            'Visit <strong>dnsleaktest.com</strong> and run a test.',
            'You should see "Toran DNS" or the server IP in the results.',
            'Go back to your dashboard — your device should appear in the list.',
          ],
          tip: 'If it doesn\'t work right away, restart your browser or run "ipconfig /flushdns" in Command Prompt.',
          devices: [{ name: 'Done!', subtitle: 'Your PC is now protected' }],
        },
      ],
    };
  }

  getMacGuide() {
    const ep = this.getEndpoints();
    return {
      name: 'macOS',
      steps: [
        {
          title: 'Open Network Settings',
          description: 'We need to change your Mac\'s DNS settings.',
          difficulty: 'Easy',
          time: 2,
          instructions: [
            'Click the <strong>Apple menu</strong> (top-left corner).',
            'Click <strong>System Settings</strong>.',
            'Click <strong>Network</strong> in the sidebar.',
            'Click <strong>Wi-Fi</strong> (or <strong>Ethernet</strong>).',
            'Click <strong>Details</strong> next to your connection.',
          ],
          tip: 'On macOS Ventura or earlier: Go to System Preferences > Network instead.',
          devices: [
            { name: 'Mac', subtitle: 'MacBook, iMac, or Mac mini' },
          ],
        },
        {
          title: 'Enter Your DNS Address',
          description: 'Type in your personal Toran DNS address.',
          difficulty: 'Easy',
          time: 1,
          dnsAddress: ep.ipv4.split('/')[0].trim(),
          dnsAddress2: ep.ipv4.split('/')[1]?.trim() || '45.90.30.0',
          instructions: [
            'Click <strong>DNS</strong> on the left.',
            'Click the <strong>+</strong> button under "DNS Servers".',
            'Copy the <strong>blue address</strong> above and paste it here.',
            'Click <strong>+</strong> again and paste the <strong>green address</strong>.',
            'Click <strong>OK</strong>, then <strong>Apply</strong>.',
          ],
          tip: '',
          devices: [],
        },
        {
          title: 'Check It Works',
          description: 'Make sure your Mac is using Toran DNS.',
          difficulty: 'Easy',
          time: 1,
          instructions: [
            'Open <strong>Safari</strong> or any browser.',
            'Visit <strong>dnsleaktest.com</strong> and run a test.',
            'You should see "Toran DNS" in the results.',
            'Go back to your dashboard — your Mac should appear in the list.',
          ],
          tip: 'If it doesn\'t work, restart your Mac or click "Renew DHCP Lease" in Network settings.',
          devices: [{ name: 'Done!', subtitle: 'Your Mac is now protected' }],
        },
      ],
    };
  }

  getAndroidGuide() {
    const ep = this.getEndpoints();
    return {
      name: 'Android',
      steps: [
        {
          title: 'Download the Intra App',
          description: 'Android doesn\'t have a built-in DoH setting. Intra is a free app from Google that enables it.',
          difficulty: 'Easy',
          time: 1,
          instructions: [
            'Open the <strong>Google Play Store</strong>.',
            'Search for <strong>"Intra"</strong> by Google.',
            'Install and open the app.',
          ],
          tip: 'Intra is free, open-source, and made by Google. No sign-up needed.',
          devices: [
            { name: 'Android phone', subtitle: 'Android 9 or newer' },
            { name: 'Android tablet', subtitle: 'Samsung, Pixel, etc.' },
          ],
        },
        {
          title: 'Enter Your DNS Address',
          description: 'Copy the DoH address below and paste it into Intra.',
          difficulty: 'Easy',
          time: 1,
          dnsAddress: ep.doh,
          instructions: [
            'In Intra, tap <strong>Add custom DNS</strong>.',
            'Paste the <strong>blue address</strong> above.',
            'Toggle Intra <strong>ON</strong>.',
            'That\'s it! Your phone is now protected on all networks.',
          ],
          tip: 'This works on both Wi-Fi and mobile data. Keep Intra running in the background.',
          devices: [{ name: 'Done!', subtitle: 'Your Android is now protected' }],
        },
      ],
    };
  }

  getIOSGuide() {
    const ep = this.getEndpoints();
    const primary = ep.ipv4.split('/')[0].trim();
    const secondary = ep.ipv4.split('/')[1]?.trim() || '45.90.30.0';
    return {
      name: 'iOS',
      steps: [
        {
          title: 'Open Wi-Fi Settings',
          description: 'We need to change DNS settings for your Wi-Fi network.',
          difficulty: 'Easy',
          time: 1,
          instructions: [
            'Open <strong>Settings</strong> on your iPhone or iPad.',
            'Tap <strong>Wi-Fi</strong>.',
            'Tap the <strong>(i)</strong> icon next to your connected network.',
            'Scroll down and tap <strong>Configure DNS</strong>.',
          ],
          tip: 'This only applies to the Wi-Fi network you\'re currently on.',
          devices: [
            { name: 'iPhone', subtitle: 'iPhone or iPod touch' },
            { name: 'iPad', subtitle: 'iPad or iPad mini' },
          ],
        },
        {
          title: 'Enter Your DNS Address',
          description: 'Copy the addresses below and paste them into your DNS settings.',
          difficulty: 'Easy',
          time: 2,
          dnsAddress: primary,
          dnsAddress2: secondary,
          instructions: [
            'Tap <strong>Manual</strong> (instead of Automatic).',
            'Tap <strong>-</strong> to remove any existing DNS servers.',
            'Tap <strong>Add Server</strong> and paste the <strong>blue address</strong> above.',
            'Tap <strong>Add Server</strong> again and paste the <strong>green address</strong>.',
            'Tap <strong>Save</strong> at the top right.',
          ],
          tip: '',
          devices: [],
        },
        {
          title: 'Check It Works',
          description: 'Make sure your device is using Toran DNS.',
          difficulty: 'Easy',
          time: 1,
          instructions: [
            'Open <strong>Safari</strong> and visit <strong>dnsleaktest.com</strong>.',
            'Run a test — you should see "Toran DNS" in the results.',
            'Go back to your dashboard — your device should appear in the list.',
          ],
          tip: 'To protect cellular data too, install a DNS profile from the dashboard.',
          devices: [{ name: 'Done!', subtitle: 'Your iOS device is now protected' }],
        },
      ],
    };
  }

  getRouterGuide() {
    const ep = this.getEndpoints();
    const primary = ep.ipv4.split('/')[0].trim();
    const secondary = ep.ipv4.split('/')[1]?.trim() || '45.90.30.0';
    return {
      name: 'Router',
      steps: [
        {
          title: 'Find Your Router\'s Address',
          description: 'First, we need to find your router\'s settings page.',
          difficulty: 'Easy',
          time: 2,
          instructions: [
            'Look at the back or bottom of your router for a sticker.',
            'Find the "Router IP" or "Gateway" (usually <strong>192.168.1.1</strong> or <strong>192.168.0.1</strong>).',
            'Open a web browser and type that address in the address bar.',
            'Log in with the router\'s username and password (also on the sticker).',
          ],
          tip: 'Common defaults: admin/admin, admin/password, or admin/1234.',
          devices: [
            { name: 'Home router', subtitle: 'Protects all devices at home' },
            { name: 'Office router', subtitle: 'Protects entire office' },
          ],
        },
        {
          title: 'Change DNS Settings',
          description: 'Copy the addresses below and paste them into your router\'s DNS settings.',
          difficulty: 'Medium',
          time: 3,
          dnsAddress: primary,
          dnsAddress2: secondary,
          instructions: [
            'Find <strong>DNS settings</strong> (usually under "Internet", "WAN", or "Network").',
            'Change DNS from "Automatic" to <strong>Manual</strong> or <strong>Custom</strong>.',
            'Paste the <strong>blue address</strong> above into Primary DNS.',
            'Paste the <strong>green address</strong> above into Secondary DNS.',
            'Click <strong>Save</strong> or <strong>Apply</strong>.',
            'Restart your router (unplug for 10 seconds, then plug back in).',
          ],
          tip: 'Every device on your network will now be protected!',
          devices: [],
        },
        {
          title: 'Check It Works',
          description: 'Make sure the router is using Toran DNS.',
          difficulty: 'Easy',
          time: 1,
          instructions: [
            'Connect any device to your Wi-Fi.',
            'Open a browser and visit <strong>dnsleaktest.com</strong>.',
            'Run a test — you should see "Toran DNS" in the results.',
            'Go to your dashboard — you should see multiple devices in the list.',
          ],
          tip: 'It may take a few minutes for all devices to start using the new DNS.',
          devices: [{ name: 'Done!', subtitle: 'Your entire network is now protected' }],
        },
      ],
    };
  }
}

const setupGuide = new SetupGuideManager();

export default setupGuide;
