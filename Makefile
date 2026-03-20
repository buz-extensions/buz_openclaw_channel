.PHONY: install dev test clean link unlink validate release

# 默认目标
.DEFAULT_GOAL := help

# 变量
OPENCLAW_CONFIG_DIR := $(if $(filter Darwin,$(shell uname -s)),\
	$(HOME)/Library/Application	support/openclaw,\
	$(if $(XDG_CONFIG_HOME),$(XDG_CONFIG_HOME)/openclaw,$(HOME)/.config/openclaw))
EXTENSIONS_DIR := $(OPENCLAW_CONFIG_DIR)/extensions
TARGET_DIR := $(EXTENSIONS_DIR)/buz

help: ## 显示帮助信息
	@echo "Buz OpenClaw Channel - Makefile"
	@echo ""
	@echo "可用命令:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## 运行安装脚本
	@echo "🚀 开始安装..."
	@./install.sh

quick-install: ## 快速本地安装（开发用）
	@echo "⚡ 快速安装..."
	@./scripts/quick-install.sh

link: ## 链接到 OpenClaw extensions
	@echo "🔗 链接到 OpenClaw..."
	@mkdir -p "$(EXTENSIONS_DIR)"
	@if [ -L "$(TARGET_DIR)" ]; then rm "$(TARGET_DIR)"; fi
	@ln -sf "$(PWD)" "$(TARGET_DIR)"
	@echo "✅ 链接完成: $(TARGET_DIR) -> $(PWD)"

unlink: ## 从 OpenClaw 移除链接
	@echo "🔓 移除链接..."
	@if [ -L "$(TARGET_DIR)" ]; then rm "$(TARGET_DIR)" && echo "✅ 已移除"; else echo "⚠️ 未找到链接"; fi

deps: ## 安装 npm 依赖
	@echo "📦 安装依赖..."
	@npm install

dev: link deps ## 开发模式（链接+安装依赖）
	@echo "🛠️ 开发环境准备完成"
	@echo "编辑代码后运行: openclaw --channel buz"

validate: ## 验证安装
	@echo "✅ 运行验证..."
	@./validate.sh

test: ## 运行测试
	@echo "🧪 运行测试..."
	@npm test 2>/dev/null || echo "⚠️ 测试未配置"

clean: unlink ## 清理（移除链接+删除依赖）
	@echo "🧹 清理..."
	@rm -rf node_modules
	@echo "✅ 清理完成"

restart: ## 重启 OpenClaw
	@echo "🔄 重启 OpenClaw..."
	@-pkill -f "openclaw.*channel buz" 2>/dev/null || true
	@sleep 1
	@openclaw --channel buz &

logs: ## 查看 OpenClaw 日志
	@echo "📜 查看日志..."
	@openclaw logs --follow 2>/dev/null || tail -f $(OPENCLAW_CONFIG_DIR)/logs/*.log 2>/dev/null || echo "无法查看日志"

config: ## 编辑配置文件
	@echo "📝 打开配置文件..."
	@code "$(OPENCLAW_CONFIG_DIR)/config.yaml" 2>/dev/null || \
		vim "$(OPENCLAW_CONFIG_DIR)/config.yaml" 2>/dev/null || \
		echo "请手动编辑: $(OPENCLAW_CONFIG_DIR)/config.yaml"

status: ## 查看 OpenClaw 状态
	@openclaw status 2>/dev/null || echo "无法获取状态"

release: ## 准备发布（清理+验证）
	@echo "📦 准备发布..."
	@make clean
	@make validate
	@echo "✅ 准备就绪，可以推送到 GitHub"

.DEFAULT:
	@echo "未知命令: $@"
	@echo "运行 'make help' 查看可用命令"
