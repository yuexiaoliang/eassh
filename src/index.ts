#!/usr/bin/env node

import { Command } from 'commander'
import { add, connect, encrypt, init, list, remove, setup } from './commands/index.js'

const program = new Command()

program
  .name('eassh')
  .description('服务器配置管理中心')
  .version('0.0.1')

program
  .command('init')
  .description('初始化配置，克隆私有仓库')
  .option('-d, --dir <path>', '指定配置仓库克隆目录（默认：~/.eassh/cache）')
  .action(init)

program
  .command('setup')
  .description('解密密钥并配置 SSH')
  .action(setup)

program
  .command('connect [name]')
  .description('连接服务器')
  .action(connect)

program
  .command('list')
  .description('列出所有服务器')
  .action(list)

program
  .command('add')
  .description('添加新服务器')
  .action(add)

program
  .command('encrypt')
  .description('重新加密并推送')
  .action(encrypt)

program
  .command('remove [name]')
  .description('删除服务器')
  .action(remove)

program.parse()
