// Platform adapter interface — implement this for each e-commerce platform

export interface PlatformAdapter {
  platform: string;
  parseWebhook(request: Request, shop: ShopConfig): Promise<ParseResult>;
  sendReply(shop: ShopConfig, buyerUid: string, text: string): Promise<void>;
}

export type ParseResult =
  | { type: "verify" }
  | { type: "messages"; messages: IncomingMessage[] };

export interface IncomingMessage {
  buyerUid: string;
  text: string;
  messageId: string;
}

export interface ShopConfig {
  id: string;
  platform: string;
  credentials: Record<string, string>;
  knowledge: string;
}
