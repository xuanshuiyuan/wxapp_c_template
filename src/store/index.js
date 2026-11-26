// ---------------------------------------------------------------------------
// 全局状态出口（零依赖的 reactive 模块，不上 Vuex/Pinia）。
// 用法：
//   import { userState } from '@/store'            读用户态
//   import { confirm } from '@/composables/useModal' 弹窗
// 新增一个 store 模块 = 建 store/xxx.js 并在下面 re-export。
// ---------------------------------------------------------------------------

export { userState, syncUser, resetUser } from './user';
export { modalState, pushModal, settleModal } from './modal';
export { loadingState } from './loading';
export { toastState } from './toast';
export { demoState, saveLastCreated, clearLastCreated } from './demo';