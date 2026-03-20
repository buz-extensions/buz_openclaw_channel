# @buz-extensions/buz

buz channel plugin for OpenClaw. This plugin connects OpenClaw to buz through a gRPC bidirectional stream.

## Install

```bash
openclaw plugins install @buz-extensions/buz
```

## Configuration

Configure the `buz` channel in your OpenClaw config.

### Single account

```yaml
channels:
  buz:
    enabled: true
    accounts:
      default:
        enabled: true
        serverAddress: grpc.buz.ai:443
        secretKey: your-secret-key
```

### Multiple accounts

```yaml
channels:
  buz:
    enabled: true
    accounts:
      accountA:
        enabled: true
        serverAddress: grpc.buz.ai:443
        secretKey: secret-key-a
      accountB:
        enabled: true
        serverAddress: grpc.buz.ai:443
        secretKey: secret-key-b
```

## Features

- buz channel registration
- setup wizard support
- inbound message dispatch
- outbound text sending
- account-based runtime management
- gRPC reconnect and heartbeat

## Notes

- Channel id: `buz`
- Requires OpenClaw runtime with plugin support
- The package includes `openclaw.plugin.json` for native plugin validation
