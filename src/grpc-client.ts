import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";
import { fileURLToPath } from "url";
import type { BuzInboundMessage, BuzOutboundMessage } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface BuzGrpcClientOptions {
  serverUrl: string;
  secretKey: string;
  openclawId: string;
  onMessage: (msg: BuzInboundMessage) => void;
  onError?: (error: Error) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export class BuzGrpcClient {
  private client: any;
  private call: any;
  private options: BuzGrpcClientOptions;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 5000;

  constructor(options: BuzGrpcClientOptions) {
    this.options = options;
  }

  public connect(): void {
    try {
      const PROTO_PATH = path.join(__dirname, "proto", "buz.proto");
      
      const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      });

      const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
      const bridgeService = (protoDescriptor as any).buz.dc.ai.bridge.OpenClawBridgeService;

      // 创建 gRPC 客户端
      const credentials = this.options.serverUrl.includes(":443")
        ? grpc.credentials.createSsl()
        : grpc.credentials.createInsecure();

      this.client = new bridgeService(this.options.serverUrl, credentials);

      // 创建 Metadata
      const metadata = new grpc.Metadata();
      metadata.add("authorization", `Bearer ${this.options.secretKey}`);
      metadata.add("x-openclaw-id", this.options.openclawId);

      // 建立双向流
      this.call = this.client.ConnectStream(metadata);

      // 发送鉴权请求 (兼容旧版)
      this.call.write({
        auth_req: {
          secret_key: this.options.secretKey,
          openclaw_id: this.options.openclawId,
        },
      });

      this.call.on("data", (response: any) => {
        this.handleResponse(response);
      });

      this.call.on("error", (error: any) => {
        console.error("[Buz gRPC] Error:", error);
        this.isConnected = false;
        this.options.onError?.(error);
        this.scheduleReconnect();
      });

      this.call.on("end", () => {
        console.log("[Buz gRPC] Stream ended");
        this.isConnected = false;
        this.options.onDisconnect?.();
        this.scheduleReconnect();
      });

      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.options.onConnect?.();
      
    } catch (error) {
      console.error("[Buz gRPC] Failed to connect:", error);
      this.scheduleReconnect();
    }
  }

  private handleResponse(response: any): void {
    if (response.inbound_msg) {
      const msg = response.inbound_msg;
      const inboundMessage: BuzInboundMessage = {
        messageId: msg.message_id || "",
        senderId: msg.sender_id || "",
        senderName: msg.sender_name || "",
        chatType: msg.chat_type === "group" ? "group" : "direct",
        groupId: msg.group_id || undefined,
        contentText: msg.content_text || "",
      };
      this.options.onMessage(inboundMessage);
    } else if (response.auth_res) {
      console.log("[Buz gRPC] Auth response:", response.auth_res.success 
        ? "success" 
        : `failed: ${response.auth_res.error_message}`);
    } else if (response.pong) {
      // 心跳响应，可记录延迟
    }
  }

  public sendMessage(msg: BuzOutboundMessage): boolean {
    if (!this.isConnected || !this.call) {
      console.warn("[Buz gRPC] Cannot send message: not connected");
      return false;
    }

    try {
      this.call.write({
        outbound_msg: {
          reply_to_id: msg.replyToId || "",
          target_id: msg.targetId,
          chat_type: msg.chatType,
          content_text: msg.contentText,
        },
      });
      return true;
    } catch (error) {
      console.error("[Buz gRPC] Failed to send message:", error);
      return false;
    }
  }

  public sendHeartbeat(): boolean {
    if (!this.isConnected || !this.call) {
      return false;
    }

    try {
      this.call.write({
        ping: {
          timestamp: Date.now(),
        },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("[Buz gRPC] Max reconnect attempts reached");
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * this.reconnectAttempts, 60000);
    
    console.log(`[Buz gRPC] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  public disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.isConnected = false;

    if (this.call) {
      try {
        this.call.end();
      } catch (e) {
        // ignore
      }
      this.call = null;
    }

    if (this.client) {
      try {
        this.client.close();
      } catch (e) {
        // ignore
      }
      this.client = null;
    }
  }

  public isActive(): boolean {
    return this.isConnected;
  }
}
