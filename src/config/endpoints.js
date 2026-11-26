// ---------------------------------------------------------------------------
// 接口路径统一登记表（全项目唯一来源）。
//
// 约定：
//   · 路径**不带**版本前缀 /v2 —— request.js 会拼 rootPath + routeVersion + path；
//   · 路径**不带**前导斜杠（两种写法都兼容，但本表统一不带）；
//   · 新增接口先在这里登记，api/ 里只引用常量，禁止在各页写路径字符串。
//
// 路径与后端模板 go_project_template 的 internal/conf/enum_demo.go 一一对应。
// ---------------------------------------------------------------------------

// ==================== demo 示例模块（全链路参考实现） ====================

/** demo 登录 stub（weblogin 分组：签名，免 token；POST form） */
export const ENDPOINT_DEMO_LOGIN = 'web/demo/login';
/** demo 记录分页列表（web 分组：签名 + token；GET 读） */
export const ENDPOINT_DEMO_LIST = 'web/demo/list';
/** demo 创建（web 分组：POST form；响应含 doc_preview_url） */
export const ENDPOINT_DEMO_CREATE = 'web/demo/create';
/** demo 软删（web 分组：POST form） */
export const ENDPOINT_DEMO_DELETE = 'web/demo/delete';
/** demo 文档预览（webview 分组：仅 query access_token，用 web-view 页面打开） */
export const ENDPOINT_DEMO_PREVIEW = 'webview/demo/preview';

// ==================== 通用能力 ====================

/**
 * 文件上传地址（curl.upload 的默认 url）。
 * ⚠️ 后端模板**没有内置上传接口**，接入时按后端实际路由替换；
 * 未替换前调用 curl.upload 会请求到不存在的路径。
 */
export const ENDPOINT_UPLOAD = 'REPLACE_UPLOAD_ENDPOINT';