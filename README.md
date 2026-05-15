# essh

English | [简体中文](./README.zh-CN.md)

A lightweight CLI tool for managing SSH configurations and server connections.

https://github.com/user-attachments/assets/4e59df99-b0a5-4b17-97b1-7a55404d4049

## Features

- 🔐 Secure key encryption using [age](https://github.com/FiloSottile/age)
- 📦 Separate configuration from tool, enabling team collaboration
- 🚀 Quick server connections without remembering IPs or key paths
- 📝 Interactive server management

## Installation

```bash
npx @yuexiaoliang1993/essh <command>
```

Or install globally:

```bash
npm install -g @yuexiaoliang1993/essh
essh <command>
```

## Quick Start

### 1. Initialize Configuration

```bash
essh init
```

Enter your private config repository URL and password when prompted.

### 2. Decrypt Keys

```bash
essh setup
```

### 3. Connect to Server

```bash
# Interactive selection
essh connect

# Direct connection
essh connect <name>
```

## Commands

| Command | Description |
|---------|-------------|
| `essh init` | Initialize configuration and clone private repository |
| `essh setup` | Decrypt keys and configure SSH |
| `essh connect [name]` | Connect to a server |
| `essh list` | List all servers |
| `essh add` | Add a new server (interactive) |
| `essh remove [name]` | Remove a server |
| `essh encrypt` | Re-encrypt and push to repository |

## Agent Skill

essh provides an Agent Skill to help AI agents correctly query servers and execute remote maintenance commands.

The skill source is at `skills/essh/SKILL.md`.

Once installed, when you mention essh or SSH server management, the Agent will automatically use this skill to:

- Query available servers via `essh list`
- Run commands remotely using `ssh essh-<name> "<command>"`
- Check if keys are decrypted and guide you through setup
- Avoid interactive commands that would hang in an Agent environment

## Configuration Repository Structure

Your private repository should contain:

```
essh-config/
├── servers.json      # Server list
├── keys/
│   ├── server1.key.age   # Encrypted private keys
│   └── server2.key.age
└── .gitignore
```

### servers.json Format

```json
{
  "servers": [
    {
      "name": "home",
      "host": "192.168.1.100",
      "user": "admin",
      "port": 22,
      "key": "keys/home.key.age",
      "label": "Home Server"
    }
  ]
}
```

## Environment Variables

```bash
# Provide password via environment variable (useful for scripts)
export ESSH_PASSWORD="your-password"
essh setup
```

## License

MIT
