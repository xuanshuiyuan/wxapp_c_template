#!/usr/bin/env node
// ---------------------------------------------------------------------------
// 文档引用存在性检查：扫描 .claude/**/*.md，抽出反引号里的代码路径/组件名/theme 键，
// 断言本仓真实存在。目的：防止规则文档再次漂移成「幽灵引用」。
//
// 只检查明确写成代码路径/组件 token 的引用；自然语言不检查。
// 运行：npm run check:refs
// ---------------------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];

function walk(dir) {
	if (!fs.existsSync(dir)) return [];
	const out = [];
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) out.push(...walk(full));
		else if (entry.name.endsWith('.md')) out.push(full);
	}
	return out;
}

const files = walk(path.join(root, '.claude'));
const themeJs = fs.readFileSync(path.join(root, 'src/config/theme.js'), 'utf8');
const themeKeys = new Set([...themeJs.matchAll(/^\s*(\w+)\s*:/gm)].map(m => m[1]));

function resolvePath(token) {
	// 去掉 Markdown 里常见的 `file:line` / `file:1-2` 后缀；含括号/空格的 token 是代码片段，不是路径
	let clean = token.split(' ')[0].replace(/[.,;)]+$/, '');
	clean = clean.replace(/:\d+(-\d+)?.*$/, '');
	if (!clean || /[<>{}*…()`]/.test(clean)) return null;
	if (clean === 'pages/packages') return null; // 架构图里的分层标签，不是真实路径
	// docs/ 是本机留存的设计/架构文档（.gitignore 忽略），不属于仓库引用检查范围
	if (clean.startsWith('docs/')) return null;
	// versions/vN 是版本目录模板占位，不对应具体目录
	if (clean.includes('versions/vN')) return null;
	let base = '';
	if (clean.startsWith('src/') || clean.startsWith('.claude/')) base = clean;
	else if (/^(api|components|composables|config|pages|packages|services|store|styles|utils|common)\//.test(clean)) base = `src/${clean}`;
	else return null;
	const candidates = [
		base,
		`${base}.js`,
		`${base}.vue`,
		`${base}/index.js`,
		`${base}/index.vue`
	];
	return { token: clean, ok: candidates.some(p => fs.existsSync(path.join(root, p))) };
}

for (const file of files) {
	const rel = path.relative(root, file);
	// versions/ 是历史评审/需求档案，里面的旧路径与 file:line 是当时快照，不参与当前引用检查
	if (rel.includes('/versions/')) continue;
	const text = fs.readFileSync(file, 'utf8');
	for (const m of text.matchAll(/`([^`\n]+)`/g)) {
		const token = m[1].trim();

		// 组件名：`<app-xxx />` 或 `app-xxx`
		const comp = /^(?:<)?(app-[a-z0-9-]+)(?:\s*\/?>)?$/.exec(token);
		if (comp) {
			const name = comp[1];
			if (!fs.existsSync(path.join(root, 'src/components', name, `${name}.vue`))) {
				errors.push(`${rel}: 组件不存在 src/components/${name}/${name}.vue`);
			}
			continue;
		}

		// theme 键：theme.xxx
		const theme = /^theme\.(\w+)$/.exec(token);
		// theme.scss / theme.js 是文件名，不是 theme.js 的键
		if (theme && !['scss', 'js'].includes(theme[1]) && !themeKeys.has(theme[1])) {
			errors.push(`${rel}: theme.${theme[1]} 不在 src/config/theme.js`);
			continue;
		}

		const r = resolvePath(token);
		if (r && !r.ok) errors.push(`${rel}: 路径不存在 ${r.token}`);
	}
}

if (errors.length) {
	console.error(`[check-refs] 发现 ${errors.length} 条失效引用：`);
	for (const e of errors) console.error(`  - ${e}`);
	process.exit(1);
}
console.log('[check-refs] 文档引用检查通过');