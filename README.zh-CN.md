# essh

[English](./README.md) | 简体中文

一个简洁的服务器 SSH 配置管理 CLI 工具。

https://github.com/user-attachments/assets/4e59df99-b0a5-4b17-97b1-7a55404d4049

## 功能特性

- 🔐 使用 [age](https://github.com/FiloSottile/age) 加密保护私钥
- 📦 配置与工具分离，支持团队协作
- 🚀 快速连接服务器，无需记住 IP 和密钥路径
- 📝 交互式管理服务器配置

## 安装

```bash
npx @yuexiaoliang1993/essh <command>
```

或全局安装：

```bash
npm install -g @yuexiaoliang1993/essh
essh <command>
```

## 快速开始

### 1. 初始化配置

```bash
essh init
```

按提示输入私有配置仓库地址和密码。

### 2. 解密密钥

```bash
essh setup
```

### 3. 连接服务器

```bash
# 交互式选择
essh connect

# 直接连接指定服务器
essh connect <name>
```

## 命令列表

| 命令 | 描述 |
|------|------|
| `essh init` | 初始化配置，克隆私有仓库 |
| `essh setup` | 解密密钥并配置 SSH |
| `essh connect [name]` | 连接服务器 |
| `essh list` | 列出所有服务器 |
| `essh add` | 添加新服务器（交互式） |
| `essh remove [name]` | 删除服务器 |
| `essh encrypt` | 重新加密并推送到仓库 |

## 配置仓库结构

私有仓库应包含以下文件：

```
essh-config/
├── servers.json      # 服务器列表
├── keys/
│   ├── server1.key.age   # 加密后的私钥
│   └── server2.key.age
└── .gitignore
```

### servers.json 格式

```json
{
  "servers": [
    {
      "name": "home",
      "host": "192.168.1.100",
      "user": "admin",
      "port": 22,
      "key": "keys/home.key.age",
      "label": "家里服务器"
    }
  ]
}
```

## 环境变量

```bash
# 通过环境变量提供密码（适合自动化脚本）
export ESSH_PASSWORD="your-password"
essh setup
```

## License

MIT
