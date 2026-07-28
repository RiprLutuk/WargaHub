import type { AppConfig } from '../config.js';

export function formatWahaChatId(input: string): string {
  const trimmed = input.trim();
  if (trimmed.endsWith('@c.us') || trimmed.endsWith('@g.us')) {
    return trimmed;
  }
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (!digitsOnly) return '';
  const normalized = digitsOnly.startsWith('0') ? `62${digitsOnly.slice(1)}` : digitsOnly;
  return `${normalized}@c.us`;
}

export interface WahaSendTextOptions {
  phone: string;
  text: string;
  session?: string;
}

export interface WahaSendFileOptions {
  phone: string;
  fileUrl: string;
  filename?: string;
  caption?: string;
  session?: string;
}

export interface WahaSessionInfo {
  name: string;
  status: string;
  me?: { id: string; pushName?: string };
}

export interface WahaResult {
  success: boolean;
  id?: string;
  error?: string;
}

export class WahaService {
  constructor(private config: AppConfig) {}

  private get headers(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.config.WAHA_API_KEY) {
      headers['X-Api-Key'] = this.config.WAHA_API_KEY;
      headers.Authorization = `Bearer ${this.config.WAHA_API_KEY}`;
    }
    return headers;
  }

  async sendText(options: WahaSendTextOptions): Promise<WahaResult> {
    if (!this.config.WAHA_ENABLED) {
      return { success: false, error: 'WAHA integration is disabled' };
    }

    const chatId = formatWahaChatId(options.phone);
    if (!chatId) {
      return { success: false, error: 'Invalid phone number format' };
    }

    const payload = {
      session: options.session || this.config.WAHA_SESSION,
      chatId,
      text: options.text,
    };

    try {
      const response = await fetch(`${this.config.WAHA_BASE_URL}/api/sendText`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        return { success: false, error: `WAHA HTTP ${response.status}: ${text}` };
      }

      const resData = (await response.json()) as { id?: string };
      return resData.id ? { success: true, id: resData.id } : { success: true };
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      return { success: false, error: `WAHA Connection Error: ${message}` };
    }
  }

  async sendFile(options: WahaSendFileOptions): Promise<WahaResult> {
    if (!this.config.WAHA_ENABLED) {
      return { success: false, error: 'WAHA integration is disabled' };
    }

    const chatId = formatWahaChatId(options.phone);
    if (!chatId) {
      return { success: false, error: 'Invalid phone number format' };
    }

    const payload = {
      session: options.session || this.config.WAHA_SESSION,
      chatId,
      file: {
        url: options.fileUrl,
        filename: options.filename || 'dokumen.pdf',
      },
      caption: options.caption || '',
    };

    try {
      const response = await fetch(`${this.config.WAHA_BASE_URL}/api/sendFile`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        return { success: false, error: `WAHA HTTP ${response.status}: ${text}` };
      }

      const resData = (await response.json()) as { id?: string };
      return resData.id ? { success: true, id: resData.id } : { success: true };
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      return { success: false, error: `WAHA Connection Error: ${message}` };
    }
  }

  async getSessionStatus(): Promise<{ connected: boolean; status: string; session?: string; error?: string }> {
    if (!this.config.WAHA_ENABLED) {
      return { connected: false, status: 'DISABLED', error: 'Integrasi WAHA belum diaktifkan.' };
    }

    try {
      const response = await fetch(`${this.config.WAHA_BASE_URL}/api/sessions`, {
        method: 'GET',
        headers: this.headers,
      });

      if (!response.ok) {
        return { connected: false, status: 'ERROR', error: `HTTP ${response.status}` };
      }

      const sessions = (await response.json()) as WahaSessionInfo[];
      const activeSession = sessions.find((s) => s.name === this.config.WAHA_SESSION) || sessions[0];
      if (!activeSession) {
        return { connected: false, status: 'SESSION_NOT_FOUND', session: this.config.WAHA_SESSION };
      }

      return {
        connected: activeSession.status === 'WORKING',
        status: activeSession.status,
        session: activeSession.name,
      };
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      return { connected: false, status: 'UNREACHABLE', error: message };
    }
  }

  async sendFormattedNotification(params: {
    phone: string;
    title: string;
    message: string;
    actionUrl?: string;
  }): Promise<WahaResult> {
    let text = `*📢 WargaHub — ${params.title.trim()}*\n\n${params.message.trim()}`;
    if (params.actionUrl) {
      text += `\n\n🔗 Buka tautan: ${params.actionUrl}`;
    }
    text += `\n\n---\n_Pesan otomatis Sistem WargaHub RT/RW_`;

    return this.sendText({ phone: params.phone, text });
  }
}
