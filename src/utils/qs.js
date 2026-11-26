// 对象序列化为 x-www-form-urlencoded 字符串（替代 qs.stringify）

export function toQueryString(data) {
	if (!data) return ''
	return Object.keys(data)
		.filter(key => data[key] !== undefined && data[key] !== null)
		.map(key => {
			const value = data[key]
			// 数组按 qs 风格序列化：key[0]=v1&key[1]=v2
			if (Array.isArray(value)) {
				return value.map((item, index) => `${encodeURIComponent(key)}[${index}]=${encodeURIComponent(item)}`).join('&')
			}
			return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
		})
		.join('&')
}

/**
 * 安全解码单值：路由 query 由 `toQueryString` 编码，部分端 onLoad 拿到的是**未解码**串
 * （中文会显示成 `%E5%B9%BF...` 这类「乱码」）。解不开就原样返回，绝不让 decode 抛错挡住页面。
 * @param {*} v
 * @returns {string}
 */
export function safeDecode(v) {
	const s = String(v === null || v === undefined ? '' : v)
	if (!s) return ''
	try {
		return decodeURIComponent(s)
	} catch (e) {
		return s
	}
}
