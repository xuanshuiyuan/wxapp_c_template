// ---------------------------------------------------------------------------
// 环境配置——全项目唯一的环境开关。
//
// 所有值由根目录 .env 文件驱动（Vite 标准），config 层只做读取与分流：
//   npm run dev:*       → 加载 .env.development + .env.local（若有）
//   npm run build:*     → 加载 .env.production  + .env.local（若有）
//
// 不设 .env 文件时退化为 development + 本地 localhost 地址。
// 本地想切后端地址/密钥，在 .env.local 写一行即可，不提交 git，不影响同事。
//
// 当前运行端（mp / h5 / app）由条件编译自动判定，与 env 无关。
// ---------------------------------------------------------------------------

// ── 环境名 ──
const ENV = import.meta.env.VITE_APP_ENV || 'development';

// ── 当前运行端（条件编译） ──
let runtime = 'mp';
// #ifdef H5
runtime = 'h5';
// #endif
// #ifdef APP-PLUS
runtime = 'app';
// #endif

// ── 按端取接口地址 ──
const HOST_MAP = {
	mp: import.meta.env.VITE_HOST_MP,
	h5: import.meta.env.VITE_HOST_H5,
	app: import.meta.env.VITE_HOST_APP
};

// ── 导出 ──
export const env = ENV;
export const isProd = ENV === 'production';
// 统一补尾斜杠：request.js 在其后直接拼版本前缀（v2/），不依赖 .env 里手写斜杠；
// 留空（H5 同域部署）时保持空串，走相对路径
const host = HOST_MAP[runtime] || '';
export const rootPath = host && !host.endsWith('/') ? `${host}/` : host;
export const ossHost = import.meta.env.VITE_OSS_HOST || '';

// 签名密钥（后端 Verification.KeyList 中 source=1010 的那一把，线下领取，绝不进 git）
export const apiKey = import.meta.env.VITE_API_KEY || '';

// 本地联调跳过签名：后端 local/develop 环境 DevelopBypass=true 时，
// 请求头 develop 与配置值一致即跳过签名校验（生产环境该配置恒为 false）。
// .env.development 默认写 develop，生产留空；填了才会带这个头。
export const developBypass = import.meta.env.VITE_DEVELOP_BYPASS || '';