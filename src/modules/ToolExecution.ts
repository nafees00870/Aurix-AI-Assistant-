/**
 * ToolExecution module
 * Bridges Gemini Live function calling responses with browser actions,
 * interactive action cards, safe external linking, and theme modifications.
 */

import { ToolActionItem, VisualizerThemeKey } from './AurixState';

export interface ToolExecutionCallbacks {
  onThemeChange?: (theme: VisualizerThemeKey) => void;
  onToolExecuted?: (action: ToolActionItem) => void;
  onDiagnosticsReceived?: (data: any) => void;
  onClipboardCopy?: (text: string, label: string) => void;
}

export class ToolExecutionManager {
  private callbacks: ToolExecutionCallbacks;
  private actionHistory: ToolActionItem[] = [];

  constructor(callbacks: ToolExecutionCallbacks) {
    this.callbacks = callbacks;
  }

  private async copyTextSafely(text: string): Promise<boolean> {
    if (!text) return false;

    // Try modern Clipboard API if focused
    if (navigator?.clipboard?.writeText && document.hasFocus()) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        // Fall back to execCommand below
      }
    }

    // Fallback using temporary textarea
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      textArea.setAttribute('readonly', '');
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (fallbackErr) {
      console.warn('[ToolExecution] Clipboard copy notice (unfocused context):', fallbackErr);
      return false;
    }
  }

  public handleToolExecution(toolName: string, data: any): ToolActionItem {
    const actionItem: ToolActionItem = {
      id: `action_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tool: toolName,
      data,
      timestamp: new Date(),
      url: data?.url,
      title: data?.title || this.getDefaultTitle(toolName, data),
    };

    this.actionHistory.unshift(actionItem);
    if (this.actionHistory.length > 50) this.actionHistory.pop();

    switch (toolName) {
      case 'openWebsite':
      case 'searchWeb': {
        if (data?.url) {
          // Attempt safe popup open (or user can click the UI action card)
          try {
            window.open(data.url, '_blank', 'noopener,noreferrer');
          } catch (e) {
            console.warn('[ToolExecution] Browser popup blocked; user can use UI action card', e);
          }
        }
        break;
      }

      case 'changeVisualizerTheme': {
        const themeKey = (data?.theme || 'cyan').toLowerCase() as VisualizerThemeKey;
        const validThemes: VisualizerThemeKey[] = ['cyan', 'magenta', 'emerald', 'amber', 'violet'];
        if (validThemes.includes(themeKey)) {
          this.callbacks.onThemeChange?.(themeKey);
        }
        break;
      }

      case 'getSystemDiagnostics': {
        this.callbacks.onDiagnosticsReceived?.(data);
        break;
      }

      case 'copyToClipboard': {
        if (data?.text) {
          this.copyTextSafely(data.text);
          this.callbacks.onClipboardCopy?.(data.text, data.label || 'Copied to clipboard');
        }
        break;
      }

      default:
        console.log('[ToolExecution] Unknown tool:', toolName, data);
    }

    this.callbacks.onToolExecuted?.(actionItem);
    return actionItem;
  }

  public getHistory(): ToolActionItem[] {
    return [...this.actionHistory];
  }

  private getDefaultTitle(toolName: string, data: any): string {
    switch (toolName) {
      case 'openWebsite':
        return data?.searchQuery ? `Searching for "${data.searchQuery}"` : `Navigating to ${data?.service || 'Website'}`;
      case 'searchWeb':
        return `Web Search: ${data?.query || ''}`;
      case 'changeVisualizerTheme':
        return `Visual Theme: ${data?.theme || ''}`;
      case 'getSystemDiagnostics':
        return 'Diagnostics Telemetry';
      case 'copyToClipboard':
        return data?.label || 'Clipboard Sync';
      default:
        return toolName;
    }
  }
}
