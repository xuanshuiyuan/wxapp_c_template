#!/usr/bin/env node
// ---------------------------------------------------------------------------
// API 结构统一检查：
//   1. src/api/*.js 里每个 curl 方法必须是 (params|data, options) 两参，且把 options 透传给 curl；
//   2. 禁止新接口使用 curl.postJSON（后端统一 form）；
//   3. 每个 api 文件必须从 config/endpoints.js 取路径，不写 URL 字符串。
// 运行：npm run check:api
// ---------------------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const apiDir = path.join(root, 'src/api');
const errors = [];

const files = fs.readdirSync(apiDir).filter(f => f.endsWith('.js') && f !== 'index.js');
for (const file of files) {
	const rel = `src/api/${file}`;
	const text = fs.readFileSync(path.join(apiDir, file), 'utf8');

	if (!text.includes("@/config/endpoints")) {
		errors.push(`${rel}: 未从 @/config/endpoints 引路径常量`);
	}
	if (/\bcurl\.postJSON\s*\(/.test(text)) {
		errors.push(`${rel}: 使用了 curl.postJSON（新接口统一 POST form，禁止 postJSON）`);
	}

	// 方法定义：name(args) { return curl.xxx(...) }
	const methodRe = /(\w+)\s*\(([^)]*)\)\s*\{\s*return\s+curl\.(get|post|upload)\s*\(([\s\S]*?)\)\s*;?\s*\}/g;
	let match;
	let found = 0;
	while ((match = methodRe.exec(text))) {
		found += 1;
		const [, name, args, method, callArgs] = match;
		if (!/,\s*options\s*$/.test(args.trim())) {
			errors.push(`${rel}: ${name}() 必须是 (params|data, options) 两参`);
		}
		if (!/\boptions\b/.test(callArgs)) {
			errors.push(`${rel}: ${name}() 未把 options 透传给 curl.${method}()`);
		}
	}
	if (found === 0) {
		errors.push(`${rel}: 未找到 curl 方法（检查文件是否为 api 域）`);
	}
}

if (errors.length) {
	console.error(`[check-api] 发现 ${errors.length} 条结构问题：`);
	for (const e of errors) console.error(`  - ${e}`);
	process.exit(1);
}
console.log('[check-api] API 方法结构统一检查通过');