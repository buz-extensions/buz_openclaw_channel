#!/bin/bash

# =============================================================================
# Buz OpenClaw Channel - 本地快速安装脚本（开发测试用）
# =============================================================================
# 用法: ./scripts/quick-install.sh
# 
# 这个脚本直接从当前目录安装到 OpenClaw，用于开发测试
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}[INFO]${NC} 本地快速安装模式"
echo -e "${BLUE}[INFO]${NC} 项目目录: $PROJECT_DIR"

# 检测 OpenClaw 目录
detect_openclaw_dir() {
    case "$(uname -s)" in
        Darwin*)
            echo "$HOME/Library/Application Support/openclaw"
            ;;
        Linux*)
            if [ -n "$XDG_CONFIG_HOME" ]; then
                echo "$XDG_CONFIG_HOME/openclaw"
            else
                echo "$HOME/.config/openclaw"
            fi
            ;;
        *)
            echo "$HOME/.config/openclaw"
            ;;
    esac
}

OPENCLAW_DIR=$(detect_openclaw_dir)
EXTENSIONS_DIR="$OPENCLAW_DIR/extensions"
TARGET_DIR="$EXTENSIONS_DIR/buz"

echo -e "${BLUE}[INFO]${NC} OpenClaw 目录: $OPENCLAW_DIR"

# 检查是否已存在
if [ -d "$TARGET_DIR" ]; then
    echo -e "${YELLOW}[WARN]${NC} 检测到已存在的安装，正在更新..."
    rm -rf "$TARGET_DIR"
fi

# 创建目录
mkdir -p "$EXTENSIONS_DIR"

# 复制文件
echo -e "${BLUE}[INFO]${NC} 复制扩展文件..."
cp -r "$PROJECT_DIR" "$TARGET_DIR"

# 安装依赖
echo -e "${BLUE}[INFO]${NC} 安装 npm 依赖..."
cd "$TARGET_DIR"

if command -v pnpm &> /dev/null; then
    pnpm install
elif command -v npm &> /dev/null; then
    npm install
else
    echo -e "${YELLOW}[WARN]${NC} 未找到 npm/pnpm，请手动运行 npm install"
fi

# 验证
echo -e "${BLUE}[INFO]${NC} 验证安装..."
if [ -f "$TARGET_DIR/src/channel.ts" ] && [ -f "$TARGET_DIR/index.ts" ]; then
    echo -e "${GREEN}[SUCCESS]${NC} 文件检查通过"
else
    echo -e "${YELLOW}[WARN]${NC} 文件检查失败"
fi

# 输出结果
echo
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║                    🎉 本地安装完成!                               ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo
echo -e "${GREEN}安装位置:${NC} $TARGET_DIR"
echo
echo "下一步:"
echo "1. 编辑配置: code $OPENCLAW_DIR/config.yaml"
echo "2. 添加 Buz Channel 配置（参考 $TARGET_DIR/config-example.yaml）"
echo "3. 启动:     openclaw --channel buz"
echo
echo "查看文档: cat $TARGET_DIR/GETTING_STARTED.md"
