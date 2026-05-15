---
name: essh
description: >
  Guide for using the essh SSH config manager to query servers and execute remote
  maintenance commands. Use this skill whenever the user mentions essh, wants to
  connect to a server managed by essh, check server status, run commands on a
  remote server, or interact with servers configured through essh — even if they
  do not explicitly say "essh".
---

# essh Agent Guide

## What essh Is

essh is a CLI tool that manages SSH configurations and encrypted keys. It stores
server definitions in `servers.json` and encrypts private keys with `age`. The
tool generates SSH config blocks so servers can be accessed by name.

## What the Agent Does (and Does Not Do)

**The Agent handles:**
- Querying the list of available servers
- Connecting to existing servers to run commands or inspect state

**The Agent does NOT handle:**
- Adding, removing, or modifying server configurations
- Generating or encrypting SSH keys
- Running `essh init`, `essh setup`, or `essh encrypt`
- Cloning or pushing the config repository

These operations require interactive prompts or human decisions. Direct the user
to run them manually if needed.

## Server Discovery

Always discover servers before attempting to connect. Use the non-interactive
command:

```bash
essh list
```

This outputs a table with columns: `NAME`, `HOST`, `USER`, `PORT`, `LABEL`.

Alternatively, read the config file directly for structured data:

```bash
cat ~/.essh/cache/servers.json
# or the path configured in ~/.essh/config.json -> repoPath
```

If no servers exist, tell the user they need to add servers with `essh add`.

## How essh Generates SSH Config

essh writes host entries to `~/.ssh/config` in this format:

```
Host essh-<name>
    HostName <host>
    User <user>
    Port <port>
    IdentityFile ~/.ssh/essh/<keyname>
```

The SSH host alias is always prefixed with `essh-`. For a server named `prod`,
the SSH host alias is `essh-prod`.

## Connecting to a Server

### Wrong Way (Do Not Use)

Do **not** use `essh connect <name>` or `essh <name>` in an Agent context.
These commands spawn an interactive `ssh` session with `stdio: 'inherit'` and
then call `process.exit()`, which terminates the Agent's execution context.

### Right Way: Non-Interactive SSH

Use standard `ssh` with the generated host alias to run commands remotely:

```bash
ssh essh-<name> "<command>"
```

Examples:

```bash
# Check disk usage
ssh essh-prod "df -h"

# Check running processes
ssh essh-prod "ps aux | grep nginx"

# Read a log file
ssh essh-prod "tail -n 50 /var/log/nginx/access.log"

# Check service status
ssh essh-prod "systemctl status docker"
```

For multi-step operations, chain commands or write a small script and pipe it:

```bash
ssh essh-prod "bash -s" << 'EOF'
  apt list --upgradable
  df -h
  free -h
EOF
```

## Pre-Flight Check: Are Keys Decrypted?

Before attempting any SSH connection, verify that the decrypted private keys
exist in `~/.ssh/essh/`:

```bash
ls ~/.ssh/essh/
```

If the directory is empty or the expected key file is missing, the user has not
run `essh setup` (or the decrypted keys were cleaned up). Tell the user:

> Keys are not decrypted. Please run `essh setup` and enter your password, then
> ask me again.

Do **not** attempt to bypass this by running `essh setup` yourself — it may
prompt for a password interactively and hang.

## Environment Variable: ESSH_PASSWORD

If the user wants fully automated operation, they can set:

```bash
export ESSH_PASSWORD="<password>"
```

With this variable, `essh setup` runs without prompts. You may suggest this to
the user, but do not ask them for their password.

## Common Workflow Patterns

### Pattern 1: Inspect a Specific Server

1. `essh list` — find the server name
2. `ls ~/.ssh/essh/` — confirm keys are decrypted
3. `ssh essh-<name> "<command>"` — run the requested command

### Pattern 2: Compare Across Multiple Servers

1. `essh list` — discover all servers
2. For each server, run `ssh essh-<name> "<command>"` and aggregate results

### Pattern 3: User Says "Connect to X"

If the user asks to connect to a server by name (e.g., "connect to prod"):

1. Run `essh list` to verify the server exists
2. Check `ls ~/.ssh/essh/` for decrypted keys
3. Explain that you will run remote commands via `ssh essh-prod "..."` rather
   than opening an interactive shell
4. Ask what specific commands they want executed, or propose common diagnostics
   (disk, memory, processes, logs)

## Troubleshooting

| Symptom | Cause | Solution |
|---------|-------|----------|
| `essh list` shows "No servers available" | Config not initialized | Ask user to run `essh init` and `essh setup` |
| `ssh essh-<name>` fails with "Permission denied" | Keys not decrypted | Ask user to run `essh setup` |
| `ssh essh-<name>` fails with "Could not resolve hostname" | SSH config missing or stale | Ask user to run `essh setup` to regenerate `~/.ssh/config` |
| Server name not found in `essh list` | Wrong name or not added | Suggest user checks the name or runs `essh add` |

## File Reference

| File | Purpose |
|------|---------|
| `~/.essh/config.json` | Global config: repo URL, repo path, branch |
| `~/.essh/cache/servers.json` | Server definitions (if using default path) |
| `~/.essh/cache/keys/*.age` | Encrypted private keys |
| `~/.ssh/essh/*` | Decrypted private keys (runtime only) |
| `~/.ssh/config` | Generated SSH host entries by essh |
