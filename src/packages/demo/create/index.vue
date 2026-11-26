<!--
  新建 demo 记录（分包 packages/demo）—— 表单页参考实现。
  演示：表单校验、写接口 form POST、成功后展示 create 返回的 doc_preview_url、
       写 store/demo 供首页预览入口消费、分包页面跳转。
-->
<template>
	<view class="hud-page">
		<app-navbar title="新建 demo 记录" show-back />
		<app-modal />
		<app-toast />
		<app-loading :mask="true" />

		<scroll-view class="hud-page__scroll" scroll-y>
			<view class="hud-page__body">
				<!-- 创建成功：展示结果与文档预览入口 -->
				<view v-if="created" class="card create__done">
					<text class="t-h2">创建成功</text>
					<text class="t-desc create__done-desc">
						记录 #{{ created.id }} 已落库；下方链接是后端签发的短时效文档预览令牌（仅能打开这一份文档）。
					</text>
					<view class="create__done-actions">
						<view class="btn btn--primary btn--block" @click="openPreview">预览文档</view>
						<view class="btn btn--soft btn--block" @click="backToList">返回列表</view>
					</view>
				</view>

				<!-- 表单 -->
				<view v-else class="card">
					<view class="create__field">
						<text class="create__label">名称<text class="create__req">*</text></text>
						<input
							v-model="form.name"
							class="create__input"
							maxlength="64"
							placeholder="1-64 个字符，同用户下不可重名"
							placeholder-class="create__ph"
						/>
					</view>
					<view class="create__field">
						<text class="create__label">备注</text>
						<textarea
							v-model="form.remark"
							class="create__textarea"
							maxlength="255"
							placeholder="选填，最多 255 字"
							placeholder-class="create__ph"
						/>
					</view>

					<view class="btn btn--primary btn--block create__submit" @click="onSubmit">
						{{ submitting ? '提交中…' : '创建' }}
					</view>
				</view>
			</view>
		</scroll-view>
	</view>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { demoApi } from '@/api';
import { saveLastCreated } from '@/store/demo';
import { route, DEMO_WEBVIEW_PAGE, HOME_PAGE } from '@/services/route';
import { toast, withLoading } from '@/services/toast';
import { absoluteUrl } from '@/utils/url';
import { isApiError } from '@/services/http';

const form = reactive({ name: '', remark: '' });
const submitting = ref(false);
const created = ref(null);

async function onSubmit() {
	if (submitting.value) return; // 双保险：按钮 in-flight + withLoading 托管
	const name = String(form.name || '').trim();
	if (!name) {
		toast('请输入名称');
		return;
	}
	submitting.value = true;
	try {
		await withLoading(async () => {
			const body = await demoApi.create({ name, remark: String(form.remark || '').trim() });
			created.value = body.data || null;
			// 首页据此展示「文档预览」入口（列表接口不返回 doc_preview_url）
			saveLastCreated(created.value);
		});
		toast('创建成功', 'success');
	} catch (e) {
		// 请求层默认已 toast（同名 51002、频控 40205 等由后端 msg 呈现）；guard 型忽略
		if (!isApiError(e) || e.type !== 'guard') console.error('[demo/create] 创建失败：', e);
	} finally {
		submitting.value = false;
	}
}

function openPreview() {
	const url = created.value && created.value.doc_preview_url;
	if (!url) {
		toast('本次创建没有返回预览链接');
		return;
	}
	route.to(DEMO_WEBVIEW_PAGE, { url: absoluteUrl(url) });
}

function backToList() {
	// 分包页返回主包 tab 页：route.back 会回到首页（栈里有），空栈则回落 HOME_PAGE
	route.back(HOME_PAGE);
}
</script>

<style lang="scss" scoped>
.create__field {
	margin-bottom: $sp-5;
}

.create__label {
	display: block;
	margin-bottom: $sp-2;
	font-size: $fs-body;
	font-weight: $fw-medium;
	color: $text-sub;
}

.create__req {
	margin-left: 4rpx;
	color: $color-danger;
}

.create__input {
	height: 88rpx;
	padding: 0 $sp-3;
	border: 1rpx solid $border-color;
	border-radius: $rd-chip;
	background-color: $bg-card;
	font-size: $fs-label;
	color: $text-title;
	box-sizing: border-box;
}

.create__textarea {
	width: 100%;
	height: 200rpx;
	padding: $sp-2 $sp-3;
	border: 1rpx solid $border-color;
	border-radius: $rd-chip;
	background-color: $bg-card;
	font-size: $fs-label;
	color: $text-title;
	box-sizing: border-box;
}

.create__ph {
	color: $text-muted;
}

.create__submit {
	margin-top: $sp-6;
}

.create__done {
	padding: $sp-6;
}

.create__done-desc {
	display: block;
	margin-top: $sp-3;
}

.create__done-actions {
	margin-top: $sp-6;
}

.create__done-actions .btn + .btn {
	margin-top: $sp-3;
}
</style>