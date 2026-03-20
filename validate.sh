#!/bin/bash

# Buz OpenClaw Channel Extension Validation Script

echo "============================================"
echo "Buz OpenClaw Channel Extension Validator"
echo "============================================"
echo ""

# Check if required files exist
echo "Checking required files..."
REQUIRED_FILES=(
    "package.json"
    "openclaw.plugin.json"
    "tsconfig.json"
    "index.ts"
    "api.ts"
    "runtime-api.ts"
    "setup-entry.ts"
    "README.md"
    "src/types.ts"
    "src/accounts.ts"
    "src/channel.ts"
    "src/grpc-client.ts"
    "src/runtime.ts"
    "src/config-schema.ts"
    "src/proto/buz.proto"
)

ALL_EXIST=true
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✓ $file"
    else
        echo "  ✗ $file (missing)"
        ALL_EXIST=false
    fi
done

echo ""
if [ "$ALL_EXIST" = true ]; then
    echo "✓ All required files present"
else
    echo "✗ Some files are missing"
    exit 1
fi

# Check package.json structure
echo ""
echo "Checking package.json structure..."
if grep -q '"name"' package.json && \
   grep -q '"openclaw"' package.json && \
   grep -q '"channel"' package.json; then
    echo "  ✓ package.json has required fields"
else
    echo "  ✗ package.json missing required fields"
fi

# Check proto file
echo ""
echo "Checking proto file..."
if grep -q 'service OpenClawBridgeService' src/proto/buz.proto; then
    echo "  ✓ OpenClawBridgeService defined"
fi
if grep -q 'ConnectStream' src/proto/buz.proto; then
    echo "  ✓ ConnectStream RPC defined"
fi
if grep -q 'InboundMessage' src/proto/buz.proto; then
    echo "  ✓ InboundMessage defined"
fi
if grep -q 'OutboundMessage' src/proto/buz.proto; then
    echo "  ✓ OutboundMessage defined"
fi

echo ""
echo "============================================"
echo "Validation complete!"
echo "============================================"
