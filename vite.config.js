// ---------------------------------------------------------------------------
// uni-app Vite 配置
// ---------------------------------------------------------------------------
import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

export default defineConfig({
	plugins: [
		uni()
	],
	server: {
		// 与 manifest.h5.devServer.port / README 保持一致
		port: 5173,
		// H5 本地调试：请求走相对路径（.env.development 的 VITE_HOST_H5 留空），
		// 由 dev server 代理到后端，避开浏览器 CORS。
		// ⚠️ 只影响 npm run dev:h5；小程序端用 VITE_HOST_MP 绝对地址直连。
		proxy: {
			'/v2': {
				target: 'http://127.0.0.1:15000',
				changeOrigin: true
			}
		}
	},
	css: {
		preprocessorOptions: {
			scss: {
				// 使用 Dart Sass 现代 API，消除 legacy-js-api 警告
				// 静音已知 deprecation（uview-plus 内部遗留用法 + strict-unary + legacy API）
				silenceDeprecations: ['import', 'strict-unary', 'legacy-js-api']
			}
		}
	}
})