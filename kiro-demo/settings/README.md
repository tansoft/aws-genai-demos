# 生产项目
.kiro/settings.json
{
    "sandbox": "docker",        # 启用沙箱环境
  "autoAccept": false,        # 禁用自动批准
  "excludeTools": [
        "run_shell_command"
    ]  # 禁止执行 Shell 命令
}

# 开发项目
.kiro/settings.json
{
    "sandbox": false,           # 禁用沙箱环境（提升速度）
  "autoAccept": false,        # 依然禁用自动批准
  "coreTools": [
        "all"
    ]        # 允许使用所有工具
}