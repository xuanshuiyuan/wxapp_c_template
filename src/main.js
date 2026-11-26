import App from './App.vue'
import uviewPlus from '@/uni_modules/uview-plus'

// 副作用 import：让 http 层拿到「登录失效怎么处理」的处理器，删掉会导致 40005 不再自动重登
import '@/services/session'
// 副作用 import：登记「未登录/未绑手机号」等全局业务码的跳页/弹窗动作，删掉后这些码只会当普通业务错误提示
import '@/services/guards'

import { createSSRApp } from 'vue'

export function createApp() {
	const app = createSSRApp(App)

	app.use(uviewPlus)

	// 约定：不做全局属性挂载（$api / this.t 这类魔法会让跳转和补全都失效）。
	// 组件靠 easycom 自动注册（components/组件名/组件名.vue），
	// 逻辑靠显式 import：api、services、composables。

	return {
		app
	}
}
