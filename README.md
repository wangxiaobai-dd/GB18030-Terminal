# GB18030 Terminal

GB18030/GB2312 终端编码转换插件，解决 Cursor/VSCode 连接 GB18030 编码服务器时中文乱码问题。

## 功能

- 自动将服务器 GB18030/GB2312 编码转换为 UTF-8 显示
- 支持配置多个服务器，快速切换

## 使用方法

1. 在设置里配置服务器列表
2. `Ctrl+Shift+P` → `Open GB18030 Terminal` 打开终端
3. 多个服务器时会弹出选择菜单

## 设置示例

在 `settings.json` 里添加以下配置：
```json
"gb18030-terminal.servers": [
  {
    "host": "192.168.1.100",
    "user": "root",
    "password": "your_password"
  },
  {
    "host": "192.168.1.200",
    "user": "root",
    "password": "your_password"
  }
]
```

## 配置项说明
### servers 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| user | string | 是 | 用户名 |
| password | string | 是 | 密码 |
| host | string | 是 | 服务器地址 |
| name | string | 否 | 服务器名称 |
| port | number | 否 | 端口，默认 22 |