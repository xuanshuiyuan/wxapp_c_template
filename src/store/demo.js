// ---------------------------------------------------------------------------
// demo 示例模块的跨页状态：最近一次创建结果。
//
// 为什么需要：创建接口（POST /web/demo/create）是**唯一**返回 doc_preview_url 的接口，
// 列表接口不带该字段。创建页拿到链接后写这里，首页据此给出「预览最近创建的文档」入口，
// 不用把长 URL 塞进页面 query 或重复调创建接口。
// ---------------------------------------------------------------------------

import { reactive } from 'vue';

export const demoState = reactive({
	// { id, name, doc_preview_url } | null
	lastCreated: null
});

export function saveLastCreated(data) {
	demoState.lastCreated = data || null;
}

export function clearLastCreated() {
	demoState.lastCreated = null;
}