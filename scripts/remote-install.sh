#!/bin/bash

# =============================================================================
# Buz OpenClaw Channel - 远程一键安装脚本
# =============================================================================
# 一键安装命令:
#   curl -fsSL https://raw.githubusercontent.com/yourusername/buz-openclaw-channel/main/scripts/remote-install.sh | bash
# 
# 带参数安装:
#   curl -fsSL ... | bash -s -- --server-url xxx --secret-key xxx
# =============================================================================

set -e

# 默认配置
REPO_URL="${REPO_URL:-https://github.com/yourusername/buz-openclaw-channel}"
BRANCH="${BRANCH:-main}"
SERVER_URL="${SERVER_URL:-}"
SECRET_KEY="${SECRET_KEY:-}"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 解析命令行参数
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --server-url)
                SERVER_URL="$2"
                shift 2
                ;;
            --secret-key)
                SECRET_KEY="$2"
                shift 2
                ;;
            --account-name)
                ACCOUNT_NAME="$2"
                shift 2
                ;;
            *)
                shift
                ;;
        esac
    done
}

# 获取 OpenClaw 目录
get_openclaw_dir() {
    case "$(uname -s)" in
        Darwin*)    echo "$HOME/Library/Application Support/openclaw";;
        Linux*)     echo "${XDG_CONFIG_HOME:-$HOME/.config}/openclaw";;
        *)          echo "$HOME/.config/openclaw";;
    esac
}

# 主安装流程
main() {
    echo "╔═══════════════════════════════════════════════════════════════════╗"
    echo "║         🚀 Buz OpenClaw Channel 一键安装                          ║"
    echo "╚═══════════════════════════════════════════════════════════════════╝"
    echo
    
    parse_args "$@"
    
    local openclaw_dir=$(get_openclaw_dir)
    local extensions_dir="$openclaw_dir/extensions"
    local temp_dir=$(mktemp -d)
    
    # 清理函数
    cleanup() {
        rm -rf "$temp_dir"
    }
    trap cleanup EXIT
    
    print_info "检测到系统: $(uname -s)"
    print_info "OpenClaw 目录: $openclaw_dir"
    
    # 检查依赖
    if ! command -v node &> /dev/null; then
        print_error "Node.js 未安装，请先安装 Node.js 18+"
        exit 1
    fi
    
    if ! command -v openclaw &> /dev/null; then
        print_error "OpenClaw 未安装"
        echo "安装指南: https://docs.openclaw.ai/install"
        exit 1
    fi
    
    # 下载项目
    print_info "正在下载 Buz Channel 扩展..."
    
    if command -v git &> /dev/null; then
        git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$temp_dir/buz" 2>/dev/null
    else
        # 下载并解压
        curl -fsSL "${REPO_URL}/archive/refs/heads/${BRANCH}.tar.gz" | tar -xz -C "$temp_dir"
        mv "$temp_dir/buz-openclaw-channel-$BRANCH" "$temp_dir/buz"
    fi
    
    # 运行本地安装脚本
    print_info "运行安装程序..."
    
    if [ -n "$SERVER_URL" ]; then
        export SERVER_URL
    fi
    if [ -n "$SECRET_KEY" ]; then
        export SECRET_KEY
    fi
    if [ -n "$ACCOUNT_NAME" ]; then
        export ACCOUNT_NAME
    fi
    
    # 执行安装
    cd "$temp_dir/buz"
    
    # 如果提供了参数，使用非交互式配置
    if [ -n "$SERVER_URL" ] && [ -n "$SECRET_KEY" ]; then
        print_info "使用提供的配置进行安装..."
        ./install.sh --local "$temp_dir/buz" --skip-config
        
        # 自动创建配置
        mkdir -p "$openclaw_dir"
        cat > "$openclaw_dir/config.yaml" << CONFIG
channels:
  buz:
    enabled: true
    accounts:
      default:
        enabled: true
        serverUrl: "$SERVER_URL"
        secretKey: "$SECRET_KEY"
        name: "${ACCOUNT_NAME:-Buz Account}"
CONFIG
        print_success "配置已自动创建"
    else
        # 交互式安装
        ./install.sh --local "$temp_dir/buz"
    fi
    
    echo
    print_success "🎉 安装完成！"
    echo
    echo "启动命令:"
    echo "  openclaw --channel buz"
}

main "$@"
