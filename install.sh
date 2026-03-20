#!/bin/bash

# =============================================================================
# Buz OpenClaw Channel - 一键安装脚本
# =============================================================================
# 用法:
#   curl -fsSL https://raw.githubusercontent.com/yourrepo/buz-openclaw-channel/main/install.sh | bash
#   或本地运行: ./install.sh
# =============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印函数
print_info() { echo -e >&2 "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e >&2 "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e >&2 "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e >&2 "${RED}[ERROR]${NC} $1"; }

# 版本信息
VERSION="1.0.0"
REPO_URL="${REPO_URL:-https://github.com/yourusername/buz-openclaw-channel}"
INSTALL_DIR="${INSTALL_DIR:-}"

# 检测操作系统
detect_os() {
    case "$(uname -s)" in
        Darwin*)    echo "macos";;
        Linux*)     echo "linux";;
        CYGWIN*|MINGW*|MSYS*) echo "windows";;
        *)          echo "unknown";;
    esac
}

OS=$(detect_os)

# 获取 OpenClaw 配置目录
get_openclaw_config_dir() {
    case "$OS" in
        macos)
            echo "$HOME/Library/Application Support/openclaw"
            ;;
        linux)
            if [ -n "$XDG_CONFIG_HOME" ]; then
                echo "$XDG_CONFIG_HOME/openclaw"
            else
                echo "$HOME/.config/openclaw"
            fi
            ;;
        windows)
            echo "$APPDATA/openclaw"
            ;;
        *)
            echo "$HOME/.config/openclaw"
            ;;
    esac
}

# 获取 OpenClaw 扩展目录
get_extensions_dir() {
    local config_dir=$(get_openclaw_config_dir)
    echo "$config_dir/extensions"
}

# 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 检查依赖
check_dependencies() {
    print_info "检查依赖..."
    
    if ! command_exists openclaw; then
        print_error "OpenClaw 未安装"
        echo "请先安装 OpenClaw: https://docs.openclaw.ai/install"
        exit 1
    fi
    
    if ! command_exists node; then
        print_error "Node.js 未安装"
        echo "请先安装 Node.js 18+: https://nodejs.org/"
        exit 1
    fi
    
    # 检查 Node 版本
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js 版本过低，需要 18+，当前版本: $(node --version)"
        exit 1
    fi
    
    print_success "依赖检查通过"
}

# 下载扩展
download_extension() {
    print_info "下载 Buz Channel 扩展..."
    
    local extensions_dir=$(get_extensions_dir)
    local target_dir="$extensions_dir/buz"
    
    # 如果已存在，询问是否覆盖
    if [ -d "$target_dir" ]; then
        print_warning "检测到已存在的安装"
        read -p "是否覆盖? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "安装取消"
            exit 0
        fi
        rm -rf "$target_dir"
    fi
    
    # 创建扩展目录
    mkdir -p "$extensions_dir"
    
    if [ -n "$INSTALL_DIR" ]; then
        # 本地安装模式
        print_info "使用本地安装: $INSTALL_DIR"
        cp -r "$INSTALL_DIR" "$target_dir"
    else
        # 从 GitHub 下载
        print_info "从 GitHub 下载..."
        local temp_dir=$(mktemp -d)
        
        if command_exists git; then
            git clone --depth 1 "$REPO_URL" "$temp_dir/buz"
            cp -r "$temp_dir/buz" "$target_dir"
            rm -rf "$temp_dir"
        else
            # 使用 curl 下载 zip
            curl -fsSL "${REPO_URL}/archive/refs/heads/main.zip" -o "$temp_dir/buz.zip"
            if command_exists unzip; then
                unzip -q "$temp_dir/buz.zip" -d "$temp_dir"
                mv "$temp_dir/buz-openclaw-channel-main" "$target_dir"
            else
                print_error "需要 unzip 命令来解压"
                exit 1
            fi
            rm -rf "$temp_dir"
        fi
    fi
    
    print_success "扩展下载完成: $target_dir"
    echo "$target_dir"
}

# 安装依赖
install_dependencies() {
    local target_dir=$1
    
    print_info "安装 npm 依赖..."
    cd "$target_dir"
    
    if command_exists pnpm; then
        pnpm install
    elif command_exists npm; then
        npm install
    else
        print_error "未找到 npm 或 pnpm"
        exit 1
    fi
    
    print_success "依赖安装完成"
}

# 交互式配置
interactive_config() {
    print_info "配置 Buz Channel..."
    echo
    
    local config_dir=$(get_openclaw_config_dir)
    local config_file="$config_dir/config.yaml"
    
    # 确保配置目录存在
    mkdir -p "$config_dir"
    
    echo -e "${YELLOW}请提供以下配置信息:${NC}"
    echo
    
    # 询问服务器地址
    read -p "gRPC 服务器地址 [buz-dc-ai-grpc-test.yfxn.lzpsap1.com:443]: " server_url
    server_url=${server_url:-buz-dc-ai-grpc-test.yfxn.lzpsap1.com:443}
    
    # 询问密钥
    read -s -p "Secret Key (以 buz_sk_ 开头): " secret_key
    echo
    
    if [ -z "$secret_key" ]; then
        print_warning "未提供密钥，需要手动配置"
        secret_key="YOUR_SECRET_KEY_HERE"
    fi
    
    # 询问账号名称
    read -p "账号名称 [My Buz]: " account_name
    account_name=${account_name:-My Buz}
    
    # 生成配置
    local buz_config="
# Buz Channel Configuration
channels:
  buz:
    enabled: true
    accounts:
      default:
        enabled: true
        serverUrl: \"$server_url\"
        secretKey: \"$secret_key\"
        name: \"$account_name\"
"
    
    # 如果配置文件已存在，询问如何操作
    if [ -f "$config_file" ]; then
        echo
        print_warning "检测到已存在的 OpenClaw 配置文件"
        echo "1) 追加到现有配置"
        echo "2) 创建备份并覆盖"
        echo "3) 跳过配置（手动编辑）"
        read -p "请选择 (1-3) [1]: " choice
        choice=${choice:-1}
        
        case $choice in
            1)
                # 追加配置
                echo -e "\n$buz_config" >> "$config_file"
                print_success "配置已追加到 $config_file"
                ;;
            2)
                # 备份并创建新配置
                cp "$config_file" "$config_file.backup.$(date +%Y%m%d%H%M%S)"
                cat > "$config_file" << CONFIG
