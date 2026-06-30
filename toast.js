/*
 * Toran DNS Toast Notification System
 * Lightweight toast notifications for dashboard alerts and feedback
 */

const TOAST_VERSION = '1.0.0';
class ToastManager {
  constructor() {
    this.container = null;
    this.toasts = [];
    this.id = 0;
    this.autoDismissDelay = 4000;
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  init() {
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    this.container.setAttribute('aria-live', 'polite');
    this.container.setAttribute('aria-atomic', 'true');
    document.body.appendChild(this.container);
  }

  show(message, type = 'info', options = {}) {
    const id = ++this.id;
    const toast = {
      id,
      message,
      type,
      options,
      createdAt: Date.now(),
    };
    this.toasts.push(toast);
    this.renderToast(toast);

    const delay = options.autoDismiss !== undefined ? options.autoDismiss : this.autoDismissDelay;
    if (delay > 0) {
      setTimeout(() => this.remove(id), delay);
    }
    return id;
 }

  showSuccess(message, options = {}) {
    return this.show(message, 'success', options);
  }

  showError(message, options = {}) {
    return this.show(message, 'error', options);
  }

  showWarning(message, options = {}) {
    return this.show(message, 'warning', options);
  }

  remove(id) {
    const index = this.toasts.findIndex(t => t.id === id);
    if (index > -1) {
      this.toasts.splice(index, 1);
      this.render();
    }
  }

  removeAll() {
    this.toasts = [];
    this.render();
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = this.toasts
      .map(toast => this.getToastHtml(toast))
      .join('');
  }

  getToastHtml(toast) {
    const icons = {
      success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>',
      error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    };
    const colors = {
      success: 'var(--green-pale)',
      error: 'var(--red-pale)',
      warning: 'var(--orange-pale)',
      info: 'var(--blue-pale)',
    };
    const textColors = {
      success: '#065F46',
      error: '#991B1B',
      warning: '#92400E',
      info: '#1E40AF',
    };
    const borderColors = {
      success: '#A7F3D0',
      error: '#FECACA',
      warning: '#FED7AA',
      info: '#DBEAFE',
    };
    const iconColor = textColors[toast.type] || textColors.info;

    const actionButtons = toast.options.actions
      ? toast.options.actions.map(action => {
          return `<button onclick="${action.onClick}" class="toast-action ${action.variant || 'primary'}">${action.label}</button>`;
        }).join('')
      : '';

    return `
    <div class="toast" data-toast-id="${toast.id}" style="
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s ease;
      background: ${colors[toast.type] || colors.info};
      border: 1px solid ${borderColors[toast.type] || borderColors.info};
      color: ${iconColor};
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      gap: 12px;
      position: relative;
      overflow: hidden;
    ">
      <div style="flex-shrink: 0;">${icons[toast.type] || icons.info}</div>
      <div style="flex: 1; font-size: 14px; line-height: 1.5;">${toast.message}</div>
      ${actionButtons}
      ${toast.options.closable !== false ? `<button onclick="toastManager.remove(${toast.id})" class="toast-close" style="background: none; border: none; cursor: pointer; padding: 4px; border-radius: 4px; display: flex; align-items: center; justify-content: center;"><!-- Close icon -->
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>` : ''}
    </div>
    `;
  }

  // Auto-dismiss
  setAutoDismiss(delay) {
    this.autoDismissDelay = delay;
  }

  clear() {
    this.removeAll();
  }
}

const toastManager = new ToastManager();
if (typeof window !== 'undefined') window.toastManager = toastManager;

export default toastManager;