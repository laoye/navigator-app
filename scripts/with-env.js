#!/usr/bin/env node
/**
 * 跨平台 ENVFILE 中转：
 *   node scripts/with-env.js <envFile> '<command>'
 *
 * 等价于 `cross-env ENVFILE=<envFile> <command>`，避免引入 cross-env 这一额外依赖。
 * react-native-config 通过 ENVFILE 环境变量选择要加载的 .env 文件，于是同一个 build.gradle
 * / Xcode 工程，只换 ENVFILE 就能切到不同环境（dev / staging / production）。
 *
 * <command> 用引号包成单个字符串传入；可包含 `cd`、`&&` 等 shell 语法（用系统 shell 执行）。
 */
const { execSync } = require('child_process');

const envFile = process.argv[2];
const command = process.argv[3];

if (!envFile || !command) {
    console.error("Usage: node scripts/with-env.js <envFile> '<command>'");
    process.exit(1);
}

process.env.ENVFILE = envFile;

try {
    execSync(command, { stdio: 'inherit', env: process.env });
} catch (e) {
    process.exit(typeof e.status === 'number' ? e.status : 1);
}
