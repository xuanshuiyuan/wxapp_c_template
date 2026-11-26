<!--
  表单行（跨分包共用，easycom 自动注册）。

  骨架 =「左标签〔+ 红色必填星〕+ 右值 / 箭头」；逐行手写必然漂移，故收成一份。

  ★ 值区走 slot：只读文本 / 可点选择 / 可输入都只换值区，不把 input 塞进 props，
    让输入态与选择态各自保留原生行为（v-model / focus）。
  ★ 类名前缀是 `frow`（不是 `fr`）：`fr` 与 ColorUI 的全局原子类 .fr{float:right} 撞名。
  ★ 行间发丝线由页面显式传 divider，不用相邻兄弟选择器：MP 端自定义组件的宿主是真实节点，
    两个实例的内部根节点不是相邻兄弟，跨实例兄弟选择器在真机上不生效。
  ★ 只读值一律走 props（value / placeholder / unit / missing）；复合内容走 prefix / suffix 具名插槽。
-->
<template>
	<view
		class="frow"
		:class="{ 'frow--divider': divider }"
		:hover-class="tappable ? 'frow--hover' : ''"
		:hover-stay-time="120"
		@click="onTap"
	>
		<text class="frow__label">
			{{ label }}<text v-if="required" class="frow__req">*</text>
		</text>
		<view class="frow__val">
			<!-- prefix：值**之前**的复合内容（如状态徽章）。默认插槽是默认值渲染的
			     fallback，插了内容就不出值——所以复合内容一律走这两个具名插槽，
			     别拿默认插槽去塞芯片（2026-10-23 踩过：手机号行只剩「已验证」芯片、号没了） -->
			<slot name="prefix"></slot>
			<slot>
				<text v-if="missing" class="frow__miss">{{ missingText }}</text>
				<text v-else class="frow__text" :class="{ 'frow__text--ph': !value }">{{ value || placeholder }}</text>
				<text v-if="unit && value" class="frow__unit">{{ unit }}</text>
			</slot>
			<!-- suffix：值**之后**的芯片（当前三张表单没用到；留作「值 + 状态芯片」这类行的落点），
				     顺序 = 值 → 芯片 → 箭头 -->
			<slot name="suffix"></slot>
		</view>
		<text v-if="arrow" class="frow__arrow">›</text>
	</view>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
	label: { type: String, default: '' },
	required: { type: Boolean, default: false },
	// 只读值（复合内容走 prefix / suffix 插槽时仍要传，值本身不出插槽）
	value: { type: String, default: '' },
	placeholder: { type: String, default: '' },
	arrow: { type: Boolean, default: false },
	// 单位：跟在值后面的一小档文字（如 kg / kWh）；值本身为空时不单独出单位
	unit: { type: String, default: '' },
	// 取值失败档：整行值位换成芯片（后端查不到该字段时）
	missing: { type: Boolean, default: false },
	missingText: { type: String, default: '未查到' },
	// 行上方发丝线：**由页面给分组内第 2..n 行显式传**（跨组件实例的兄弟选择器在 MP 端不成立，
	// 页面省略不传只会少一条线、不会多线，故是 fail-visible 的显式约定）
	divider: { type: Boolean, default: false }
});

const emit = defineEmits(['tap']);

// computed 而非快照：`arrow` 将来若改成动态绑定（`:arrow="canEdit"`），快照会让
// 「箭头跟着变、但点击门与 hover 不跟着变」——有箭头却点不动
const tappable = computed(() => props.arrow);

function onTap() {
	// ⚠️ 走 `.value`：`tappable` 是 computed（ref），直接写 `if (!tappable)` 恒为假、门形同虚设
	if (!tappable.value) return;
	emit('tap');
}
</script>

<style lang="scss" scoped>
/*
  行高与发丝线（尺度逐条来自设计稿的 `.fv`）：行 **26rpx 上下内距 + 行间发丝**——
  这两条是本组件观感的关键：没有发丝线时，十几行右对齐的值会糊成一堵墙（用户 2026-10-23
  真机反馈「表单排列是乱的」）。
  ⚠️ 发丝**不能写 `.frow + .frow`**：行是 `form-row` 的内部根节点，而 MP 端自定义组件的
  **宿主节点是真实元素**（见组件头注释），两个实例的根节点隔着两层宿主、不是相邻兄弟
  → 兄弟选择器在真机上一条线都出不来（H5 无宿主节点、反而出线，两端还会不一致）。
  故发丝改由 `divider` prop 直接挂在行自己的根节点上：跨端一致、且与 `:last-child` 无关
  （结构伪类在小程序端不支持，是 rule-style-css 的黑名单）。
*/
.frow {
	display: flex;
	align-items: center;
	padding: 26rpx 0;
}

/* 行间发丝（页面给分组内第 2..n 行传 `divider`） */
.frow--divider {
	border-top: 1rpx solid rgba($text-title, 0.06);
}

.frow--hover {
	opacity: 0.7;
}

/* 标签列定宽 240rpx：窄了四字标签会贴到值上，右缘也跟着参差 */
.frow__label {
	flex-shrink: 0;
	width: 240rpx;
	font-size: $fs-body;
	color: $text-sub;
}

/* 必填星：照项目口径保留红点（设计稿 §③ 的待拍板项，本版先照原型留） */
.frow__req {
	margin-left: 4rpx;
	color: $color-danger;
	font-weight: $fw-semibold;
	font-size: $fs-body;
}

.frow__val {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: flex-end;
	min-width: 0;
}

.frow__text {
	font-size: $fs-body;
	font-weight: $fw-semibold;
	color: $text-title;
	letter-spacing: 0.5rpx;
	text-align: right;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.frow__text--ph {
	color: $text-muted;
	font-weight: $fw-medium;
}

/* 单位（随值同排、低一档） */
.frow__unit {
	margin-left: 6rpx;
	font-size: $fs-caption;
	font-weight: $fw-regular;
	color: $text-sub;
}

/* 「未查到」芯片：与表单里其它芯片同语言，表达「这一格拿不到值」而不是空着 */
.frow__miss {
	padding: 2rpx 12rpx;
	border-radius: $rd-chip;
	background-color: $color-tag-warm-bg;
	color: $color-tag-warm-fg;
	font-size: $fs-micro;
	font-weight: $fw-semibold;
}

.frow__arrow {
	flex-shrink: 0;
	margin-left: $sp-2;
	font-size: $fs-cta;
	line-height: 1;
	color: $text-muted;
}
</style>