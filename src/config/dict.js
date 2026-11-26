// ---------------------------------------------------------------------------
// 业务码 / 枚举字典：页面里不写字面量数字，一律从这里取。
//
// 取值与后端模板 internal/conf/err_code.go 对齐：
//   0       成功
//   40xxx   通用/校验类
//   401xx   鉴权与访问类（40005 登录失效 → 重登重放；40102 无权限）
//   402xx   参数与请求类（40205 请求过于频繁）
//   50xxx   登录与账号类（50011 未绑定手机号）
//   51xxx   业务模块段（demo 占用 51xxx，真实模块另起整百段）
//   6xxxx   系统/服务端
//
// 业务变多后按域拆成 config/dict/<域>.js，再在本文件汇总导出。
// ---------------------------------------------------------------------------

// 接口业务码
export const CODE_SUCCESS = 0;
export const CODE_PARAM_ERROR = 40001;
export const CODE_DATA_NOT_EXIST = 40002;
export const CODE_LOGIN_EXPIRED = 40005;
export const CODE_UNAUTHORIZED = 40101;
export const CODE_FORBIDDEN = 40102;
export const CODE_PARAM_MISSING = 40201;
export const CODE_RATE_LIMITED = 40205;
export const CODE_UNBOUND_PHONE = 50011;

// demo 模块（51xxx 段）
export const CODE_DEMO_NOT_EXIST = 51001;
export const CODE_DEMO_NAME_DUP = 51002;

// ---------------------------------------------------------------------------
// 需要前端做「全局动作」的业务码（命中即触发 services/guards.js 登记的跳页/弹窗，
// 页面 catch 到的是 type='guard' 的 ApiError，可忽略）。
// 改成 0 表示该守卫关闭（registerCodeGuard 对空码值直接忽略）。
// ---------------------------------------------------------------------------
export const GUARD_UNBOUND_PHONE = CODE_UNBOUND_PHONE;