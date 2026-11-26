// ---------------------------------------------------------------------------
// 应用级常量（与环境无关）。环境相关的 host / 密钥在 config/env.js
//
// 与后端模板 go_project_template 的契约对齐点：
//   edition   —— 版本协商头，取值必须在后端 EditionList 白名单内（模板当前只有 v1.0.0）
//   routeVersion —— 后端 conf.RouteVersion，业务路径一律不带它，由 request.js 统一拼
//   source    —— 客户端来源（1010 = 微信小程序 C 端；网页 C 端 = 0110，本模板按小程序）
// ---------------------------------------------------------------------------

// 接口版本协商头（后端 internal/conf/<env>/config.go 的 EditionList）。
// ⚠️ 传白名单以外的值会被后端 fail-closed 直接拒（回 Im Invalid Request!），
// 发版前必须与后端确认该值已登记，不能想当然往上顶。
export const edition = 'v1.0.0';

// 接口路径版本前缀（后端 conf.RouteVersion 单点定义）：request.js 拼 URL 时统一加，
// 业务路径（api/ 与 endpoints.js）一律不带 /v2，升版只改这一行。
export const routeVersion = 'v2';

// 后端约定的来源标识（1010 = 微信小程序 C 端）。
export const source = '1010';

// 客服电话：全项目唯一来源。上线前替换为真实号码（init.sh 也会提示）。
export const SERVICE_TEL = 'REPLACE_SERVICE_TEL';

// 全局转圈图：存 OSS 相对路径（拼接口径见 utils/oss.js）；留空则用纯 CSS 转圈。
// 图片缺失 / 加载失败时组件自动回退本地占位图。
export const LOADING_IMAGE = '';
export const LOADING_IMAGE_FALLBACK = '/static/loading.png';

// 本地存储 key 前缀，避免同域下多项目互相污染。
// init.sh 会把 wxapp_c_template 整体替换成新项目名，这里无需手改。
const PREFIX = 'wxapp_c_template_';

// 登录态字段：读写只允许经过 services/storage.js
export const SESSION_FIELDS = ['token', 'user_id', 'userinfo', 'expires_at'];

export function storageKey(name) {
	return `${PREFIX}${name}`;
}