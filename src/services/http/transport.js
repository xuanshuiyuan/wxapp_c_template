// ---------------------------------------------------------------------------
// 传输层：只负责「发一次、拿到原始响应」，不含签名、业务码、重试等策略。
// 两种 transport 返回同一形状 { statusCode, data }，让上层的重试/错误归一逻辑
// 对 request 与 uploadFile 通用（原实现里这两套逻辑各写了一份）。
// ---------------------------------------------------------------------------

export const TRANSPORT_REQUEST = 'request';
export const TRANSPORT_UPLOAD = 'upload';

export function sendByRequest({ url, method, header, data, timeout }) {
	return new Promise((resolve, reject) => {
		uni.request({
			url,
			method,
			header,
			data,
			timeout,
			success: resolve,
			fail: reject
		});
	});
}

export function sendByUpload({ url, header, filePath, name = 'file', formData, timeout }) {
	return new Promise((resolve, reject) => {
		uni.uploadFile({
			url,
			filePath,
			name,
			header,
			formData,
			timeout,
			success: res => {
				// uploadFile 的 data 恒为字符串，这里提前解析成对象，形状与 request 对齐
				let data = res.data;
				if (typeof data === 'string') {
					try {
						data = JSON.parse(data);
					} catch (e) {
						reject(new Error('响应格式异常'));
						return;
					}
				}
				resolve({ ...res, data });
			},
			fail: reject
		});
	});
}

export function send(transport, options) {
	return transport === TRANSPORT_UPLOAD ? sendByUpload(options) : sendByRequest(options);
}
