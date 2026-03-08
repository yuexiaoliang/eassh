# eassh - 服务器配置管理中心（完整需求文档）

## 项目概述

创建一个**通用 CLI 工具 + 私有配置仓库**的解决方案，用于集中管理所有服务器的 SSH 密钥和连接配置。

**核心理念：工具与配置分离**
- **通用工具**：发布到 NPM，所有人可用（开源）
- **私有配置**：存储在私有 Git 仓库，包含加密密钥和服务器列表

**项目名称：** `eassh`（easy + ssh，简单、跨平台、易用）

---

## 架构设计

```
┌─────────────────────────────────────────────────────────┐
│                    NPM 包（公开）                        │
│  @yuexiaoliang/eassh                                    │
│                                                         │
│  功能：                                                 │
│  - 加解密逻辑（age）                                    │
│  - CLI 交互框架                                         │
│  - SSH 连接管理                                         │
│  - Git 仓库操作                                         │
│                                                         │
│  命令：                                                 │
│  - npx eassh init                                       │
│  - npx eassh setup                                      │
│  - npx eassh connect                                    │
│  - npx eassh list                                       │
│  - npx eassh add                                        │
│  - npx eassh encrypt                                    │
└─────────────────────────────────────────────────────────┘
                            ↓ 读取配置
┌─────────────────────────────────────────────────────────┐
│                  私有仓库（你的配置）                    │
│  github.com/yuexiaoliang/eassh-config                   │
│                                                         │
│  内容：                                                 │
│  - .eassh.json (工具配置)                               │
│  - keys/*.age (加密的密钥)                              │
│  - servers.json (服务器列表)                            │
│  - README.md (个人使用说明)                             │
└─────────────────────────────────────────────────────────┘
```

---

## 项目 1：NPM CLI 工具

### 基本信息

| 字段 | 值 |
|------|-----|
| 包名 | `@yuexiaoliang/eassh` |
| 命令名 | `eassh` |
| 运行时 | Node.js v18+ |
| 语言 | TypeScript |
| 发布 | NPM Registry |

### 技术栈

```json
{
  "dependencies": {
    "commander": "^12.0.0",
    "inquirer": "^9.0.0",
    "age-node": "^1.0.0",
    "simple-git": "^3.0.0",
    "chalk": "^5.0.0",
    "fs-extra": "^11.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "pkg": "^5.0.0"
  }
}
```

### 项目结构

```
eassh/
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── index.ts           # CLI 入口
│   ├── commands/
│   │   ├── init.ts        # 初始化配置
│   │   ├── setup.ts       # 解密 + 配置 SSH
│   │   ├── connect.ts     # 选择并连接
│   │   ├── list.ts        # 列出服务器
│   │   ├── add.ts         # 添加服务器
│   │   └── encrypt.ts     # 加密操作
│   ├── core/
│   │   ├── crypto.ts      # 加解密逻辑
│   │   ├── ssh.ts         # SSH 连接
│   │   ├── config.ts      # 配置管理
│   │   └── git.ts         # Git 操作
│   └── utils/
│       ├── logger.ts      # 日志输出
│       └── validator.ts   # 输入验证
└── tests/
```

### CLI 命令设计

#### `eassh init` - 初始化配置

**用途：** 在新机器上首次使用，配置私有仓库地址

**交互流程：**
```bash
$ npx eassh init

? 请输入你的私有配置仓库地址 (GitHub/GitLab)
> git@github.com:yuexiaoliang/eassh-config.git

? 请输入加密密码（用于解密密钥）
> [隐藏输入]

✓ 克隆配置仓库成功
✓ 创建配置文件 ~/.eassh/config.json
✓ 设置完成！

现在可以运行 'eassh setup' 来解密密钥
```

**生成的配置：** `~/.eassh/config.json`
```json
{
  "repoUrl": "git@github.com:yuexiaoliang/eassh-config.git",
  "repoPath": "~/.eassh/cache",
  "encrypted": true
}
```

---

#### `eassh setup` - 解密并配置 SSH

**用途：** 解密所有密钥，配置 SSH config

**流程：**
1. 读取 `~/.eassh/config.json`
2. 从缓存目录读取 `servers.json` 和 `keys/*.age`
3. 解密所有密钥到 `~/.ssh/eassh/`
4. 生成/更新 `~/.ssh/config`
5. 设置正确的文件权限