# OpenClaw Configuration
$buz_config
CONFIG
                print_success "配置已更新，备份保存在 $config_file.backup.*"
                ;;
            3)
                # 保存配置示例
                echo "$buz_config" > "$config_dir/buz-config-example.yaml"
                print_info "配置示例已保存到 $config_dir/buz-config-example.yaml"
                print_warning "请手动编辑 $config_file 添加配置"
                ;;
        esac
    else
        # 创建新配置
        cat > "$config_file" << CONFIG
# OpenClaw Configuration
$buz_config
CONFIG
        print_success "配置文件已创建: $config_file"
    fi
    
    echo
    print_info "配置预览:"
    echo -e "${BLUE}$(cat "$config_file" | grep -A 10 "channels:")${NC}"
}

# 验证安装
verify_installation() {
    print_info "验证安装..."
    
    local extensions_dir=$(get_extensions_dir)
    local target_dir="$extensions_dir/buz"
    
    # 检查目录
    if [ ! -d "$target_dir" ]; then
        print_error "扩展目录不存在: $target_dir"
        return 1
    fi
    
    # 检查关键文件
    local required_files=("package.json" "index.ts" "src/channel.ts" "src/grpc-client.ts")
    for file in "${required_files[@]}"; do
        if [ ! -f "$target_dir/$file" ]; then
            print_error "缺少文件: $file"
            return 1
        fi
    done
    
    # 检查 node_modules
    if [ ! -d "$target_dir/node_modules" ]; then
        print_warning "node_modules 不存在，可能需要运行 npm install"
    fi
    
    # 尝试验证配置（如果 openclaw 支持）
    if command_exists openclaw; then
        print_info "检查 OpenClaw 配置..."
        # openclaw config validate 2>/dev/null || print_warning "配置验证失败"
    fi
    
    print_success "安装验证通过"
}

# 启动向导
start_wizard() {
    echo
    print_info "是否立即启动 OpenClaw?"
    read -p "启动 OpenClaw? (Y/n): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        print_info "启动 OpenClaw..."
        openclaw --channel buz
    else
        print_info "你可以稍后手动启动: openclaw --channel buz"
    fi
}

# 打印安装信息
print_summary() {
    local target_dir=$1
    local config_dir=$(get_openclaw_config_dir)
    
    echo
    echo "╔═══════════════════════════════════════════════════════════════════╗"
    echo "║                    🎉 安装完成!                                   ║"
    echo "╚═══════════════════════════════════════════════════════════════════╝"
    echo
    print_info "安装位置: $target_dir"
    print_info "配置文件: $config_dir/config.yaml"
    echo
    echo "常用命令:"
    echo "  启动 OpenClaw:  openclaw --channel buz"
    echo "  查看状态:       openclaw status"
    echo "  查看日志:       openclaw logs --follow"
    echo "  编辑配置:       code $config_dir/config.yaml"
    echo
    echo "文档:"
    echo "  快速开始: cat $target_dir/GETTING_STARTED.md"
    echo "  安装指南: cat $target_dir/INSTALL.md"
    echo "  命令速查: cat $target_dir/CHEATSHEET.md"
    echo
}

# 主函数
main() {
    echo "╔═══════════════════════════════════════════════════════════════════╗"
    echo "║         Buz OpenClaw Channel 安装脚本 v$VERSION                   ║"
    echo "╚═══════════════════════════════════════════════════════════════════╝"
    echo
    
    # 解析参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            --local)
                INSTALL_DIR="$2"
                shift 2
                ;;
            --repo)
                REPO_URL="$2"
                shift 2
                ;;
            --skip-config)
                SKIP_CONFIG=true
                shift
                ;;
            --help)
                echo "用法: $0 [选项]"
                echo ""
                echo "选项:"
                echo "  --local <path>     从本地目录安装"
                echo "  --repo <url>       指定 GitHub 仓库 URL"
                echo "  --skip-config      跳过交互式配置"
                echo "  --help             显示帮助"
                exit 0
                ;;
            *)
                print_error "未知选项: $1"
                exit 1
                ;;
        esac
    done
    
    # 检查依赖
    check_dependencies
    
    # 下载扩展
    local target_dir=$(download_extension)
    
    # 安装依赖
    install_dependencies "$target_dir"
    
    # 交互式配置
    if [ "$SKIP_CONFIG" != true ]; then
        interactive_config
    else
        print_warning "跳过配置，请手动编辑配置文件"
    fi
    
    # 验证安装
    verify_installation
    
    # 打印安装信息
    print_summary "$target_dir"
    
    # 启动向导
    if [ "$SKIP_CONFIG" != true ]; then
        start_wizard
    fi
}

# 运行主函数
main "$@"
