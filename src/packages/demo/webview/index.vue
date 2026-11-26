<!--
  文档预览（web-view 页）—— 后端 webview 分组的标准打开方式。
  ⚠️ web-view 发不出自定义请求头（source / sign / token 都到不了服务端），
     鉴权只能走 query access_token；链接由后端 create 接口下发，前端不要自己拼。
     小程序侧还需在「小程序后台 → 开发管理 → 业务域名」配置预览域名，否则 web-view 拒绝加载。
-->
<template>
	<view class="wv">
		<web-view v-if="src" :src="src" />
		<view v-else class="wv__empty">
			<text class="t-h3">链接缺失</text>
			<text class="t-desc wv__empty-desc">请从创建成功页或首页「文档预览」入口进入。</text>
		</view>
	</view>
</template>

<script setup>
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { safeDecode } from '@/utils/qs';

const src = ref('');

onLoad(query => {
	// route.to 已 encode；部分端 onLoad 拿到未解码串，统一走 safeDecode
	src.value = safeDecode((query && query.url) || '');
});
</script>

<style lang="scss" scoped>
.wv {
	min-height: 100vh;
	background-color: $bg-fill-weak;
}

.wv__empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 160rpx $page-padding;
}

.wv__empty-desc {
	margin-top: $sp-2;
	text-align: center;
}
</style>