**输出：**
```bash
$ npx eassh setup

✓ 解密 3 个密钥
✓ 生成 SSH config
✓ 设置文件权限

可用服务器：
  - home (192.168.1.100)
  - vps (45.32.100.1)
  - work (10.0.0.50)

运行 'eassh connect' 开始连接
```

---

#### `eassh connect [name]` - 连接服务器

**用途：** 交互式选择或直接连接指定服务器

**模式 1：交互式选择**
```bash
$ npx eassh connect

? 选择要连接的服务器
❯ home (192.168.1.100)
  vps (45.32.100.1)
  work (10.0.0.50)

Connecting to home (192.168.1.100)...
```

**模式 2：直接连接**
```bash
$ npx eassh connect home

Connecting to home (192.168.1.100)...
```

---

#### `eassh list` - 列出服务器

```bash
$ npx eassh list

服务器列表 (共 3 个):

  NAME    HOST              USER    PORT    LABEL
  home    192.168.1.100     admin   22      家里服务器
  vps     45.32.100.1       root    22      云服务器
  work    10.0.0.50         dev     2222    公司服务器
```

---

#### `eassh add` - 添加新服务器

**交互式添加：**
```bash
$ npx eassh add

? 服务器名称 (英文标识)
> new-server

? 服务器地址 (IP 或域名)
> 192.168.1.200

? SSH 用户名
> admin

? SSH 端口 (默认 22)
> 22

? 服务器描述/标签
> 新买的服务器

? 私钥文件路径（相对于 keys 目录）
> keys/new-server.key.age

? 是否现在上传私钥？
> Yes

✓ 服务器已添加到 servers.json
✓ 私钥已加密并保存
✓ 推送到远程仓库
```

---

#### `eassh encrypt` - 重新加密

**用途：** 修改配置后重新加密并推送

```bash
$ npx eassh encrypt

✓ 加密 3 个密钥文件
✓ 提交更改到本地仓库
✓ 推送到远程仓库
```

---

### 核心模块设计

#### `crypto.ts` - 加解密

```typescript
// 使用 age 进行对称加密
export async function encryptFile(inputPath: string, password: string): Promise<string>
export async function decryptFile(inputPath: string, password: string): Promise<string>
```

#### `ssh.ts` - SSH 连接

```typescript
export function generateSSHConfig(servers: ServerConfig[]): string
export function connect(server: ServerConfig, keyPath: string): Promise<void>
```

#### `config.ts` - 配置管理

```typescript
export interface GlobalConfig {
  repoUrl: string
  repoPath: string
}

export interface ServerConfig {
  name: string
  host: string
  user: string
  port: number
  key: string
  label?: string
  proxyJump?: string
}

export function loadGlobalConfig(): GlobalConfig
export function loadServers(): ServerConfig[]
export function saveServers(servers: ServerConfig[]): void
```

#### `git.ts` - Git 操作

```typescript
export async function cloneRepo(url: string, path: string): Promise<void>
export async function pullRepo(path: string): Promise<void>
export async function pushRepo(path: string): Promise<void>
```

---

## 项目 2：私有配置仓库

### 仓库结构

```
eassh-config/
├── .gitignore
├── README.md
├── .eassh.json          # 仓库配置（可选）
├── keys/
│   ├── home.key.age
│   ├── vps.key.age
│   └── work.key.age
└── servers.json         # 服务器列表
```

### `.gitignore`

```gitignore
# 忽略解密后的密钥
*.key
!*.key.age

# 忽略本地缓存
.cache/

# 忽略系统文件
.DS_Store
Thumbs.db
```

### `servers.json` 格式

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
    },
    {
      "name": "vps",
      "host": "45.32.100.1",
      "user": "root",
      "port": 22,
      "key": "keys/vps.key.age",
      "label": "云服务器",
      "proxyJump": "home"
    }
  ]
}
```

### `README.md` 模板

```markdown
# 我的服务器配置

## 快速开始

### 新机器初始化

```bash
# 1. 安装 Node.js
# 2. 运行初始化
npx eassh init

# 3. 解密配置
npx eassh setup

# 4. 连接服务器
npx eassh connect
```

## 服务器列表

| 名称 | 地址 | 用途 |
|------|------|------|
| home | 192.168.1.100 | 家里 NAS |
| vps | 45.32.100.1 | 云服务器 |

## 添加新服务器

```bash
npx eassh add
```

