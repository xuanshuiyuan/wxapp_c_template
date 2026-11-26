#!/usr/bin/env node
// ---------------------------------------------------------------------------
// production 构建前环境校验（npm prebuild:* 自动执行）。
//
// 目的：模板默认只有占位值，`npm run build:*` 仍能编译成功但签不出合法请求；
// 这里在构建前 fail-closed，避免「构建成功 = 可用」的误判。
//
// 允许 SKIP_ENV_CHECK=1 跳过（仅本地验证模板编译时使用，不要用于发布）。
// ---------------------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function readEnv(file) {
	const full = path.join(root, file);
	if (!fs.existsSync(full)) return {};
	const result = {};
	for (const line of fs.readFileSync(full, 'utf8').split('\n')) {
		const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
		if (m) result[m[1]] = m[2].replace(/^['"]|['"]$/g, '').trim();
	}
	return result;
}

if (process.env.SKIP_ENV_CHECK === '1') {
	console.log('[check-env] SKIP_ENV_CHECK=1，跳过生产环境校验');
	process.exit(0);
}

const env = {
	...readEnv('.env.production'),
	...readEnv('.env.production.local')
};

const errors = [];

if (!env.VITE_API_KEY || /REPLACE_/.test(env.VITE_API_KEY)) {
	errors.push('VITE_API_KEY 未配置：写入 .env.production.local（后端线下发放，绝不进 git）');
}

for (const key of ['VITE_HOST_MP', 'VITE_HOST_APP', 'VITE_HOST_H5']) {
	const value = env[key] || '';
	if (!value) {
		// H5 允许同域部署留空；小程序/App 必须绝对地址
		if (key !== 'VITE_HOST_H5') errors.push(`${key} 为空：小程序/App 必须填 http(s) 绝对地址`);
		continue;
	}
	if (/REPLACE_/.test(value)) errors.push(`${key} 仍是占位值（${value}）`);
	else if (!/^https?:\/\//.test(value)) errors.push(`${key} 必须是 http(s) 绝对地址（当前 ${value}）`);
}

if (errors.length) {
	console.error('\n[check-env] 生产构建环境未就绪：');
	for (const e of errors) console.error(`  - ${e}`);
	console.error('\n提示：本地只验证编译可临时 SKIP_ENV_CHECK=1 npm run build:mp-weixin');
	process.exit(1);
}

console.log('[check-env] 生产构建环境校验通过');