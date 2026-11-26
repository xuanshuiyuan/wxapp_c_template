<!--
  通用骨架屏（easycom 自动注册：<app-skeleton /> 直接用，无需 import）。

  包装 uview-plus 的 u-skeleton，不重复造轮子；这层只补三件事：
    1. 形状预设（type），和 scaffold.scss 的真实版式对齐，骨架和到货内容形状一致：
         list  模仿 .list-item：方头像 72rpx + 标题 + 两行短条（徽标/说明位）
         card  模仿卡片内文字块：标题 + 几行正文
         text  纯段落（无头像无标题）
    2. 灰块颜色跟项目 token（uview 默认吃 --up-fill-color，主题不同会不可控）
    3. 多条目重复（count）：列表首屏一次铺出 N 条占位，而不是孤零零一组

  两种用法：
    条件渲染：<app-skeleton v-if="firstLoading" type="list" :count="4" />
    包裹内容：<app-skeleton :loading="firstLoading" type="list">真实内容放默认插槽</app-skeleton>
-->
<template>
	<template v-if="loading">
		<view class="app-skeleton" :class="{ 'app-skeleton--gap': count > 1 }" v-for="n in Number(count)" :key="n">
			<u-skeleton
				loading
				:animate="animate"
				:avatar="shape.avatar"
				:avatar-size="shape.avatarSize"
				avatar-shape="square"
				:title="shape.title"
				:title-width="shape.titleWidth"
				:title-height="shape.titleHeight"
				:rows="rows"
				:rows-width="shape.rowsWidth"
				:rows-height="shape.rowsHeight"
			/>
		</view>
	</template>
	<slot v-else />
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
	// 显示骨架（true）还是渲染默认插槽内容（false）
	loading: { type: Boolean, default: true },
	// 形状预设：list / card / text
	type: { type: String, default: 'list' },
	// 0 = 用预设默认行数；要更贴内容可显式传
	rows: { type: [String, Number], default: 0 },
	// 重复几条骨架（列表占位用）
	count: { type: [String, Number], default: 1 },
	// 扫光动画
	animate: { type: Boolean, default: true }
})

// rowsWidth 用百分比即可：u-skeleton 会实测容器宽度换算（小程序/H5 都支持）
const SHAPES = {
	list: {
		avatar: true,
		avatarSize: '72rpx', // = .avatar-letter
		title: true,
		titleWidth: '45%',
		titleHeight: '30rpx', // ≈ $fs-base 名行
		rows: 2,
		rowsHeight: '22rpx', // ≈ $fs-xs 徽标/说明行
		rowsWidth: ['75%', '55%']
	},
	card: {
		avatar: false,
		title: true,
		titleWidth: '35%',
		titleHeight: '30rpx',
		rows: 3,
		rowsHeight: '26rpx',
		rowsWidth: ['100%', '92%', '60%']
	},
	text: {
		avatar: false,
		title: false,
		titleWidth: '50%',
		titleHeight: '26rpx',
		rows: 3,
		rowsHeight: '26rpx',
		rowsWidth: ['100%', '100%', '65%']
	}
}

const shape = computed(() => SHAPES[props.type] || SHAPES.list)
const rows = computed(() => Number(props.rows) || shape.value.rows)
</script>

<style lang="scss" scoped>
.app-skeleton {
	// u-skeleton 的灰块底色/扫光高光读的是这两个 CSS 变量（自定义属性可继承进子组件），
	// 在这里映射到项目 token：换 theme.scss 的色板，骨架屏自动跟色。
	--up-skeleton-bg-color: #{$border-color};
	--up-skeleton-shimmer-color: #{$bg-card};
}

// 多条骨架之间的间隔，对齐 .list-item 的行距观感
.app-skeleton--gap {
	margin-bottom: $card-gap;
}
</style>