## 安全说明

- 所有密钥已用 age 加密
- 解密密码存储在密码管理器中
- 私钥永远不会以明文形式提交到 Git
```

---

## 使用流程

### 场景 1：新机器初始化

```bash
# 1. 确保 Node.js 已安装
node -v

# 2. 初始化工具（配置仓库地址和密码）
npx eassh init

# 3. 解密并配置 SSH
npx eassh setup

# 4. 连接服务器
npx eassh connect
# 或
npx eassh connect home
```

### 场景 2：添加新服务器

```bash
# 1. 添加服务器（交互式）
npx eassh add

# 2. 工具会自动：
#    - 更新 servers.json
#    - 加密新密钥
#    - 提交并推送到仓库

# 3. 其他机器 pull 后自动可用
```

### 场景 3：修改服务器配置

```bash
# 1. 进入缓存目录
cd ~/.eassh/cache

# 2. 编辑 servers.json
vim servers.json

# 3. 重新加密并推送
npx eassh encrypt
```

---

## 安全要求

### 密钥存储

| 状态 | 位置 | 权限 |
|------|------|------|
| 加密后 | Git 仓库 `keys/*.age` | 644 |
| 解密后 | `~/.ssh/eassh/*.key` | 600 |
| SSH config | `~/.ssh/config` | 600 |

### 加密方式

- **算法：** age (对称加密)
- **密码：** 用户提供的密码短语
- **存储：** 密码不存储，每次通过环境变量或交互式输入

### 环境变量支持

```bash
# 可选：通过环境变量提供密码（适合脚本）
export EASSH_PASSWORD="my-secret-password"
npx eassh setup
```

---

## 开发计划

### Phase 1 - MVP（核心功能）

- [ ] CLI 框架搭建
- [ ] `init` 命令
- [ ] `setup` 命令（解密 + SSH 配置）
- [ ] `connect` 命令
- [ ] `list` 命令
- [ ] age 加解密集成

### Phase 2 - 增强功能

- [ ] `add` 命令（交互式添加）
- [ ] `encrypt` 命令
- [ ] Git 操作自动化
- [ ] 错误处理和日志

### Phase 3 - 可选功能

- [ ] `remove` 命令（删除服务器）
- [ ] `exec` 命令（批量执行命令）
- [ ] 服务器分组
- [ ] SSH 代理跳转支持
- [ ] 服务器健康检查
- [ ] 从密码管理器获取密码

---

## 发布计划

### NPM 发布

```bash
# 1. 构建
npm run build

# 2. 测试
npm test

# 3. 发布（如果是 scoped 包）
npm publish --access public

# 4. 全局安装测试
npm install -g @yuexiaoliang/eassh
```

### 版本管理

- 遵循 SemVer (语义化版本)
- CHANGELOG.md 记录变更
- Git tag 标记版本

---

## 测试要求

### 单元测试

- 加解密功能测试
- 配置解析测试
- SSH config 生成测试

### 集成测试

- 完整初始化流程
- 连接服务器流程
- Git 操作测试

### 手动测试

- 在新虚拟机上完整测试初始化流程
- 测试多服务器场景
- 测试错误处理（密码错误、仓库不存在等）

---

## 文档要求

### NPM 包文档

- README.md - 安装和使用说明
- API.md - 命令参考
- CHANGELOG.md - 版本变更

### 私有仓库文档

- README.md - 个人使用说明
- 服务器列表和维护说明

---

## 注意事项

1. **Git Hooks 不会自动克隆**，需要在 init 时手动设置：
   ```bash
   git config core.hooksPath .git-hooks
   ```

2. **首次使用需要设置解密密码**，建议用密码管理器存储

3. **权限必须正确**：
   - 解密密钥：600
   - 目录：700
   - SSH config：600

4. **密码管理**：
   - 不要硬编码密码
   - 优先使用环境变量或交互式输入
   - 建议集成 1Password/Bitwarden CLI

---

## 成功标准

- [ ] 新机器上 5 分钟内完成初始化
- [ ] 连接服务器不超过 3 个命令
- [ ] 所有密钥在 Git 中都是加密状态
- [ ] 工具可以独立于配置仓库发布和更新
- [ ] 代码有基本测试覆盖

---

**文档版本：** 3.0
**创建日期：** 2026-03-08
**作者：** 菜鸡小岳子
**项目名称：** eassh
