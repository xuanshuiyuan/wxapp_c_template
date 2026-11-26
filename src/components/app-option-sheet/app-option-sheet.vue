<!--
  单选选项抽屉（跨分包共用，easycom 自动注册）。

  形态：底部弹层，行卡 = 芯片灰底；选中 = 主色浅底 + 主色描边 + 右侧 ✓。
  选项集由调用方给（`[{ value, label }]`）——业务枚举一律取契约 / config，不在组件里写字面量。

  ⚠️ `current` 用严格相等比：编码为 0 / 空串这类 falsy 值也能正确高亮。
-->
<template>
	<u-popup :show="show" mode="bottom" :round="24" :safe-area-inset-bottom="true" @close="close">
		<view class="os">
			<view class="os__head">
				<view class="os__blade"></view>
				<text class="os__title">{{ title }}</text>
				<u-icon name="close" size="16" :color="theme.textSub" @click="close" />
			</view>

			<view
				v-for="opt in options"
				:key="String(opt.value)"
				class="os__item"
				:class="{ 'os__item--on': opt.value === current }"
				hover-class="os__item--hover"
				:hover-stay-time="120"
				@click="pick(opt)"
			>
				<text class="os__label">{{ opt.label }}</text>
				<text v-if="opt.value === current" class="os__tick">✓</text>
			</view>

			<!-- 选项暂缺（异步拉取中 / 后端没给）：给一行说明，不摆空弹层 -->
			<view v-if="!options.length" class="os__empty">
				<text>{{ emptyText || '暂无可选项' }}</text>
			</view>
		</view>
	</u-popup>
</template>

<script setup>
import { theme } from '@/config/theme';

defineProps({
	show: { type: Boolean, default: false },
	title: { type: String, default: '' },
	// [{ value, label }]——value 可以是整数枚举、字符串或空串（空串常用作「不限」档）
	options: { type: Array, default: () => [] },
	current: { type: [Number, String], default: null },
	// 选项为空时的说明文案（不传则「暂无可选项」）
	emptyText: { type: String, default: '' }
});

const emit = defineEmits(['update:show', 'pick']);

function close() {
	emit('update:show', false);
}

function pick(opt) {
	if (!opt) return;
	emit('pick', opt.value);
}
</script>

<style lang="scss" scoped>
.os {
	padding: $sp-6 $sp-4 calc(#{$sp-6} + 24rpx);
	background: $bg-card;
}

.os__head {
	display: flex;
	align-items: center;
	margin-bottom: $sp-4;
}

.os__blade {
	width: 8rpx;
	height: 32rpx;
	margin-right: 12rpx;
	background: linear-gradient(180deg, $color-primary, $color-primary-dark);
}

.os__title {
	flex: 1;
	font-size: $fs-label;
	font-weight: $fw-semibold;
	color: $text-title;
	letter-spacing: 1rpx;
}

/* 行卡：芯片灰底 + 14rpx 斜切；选中 = 黄 .14 底 + 金 .65 描边 */
.os__item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: $sp-4 $sp-3;
	margin-bottom: $sp-3;
	background: $bg-fill-chip;
	border: 1rpx solid transparent;
	border-radius: 20rpx; // 2026-10-29 换肤：14rpx 斜切 → 圆角
}

.os__item--on {
	background: $color-primary-light;
	border-color: $color-primary;
}

.os__item--hover {
	opacity: 0.82;
}

.os__label {
	font-size: $fs-body;
	color: $text-title;
}

.os__item--on .os__label {
	font-weight: $fw-semibold;
}

.os__tick {
	flex-shrink: 0;
	margin-left: $sp-2;
	font-size: $fs-body;
	font-weight: $fw-bold;
	color: $color-tag-warm-fg;
}

.os__empty {
	padding: $sp-6 0;
	text-align: center;
	font-size: $fs-body;
	color: $text-muted;
}
</style>