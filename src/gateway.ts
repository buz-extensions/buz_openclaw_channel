import { resolve } from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { handleInboundMessage } from "./inbound.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const activeStreams = new Map<string, grpc.ClientDuplexStream<any, any>>();
export const activeClients = new Map<string, any>();
const streamReadyState = new Map<string, boolean>();
const streamWaiters = new Map<
  string,
  Array<{ resolve: (stream: grpc.ClientDuplexStream<any, any>) => void; reject: (err: Error) => void }>
>();

function setStatus(ctx: any, patch: Record<string, unknown>) {
  console.log(`[buz gateway] setStatus called:`, patch);
  ctx.setStatus?.({
    accountId: ctx.account?.accountId || "default",
    ...patch,
  });
}

function resolvePendingWaiters(accountId: string, stream: grpc.ClientDuplexStream<any, any>) {
  const waiters = streamWaiters.get(accountId);
  if (!waiters?.length) {
    return;
  }
  streamWaiters.delete(accountId);
  for (const waiter of waiters) {
    waiter.resolve(stream);
  }
}

function rejectPendingWaiters(accountId: string, err: Error) {
  const waiters = streamWaiters.get(accountId);
  if (!waiters?.length) {
    return;
  }
  streamWaiters.delete(accountId);
  for (const waiter of waiters) {
    waiter.reject(err);
  }
}

export function isStreamReady(accountId: string): boolean {
  return streamReadyState.get(accountId) === true && activeStreams.has(accountId);
}

export async function waitForReadyStream(
  accountId: string,
  timeoutMs = 3000,
): Promise<grpc.ClientDuplexStream<any, any>> {
  const existing = activeStreams.get(accountId);
  if (existing && isStreamReady(accountId)) {
    return existing;
  }

  return await new Promise<grpc.ClientDuplexStream<any, any>>((resolve, reject) => {
    const timer = setTimeout(() => {
      const waiters = streamWaiters.get(accountId) ?? [];
      streamWaiters.set(
        accountId,
        waiters.filter((entry) => entry.resolve !== wrappedResolve),
      );
      reject(new Error(`[buz] Timed out waiting for ready gRPC stream for account ${accountId}`));
    }, timeoutMs);

    const wrappedResolve = (stream: grpc.ClientDuplexStream<any, any>) => {
      clearTimeout(timer);
      resolve(stream);
    };
    const wrappedReject = (err: Error) => {
      clearTimeout(timer);
      reject(err);
    };

    const current = streamWaiters.get(accountId) ?? [];
    current.push({ resolve: wrappedResolve, reject: wrappedReject });
    streamWaiters.set(accountId, current);
  });
}

