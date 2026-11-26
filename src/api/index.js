// ---------------------------------------------------------------------------
// 接口层出口。推荐按需引入命名空间（能直接跳到定义）：
//
//   import { demoApi } from '@/api'
//   const res = await demoApi.list({ page: 1, page_size: 10 })
//
// 新增一个业务域：建 api/<domain>.js 导出 xxxApi，然后在这里加一行 export。
// 失败统一抛 ApiError（services/http/error.js），默认已自动 toast，
// 要静默自行处理时传 options：{ toast: false }。
// ---------------------------------------------------------------------------

export { demoApi, pickDemoList } from './demo';