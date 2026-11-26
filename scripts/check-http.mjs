#!/usr/bin/env node
// ---------------------------------------------------------------------------
// HTTP 请求层自检（2026-11-26 定版）：
//   · 业务代码禁止绕过 services/http 直接调 uni.request / uni.uploadFile；
//   · 禁止 JSON 请求体入口（postJSON / application/json）；
//   · 只允许三种形态：get(query) / post(form) / upload(multipart)。
// 运行：npm run check:http
// ---------------------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const src = path.join(root, 'src');
const allowDir = path.join(src, 'services/http');
const errors = [];

function walk(dir) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (full === allowDir) continue;
		if (entry.name === 'uni_modules') continue;
		if (entry.isDirectory()) walk(full);
		else if (/\.(js|vue)$/.test(entry.name)) check(full);
	}
}

function check(file) {
	const text = fs.readFileSync(file, 'utf8');
	const rel = path.relative(root, file);
	const lines = text.split('\n');
	lines.forEach((line, i) => {
		if (/uni\.(request|uploadFile)\s*\(/.test(line)) {
			errors.push(`${rel}:${i + 1}: 绕过请求层直接调用 uni.${line.includes('uploadFile') ? 'uploadFile' : 'request'}`);
		}
		if (/postJSON|contentType\s*:\s*['"]application\/json/.test(line)) {
			errors.push(`${rel}:${i + 1}: 出现 JSON 请求体入口（定版只允许表单）`);
		}
	});
}

walk(src);

if (errors.length) {
	console.error(`[check-http] 发现 ${errors.length} 条违规：`);
	for (const e of errors) console.error(`  - ${e}`);
	process.exit(1);
}
console.log('[check-http] 请求层自检通过（form / get / upload，无绕过）');