export async function startGateway(ctx: any, serverAddress: string, secretKey: string) {
  const PROTO_PATH = resolve(__dirname, "../proto/buz.proto");

  let packageDefinition;
  try {
    packageDefinition = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });
    console.log("[buz gateway] proto loaded successfully");
  } catch (err: any) {
    console.error("[buz gateway] failed to load proto:", err.message);
    throw err;
  }

  const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
  const bridgePackage = protoDescriptor.buz.dc.ai.bridge;
  console.log("[buz gateway] bridgePackage exists:", !!bridgePackage);
  console.log(
    "[buz gateway] OpenClawBridgeService exists:",
    !!bridgePackage?.OpenClawBridgeService,
  );

  const useSsl = serverAddress.includes("443") || serverAddress.startsWith("https");
  console.log("[buz gateway] using SSL:", useSsl);

  const credentials = useSsl ? grpc.credentials.createSsl() : grpc.credentials.createInsecure();

  const cleanAddress = serverAddress.replace(/^https?:\/\//, "");
  console.log("[buz gateway] connecting to:", cleanAddress);

  let client;
  try {
    client = new bridgePackage.OpenClawBridgeService(cleanAddress, credentials);
    console.log("[buz gateway] gRPC client created");
  } catch (err: any) {
    console.error("[buz gateway] failed to create client:", err.message);
    throw err;
  }

  const accountId = ctx.account.accountId;
  console.log("[buz gateway] accountId:", accountId);
  activeClients.set(accountId, client);
  console.log("[buz gateway] client stored in activeClients, total:", activeClients.size);

  let stream: grpc.ClientDuplexStream<any, any> | null = null;
  let reconnectAttempts = 0;
  let everConnected = false;
  let isActive = true;
  let pingInterval: NodeJS.Timeout | null = null;
  let reconnectTimer: NodeJS.Timeout | null = null;

  const cleanupStream = () => {
    console.log("[buz gateway] cleanupStream called");
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }
    streamReadyState.set(accountId, false);
    activeStreams.delete(accountId);
    if (stream) {
      const current = stream;
      stream = null;
      current.removeAllListeners();
      try {
        current.cancel();
      } catch (err: any) {
        console.warn("[buz gateway] stream cancel during cleanup failed:", err?.message || String(err));
      }
    }
  };

  const scheduleReconnect = (reason?: string) => {
    console.log(`[buz gateway] scheduleReconnect called, reason: ${reason || "none"}`);
    cleanupStream();
    rejectPendingWaiters(
      accountId,
      new Error(`[buz] gRPC stream unavailable for account ${accountId}${reason ? `: ${reason}` : ""}`),
    );
    setStatus(ctx, {
      connected: false,
      running: true,
      ...(reason ? { lastError: reason } : {}),
    });

    if (!isActive || ctx.abortSignal?.aborted) {
      console.log("[buz gateway] aborting reconnect (isActive=false or aborted)");
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
    reconnectAttempts += 1;
    console.log(`[buz gateway] reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);
    ctx.log?.warn?.(
      `[${accountId}] buz gRPC disconnected${reason ? `: ${reason}` : ""}; reconnecting in ${delay}ms`,
    );
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delay);
  };

  const connect = () => {
    console.log("[buz gateway] connect() called");
    if (!isActive || ctx.abortSignal?.aborted) {
      console.log("[buz gateway] aborting connect (isActive=false or aborted)");
      return;
    }

    cleanupStream();
    setStatus(ctx, {
      connected: false,
      running: true,
      lastError: everConnected ? null : "connecting",
    });

    const metadata = new grpc.Metadata();
    metadata.add("authorization", `Bearer ${secretKey}`);
    metadata.add("x-openclaw-id", accountId);
    console.log("[buz gateway] metadata created with authorization header");

    try {
      stream = client.ConnectStream(metadata);
      console.log("[buz gateway] stream created:", !!stream);
    } catch (err: any) {
      console.error("[buz gateway] failed to create gRPC stream:", err?.message || String(err));
      ctx.log?.error?.(
        `[${accountId}] failed to create gRPC stream: ${err?.message || String(err)}`,
      );
      scheduleReconnect(err?.message || String(err));
      return;
    }

    if (!stream) {
      console.error("[buz gateway] stream is null after creation");
      ctx.log?.error?.(`[${accountId}] failed to create gRPC stream: stream is null`);
      scheduleReconnect("stream is null");
      return;
    }

    streamReadyState.set(accountId, false);

    const authRequest = {
      auth_req: {
        secret_key: secretKey,
        openclaw_id: accountId,
      },
    };

    try {
      stream.write(authRequest);
    } catch (err: any) {
      console.error("[buz gateway] failed to send auth request:", err?.message);
      scheduleReconnect(err?.message || "failed to send auth request");
      return;
    }

    stream.on("data", async (msg: any) => {
      if (msg.auth_res) {
        if (msg.auth_res.success) {
          everConnected = true;
          reconnectAttempts = 0;
          activeStreams.set(accountId, stream!);
          streamReadyState.set(accountId, true);
          resolvePendingWaiters(accountId, stream!);
          setStatus(ctx, {
            running: true,
            connected: true,
            lastError: null,
            lastStartAt: Date.now(),
          });
          ctx.log?.info?.(`[${accountId}] buz gRPC authenticated successfully.`);
          console.log("[buz gateway] authentication successful");

          if (pingInterval) clearInterval(pingInterval);
          pingInterval = setInterval(() => {
            if (stream && streamReadyState.get(accountId) === true) {
              try {
                stream.write({
                  ping: { timestamp: Date.now() },
                });
              } catch (err: any) {
                ctx.log?.warn?.(
                  `[${accountId}] failed to send buz heartbeat: ${err?.message || String(err)}`,
                );
              }
            }
          }, 30000);
          console.log("[buz gateway] heartbeat interval set (30s)");
        } else {
          const reason = `Auth failed: ${msg.auth_res.error_message || "unknown error"}`;
          console.error("[buz gateway] authentication failed:", reason);
          ctx.log?.error?.(`[${accountId}] ${reason}`);
          scheduleReconnect(reason);
        }
        return;
      }

      if (msg.inbound_msg) {
        console.log("[buz gateway] received inbound message");
        setStatus(ctx, {
          lastInboundAt: Date.now(),
          running: true,
          connected: true,
        });
        await handleInboundMessage(ctx, msg.inbound_msg);
        return;
      }

      if (msg.pong) {
        return;
      }

      console.log("[buz gateway] received unknown message type:", Object.keys(msg));
    });

    stream.on("end", () => {
      console.log("[buz gateway] stream ended");
      scheduleReconnect("stream ended");
    });

    stream.on("error", (err: any) => {
      const reason = err?.message || String(err);
      console.error("[buz gateway] stream error:", reason);
      ctx.log?.error?.(`[${accountId}] gRPC stream error: ${reason}`);
      scheduleReconnect(reason);
    });

    console.log("[buz gateway] stream event handlers registered");
  };

  console.log("[buz gateway] initializing connection...");
  setStatus(ctx, {
    running: true,
    connected: false,
    lastError: null,
    lastStartAt: Date.now(),
  });
  connect();
  console.log("[buz gateway] connect() invoked");

  ctx.abortSignal?.addEventListener("abort", () => {
    console.log("[buz gateway] abort signal received");
    isActive = false;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    rejectPendingWaiters(accountId, new Error(`[buz] gateway aborted for account ${accountId}`));
    cleanupStream();
    const activeClient = activeClients.get(accountId);
    if (activeClient) {
      activeClient.close();
      activeClients.delete(accountId);
    }
    setStatus(ctx, {
      connected: false,
      running: false,
      lastStopAt: Date.now(),
    });
  });

  return {
    running: true,
    connected: false,
    lastStartAt: Date.now(),
    lastError: null,
  };
}

export async function stopGateway(ctx: any) {
  console.log("[buz gateway] stopGateway called");
  const accountId = ctx.account?.accountId || "default";
  console.log("[buz gateway] stopping account:", accountId);

  streamReadyState.set(accountId, false);
  rejectPendingWaiters(accountId, new Error(`[buz] stop requested for account ${accountId}`));

  const stream = activeStreams.get(accountId);
  if (stream) {
    console.log("[buz gateway] cancelling stream");
    try {
      stream.cancel();
    } catch (err: any) {
      console.warn("[buz gateway] stopGateway cancel failed:", err?.message || String(err));
    }
    activeStreams.delete(accountId);
  }

  const client = activeClients.get(accountId);
  if (client) {
    console.log("[buz gateway] closing client");
    client.close();
    activeClients.delete(accountId);
  }

  ctx.setStatus?.({
    accountId,
    connected: false,
    running: false,
    lastStopAt: Date.now(),
  });
  console.log("[buz gateway] stopGateway complete");
}
