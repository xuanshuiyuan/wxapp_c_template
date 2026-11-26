<script>
import { env, rootPath } from '@/config/env'
import { RUNTIME } from '@/services/platform'
import { ensureLogin } from '@/services/session'

export default {
	onLaunch() {
		// 多端调试时第一眼要看到的信息：跑在哪个端、打到哪个 host
		console.log(`[launch] runtime=${RUNTIME} env=${env} rootPath=${rootPath || '(空，走相对路径)'}`)
		if (!rootPath && RUNTIME !== 'h5') {
			console.error('[launch] 接口 host 未配置：小程序/App 必须用 http(s) 绝对地址，请填 .env 的 VITE_HOST_MP / VITE_HOST_APP')
		}
		if (rootPath && RUNTIME !== 'h5' && !/^https?:\/\//.test(rootPath)) {
			console.error(`[launch] 非 H5 端接口地址必须是绝对地址，当前为 ${rootPath}`)
		}

		// 静默登录：本地存过 user_id 就自动续一个 token（模板 demo stub 的等价物）。
		// 失败不拦启动——本地 token 过期/缺失的场景由接口 40005 → session.relogin → 自动重放兜底；
		// 首次使用没有 user_id 时停在登录页等用户输入。
		ensureLogin()
	},
	onShow() {},
	onHide() {}
}
</script>

<style lang="scss">
/* 组件库基础样式 */
@import '@/uni_modules/uview-plus/index.scss';

/* ColorUI：只用它的原子类（bg / text / flex 间距那一套），组件一律走 uview-plus */
@import '@/common/css/main.css';
@import '@/common/css/base.scss';

/* 脚手架通用版式：.page .card .kv .btn .list-item ... */
@import '@/styles/scaffold.scss';

.uni-row {
	flex-direction: row;
}

.uni-column {
	flex-direction: column;
}
</style>