// 快速启动脚本 - 提供各种功能的快速访问
// 用法：node quick-start.mjs [command]

import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class QuickStart {
  constructor() {
    this.commands = {
      'ai-trading': {
        description: '运行AI交易系统',
        script: 'ai-trading/ai-trading-system.mjs',
        env: true
      },
      'ai-daemon': {
        description: '启动AI交易守护进程（每3分钟）',
        script: 'ai-trading/run-ai-trading.mjs',
        env: true,
        args: ['3']
      },
      'ai-status': {
        description: '查看AI交易状态',
        script: 'ai-trading/view-trading-status.mjs',
        env: false
      },
      'ccxt-test': {
        description: '测试CCXT连接',
        script: 'scripts/ccxt-binance-usdm-test.mjs',
        env: true
      },
      'fetch-data': {
        description: '获取对话数据',
        script: 'scripts/fetch-conversations.mjs',
        env: false
      },
      'generate-prompt': {
        description: '生成用户提示',
        script: 'scripts/generate-user-prompt.mjs',
        env: true
      },
      'analyze-similarity': {
        description: '分析模型相似性',
        script: 'scripts/analyze-model-similarity.mjs',
        env: false
      }
    };
  }

  // 显示帮助信息
  showHelp() {
    console.log('\n🚀 Test 文件夹快速启动工具');
    console.log('='.repeat(50));
    console.log('\n可用命令:');
    
    for (const [cmd, info] of Object.entries(this.commands)) {
      console.log(`  ${cmd.padEnd(20)} - ${info.description}`);
    }
    
    console.log('\n使用方法:');
    console.log('  node quick-start.mjs [command]');
    console.log('\n示例:');
    console.log('  node quick-start.mjs ai-trading    # 运行AI交易系统');
    console.log('  node quick-start.mjs ai-daemon     # 启动守护进程');
    console.log('  node quick-start.mjs ai-status     # 查看状态');
    console.log('  node quick-start.mjs help          # 显示此帮助');
  }

  // 运行命令
  async runCommand(command) {
    if (!this.commands[command]) {
      console.error(`❌ 未知命令: ${command}`);
      this.showHelp();
      return;
    }

    const cmdInfo = this.commands[command];
    const scriptPath = join(__dirname, cmdInfo.script);
    
    console.log(`🚀 运行: ${cmdInfo.description}`);
    console.log(`📁 脚本: ${scriptPath}`);
    
    const args = cmdInfo.env ? ['--env-file=../.env', scriptPath] : [scriptPath];
    if (cmdInfo.args) {
      args.push(...cmdInfo.args);
    }
    
    const child = spawn('node', args, {
      stdio: 'inherit',
      cwd: __dirname
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log('\n✅ 命令执行完成');
      } else {
        console.error(`\n❌ 命令执行失败，退出码: ${code}`);
      }
    });
    
    child.on('error', (error) => {
      console.error('❌ 启动失败:', error.message);
    });
  }

  // 主执行函数
  async run() {
    const command = process.argv[2];
    
    if (!command || command === 'help') {
      this.showHelp();
      return;
    }
    
    await this.runCommand(command);
  }
}

// 主函数
async function main() {
  const quickStart = new QuickStart();
  await quickStart.run();
}

// 运行
main().catch(console.error);