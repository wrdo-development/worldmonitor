import { SITE_VARIANT } from '@/config/variant';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
  toolCalls?: string[];
}

export class ChatSidebar {
  private sidebar: HTMLElement;
  private messagesEl: HTMLElement;
  private inputEl: HTMLTextAreaElement;
  private sendBtn: HTMLButtonElement;
  private readonly uploadBtn: HTMLButtonElement;
  private toggleBtn: HTMLButtonElement;
  private resizeHandle: HTMLElement;
  private collapsed = false;
  private sidebarWidth = 360;
  private messages: ChatMessage[] = [];
  private abortController: AbortController | null = null;
  private mainContent: HTMLElement | null = null;

  constructor() {
    this.sidebar = this.buildSidebar();
    this.toggleBtn = this.buildToggleButton();
    this.resizeHandle = this.buildResizeHandle();
    this.messagesEl = this.sidebar.querySelector('.wrdo-chat-messages')!;
    this.inputEl = this.sidebar.querySelector('.wrdo-chat-input')!;
    this.sendBtn = this.sidebar.querySelector('.wrdo-chat-send')!;
    this.uploadBtn = this.sidebar.querySelector('.wrdo-chat-upload')!;

    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void this.sendMessage();
      }
    });

    this.sendBtn.addEventListener('click', () => {
      void this.sendMessage();
    });

    this.uploadBtn.addEventListener('click', () => {
      alert('File upload coming soon');
    });

    this.toggleBtn.addEventListener('click', () => {
      this.toggleCollapse();
    });
  }

  private buildResizeHandle(): HTMLElement {
    const handle = document.createElement('div');
    handle.className = 'wrdo-chat-resize-handle';
    handle.title = 'Drag to resize';

    let startX = 0;
    let startWidth = 0;

    const onMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      const newWidth = Math.min(Math.max(startWidth + delta, 280), 700);
      this.sidebarWidth = newWidth;
      this.sidebar.style.width = `${newWidth}px`;
      if (this.mainContent) {
        this.mainContent.style.marginLeft = `${newWidth}px`;
      }
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      startX = e.clientX;
      startWidth = this.sidebarWidth;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    return handle;
  }

  private buildSidebar(): HTMLElement {
    const sidebar = document.createElement('div');
    sidebar.className = 'wrdo-chat-sidebar';
    sidebar.setAttribute('role', 'complementary');
    sidebar.setAttribute('aria-label', 'WRDO AI Chat');

    sidebar.innerHTML = `
      <div class="wrdo-chat-header">
        <img class="wrdo-chat-avatar" src="/wrdo/wrdo-avatar.png" alt="WRDO" width="28" height="28" />
        <span class="wrdo-chat-title">WRDO</span>
      </div>
      <div class="wrdo-chat-messages" role="log" aria-live="polite" aria-label="Chat messages"></div>
      <div class="wrdo-chat-controls">
        <select class="wrdo-chat-model-select" aria-label="Select model">
          <option value="free-tool-calling">Free (Gemini Flash)</option>
          <option value="standard-chat">Standard (Claude Sonnet)</option>
        </select>
      </div>
      <div class="wrdo-chat-input-area">
        <textarea
          class="wrdo-chat-input"
          placeholder="Ask WRDO anything…"
          rows="2"
          aria-label="Chat message input"
          maxlength="2000"
        ></textarea>
        <button class="wrdo-chat-upload" type="button" aria-label="Upload file">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        </button>
        <button class="wrdo-chat-send" type="button" aria-label="Send message">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    `;

    return sidebar;
  }

  private buildToggleButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'wrdo-chat-toggle';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Toggle chat sidebar');
    btn.title = 'Toggle WRDO Chat';
    btn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    `;
    btn.addEventListener('click', () => this.toggleCollapse());
    return btn;
  }

  private toggleCollapse(): void {
    this.collapsed = !this.collapsed;
    this.sidebar.classList.toggle('wrdo-chat-sidebar--collapsed', this.collapsed);
    this.toggleBtn.classList.toggle('wrdo-chat-toggle--collapsed', this.collapsed);
    this.toggleBtn.setAttribute('aria-expanded', String(!this.collapsed));

    if (this.mainContent) {
      this.mainContent.classList.toggle('wrdo-chat-open', !this.collapsed);
      this.mainContent.style.marginLeft = this.collapsed ? '0px' : `${this.sidebarWidth}px`;
    }
  }

  private addMessage(msg: ChatMessage): HTMLElement {
    this.messages.push(msg);
    const el = document.createElement('div');
    el.className = `wrdo-chat-message wrdo-chat-message--${msg.role}`;
    el.setAttribute('data-msg-id', msg.id);
    const avatarHtml = msg.role === 'assistant'
      ? `<img class="wrdo-chat-avatar" src="/wrdo/wrdo-avatar.png" alt="WRDO" width="28" height="28" />`
      : '';
    el.innerHTML = `${avatarHtml}<div class="wrdo-chat-message-content">${this.escapeHtml(msg.content)}</div>`;
    this.messagesEl.appendChild(el);
    this.scrollToBottom();
    return el;
  }

  private updateMessage(id: string, content: string, toolCalls?: string[]): void {
    const msg = this.messages.find(m => m.id === id);
    if (msg) {
      msg.content = content;
      if (toolCalls) msg.toolCalls = toolCalls;
    }
    const el = this.messagesEl.querySelector(`[data-msg-id="${id}"]`);
    if (el) {
      const contentEl = el.querySelector('.wrdo-chat-message-content');
      if (contentEl) {
        contentEl.textContent = content;
      }
      if (toolCalls && toolCalls.length > 0) {
        let toolEl = el.querySelector('.wrdo-chat-tools');
        if (!toolEl) {
          toolEl = document.createElement('div');
          toolEl.className = 'wrdo-chat-tools';
          el.appendChild(toolEl);
        }
        toolEl.innerHTML = toolCalls.map(name =>
          `<span class="wrdo-chat-tool-badge">${this.escapeHtml(name)}</span>`
        ).join('');
      }
    }
    this.scrollToBottom();
  }

  private appendToMessage(id: string, chunk: string): void {
    const msg = this.messages.find(m => m.id === id);
    if (msg) {
      msg.content += chunk;
    }
    const el = this.messagesEl.querySelector(`[data-msg-id="${id}"]`);
    if (el) {
      const contentEl = el.querySelector('.wrdo-chat-message-content');
      if (contentEl) {
        contentEl.textContent = (contentEl.textContent ?? '') + chunk;
      }
    }
    this.scrollToBottom();
  }

  private setStreaming(id: string, streaming: boolean): void {
    const el = this.messagesEl.querySelector(`[data-msg-id="${id}"]`);
    if (el) {
      el.classList.toggle('wrdo-chat-message--streaming', streaming);
    }
  }

  private scrollToBottom(): void {
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private generateId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }

  private setInputEnabled(enabled: boolean): void {
    this.inputEl.disabled = !enabled;
    this.sendBtn.disabled = !enabled;
    this.sendBtn.classList.toggle('wrdo-chat-send--loading', !enabled);
  }

  async sendMessage(): Promise<void> {
    const text = this.inputEl.value.trim();
    if (!text) return;

    // Cancel any in-flight request
    this.abortController?.abort();
    this.abortController = new AbortController();

    this.inputEl.value = '';
    this.setInputEnabled(false);

    this.addMessage({ id: this.generateId(), role: 'user', content: text });

    const assistantId = this.generateId();
    this.addMessage({ id: assistantId, role: 'assistant', content: '', streaming: true });
    this.setStreaming(assistantId, true);

    const toolCalls: string[] = [];

    try {
      const resp = await fetch('/api/wrdo/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, platform: 'cave' }),
        signal: this.abortController.signal,
      });

      if (!resp.ok || !resp.body) {
        const errText = await resp.text();
        this.updateMessage(assistantId, `Error: ${resp.status} — ${errText}`);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE lines
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const dataStr = line.slice(6).trim();
          if (!dataStr || dataStr === '[DONE]') continue;

          try {
            const event = JSON.parse(dataStr);
            switch (event.type) {
              case 'chunk':
                if (event.content) {
                  this.appendToMessage(assistantId, event.content);
                }
                break;
              case 'tool_use':
                if (event.name) {
                  toolCalls.push(event.name);
                  this.updateMessage(assistantId,
                    this.messages.find(m => m.id === assistantId)?.content ?? '',
                    [...toolCalls]);
                }
                break;
              case 'done':
                break;
              case 'error':
                this.appendToMessage(assistantId, `\n[Error: ${event.message ?? 'Unknown'}]`);
                break;
            }
          } catch {
            // Non-JSON SSE line — skip
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : 'Unknown error';
      this.updateMessage(assistantId, `Network error: ${msg}`);
    } finally {
      this.setStreaming(assistantId, false);
      this.setInputEnabled(true);
      this.inputEl.focus();
      this.abortController = null;
    }
  }

  /**
   * Mount the chat sidebar into the app container.
   * Inserts fixed sidebar + toggle button. Marks main content
   * so it can be shifted with the `wrdo-chat-open` class.
   */
  mount(container: HTMLElement): void {
    this.mainContent = container.querySelector<HTMLElement>('.main-content');

    // Append resize handle to sidebar
    this.sidebar.appendChild(this.resizeHandle);

    // Insert the sidebar and toggle button at the top level of the page
    document.body.appendChild(this.sidebar);
    document.body.appendChild(this.toggleBtn);

    // Set initial width
    this.sidebar.style.width = `${this.sidebarWidth}px`;

    // Mark main content as chat-open by default (sidebar starts expanded)
    if (this.mainContent) {
      this.mainContent.classList.add('wrdo-chat-open');
      this.mainContent.style.marginLeft = `${this.sidebarWidth}px`;
    }
  }

  destroy(): void {
    this.abortController?.abort();
    this.sidebar.remove();
    this.toggleBtn.remove();
    this.mainContent?.classList.remove('wrdo-chat-open');
    this.mainContent = null;
  }
}

/**
 * Creates and mounts the ChatSidebar, but only for the wrdo variant.
 * Returns the instance so callers can destroy() it, or null if not applicable.
 */
export function mountChatSidebar(container: HTMLElement): ChatSidebar | null {
  if (SITE_VARIANT !== 'wrdo') return null;
  const sidebar = new ChatSidebar();
  sidebar.mount(container);
  return sidebar;
}
