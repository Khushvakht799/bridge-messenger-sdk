/**
 * BVG - Binary Vector Graph core for Web
 * Минимальная реализация для мессенджеров
 */

export interface Intent {
  primary: string;
  confidence?: number;
}

export interface State {
  timestamp: number;
  sender: string;
  receiver: string;
  status?: 'sent' | 'delivered' | 'read';
}

export interface BVGMessage {
  id: string;
  type: 'message';
  content: {
    text?: string;
    media?: Uint8Array;
  };
  meta: {
    intent: Intent;
    state: State;
  };
}

export class BVG {
  static serialize(msg: BVGMessage): Uint8Array {
    // Упрощённая сериализация в Uint8Array
    const json = JSON.stringify(msg);
    return new TextEncoder().encode(json);
  }

  static deserialize(data: Uint8Array): BVGMessage {
    const json = new TextDecoder().decode(data);
    return JSON.parse(json) as BVGMessage;
  }

  static createTextMessage(text: string, from: string, to: string): BVGMessage {
    return {
      id: crypto.randomUUID(),
      type: 'message',
      content: { text },
      meta: {
        intent: { primary: 'chat', confidence: 1.0 },
        state: {
          timestamp: Date.now(),
          sender: from,
          receiver: to,
          status: 'sent'
        }
      }
    };
  }
}
