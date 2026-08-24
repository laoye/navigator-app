#!/usr/bin/env node
/**
 * 跨平台 ENVFILE 中转：
 *   node scripts/with-env.js <envFile> [--cwd <dir>] <command> [args...]
 *
 * 等价于 `cross-env ENVFILE=<envFile> <command>`，避免引入 cross-env 这一额外依赖。
 * react-native-config 通过 ENVFILE 环境变量选择要加载的 .env 文件，于是同一个 build.gradle
 * / Xcode 工程，只换 ENVFILE 就能切到不同环境（dev / staging / production）。
 *
 * 命令以独立参数传入（不要整串引号包裹）——Windows cmd 会把脚本行里的 `&&` 当作
 * 命令分隔符、也不识别单引号，所以这里不接受任何 shell 语法：
 *   - 目录切换用 `--cwd android` 代替 `cd android &&`
 *   - 命令名写 `gradlew`，本脚本按平台自动换成 `gradlew.bat` / `./gradlew`
 */
const { spawnSync } = require('child_process');
const path = require('path');

const argv = process.argv.slice(2);
const envFile = argv.shift();

let cwd = process.cwd();
if (argv[0] === '--cwd') {
    argv.shift();
    cwd = path.resolve(process.cwd(), argv.shift());
}

let command = argv.shift();
const args = argv;

if (!envFile || !command) {
    console.error('Usage: node scripts/with-env.js <envFile> [--cwd <dir>] <command> [args...]');
    process.exit(1);
}

if (command === 'gradlew') {
    command = process.platform === 'win32' ? '.\\gradlew.bat' : './gradlew';
}

const result = spawnSync(command, args, {
    stdio: 'inherit',
    cwd,
    env: { ...process.env, ENVFILE: envFile },
    shell: process.platform === 'win32',
});

process.exit(typeof result.status === 'number' ? result.status : 1);
