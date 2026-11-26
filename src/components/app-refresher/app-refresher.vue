<!--
  下拉刷新指示器（easycom 自动注册，B 档页壳专用）。
  2026-09-20 首版（只有「刷新中」一态）→ 2026-10-23 改三段跟手态 → 同日三轮返修（尺寸/位置/造型/排法）。

  ★ 三段态（由 composables/usePullRefresh.js 驱动，组件本身不碰手势、不接原生事件）：
      pull    未过阈值 → 向下箭头 + 「下拉刷新」
      release 已过阈值 → 向上箭头 + 「松开立即刷新」
      refresh 请求在飞 → 品牌转圈 + 「正在刷新数据中…」+「最后更新：今天 10:49」
    排法照用户 2026-10-23 给的参考图：
      [icon]   松开立即刷新      ← 图标独立在左
             最后更新：今天 10:49  ← 两行**沿同一条中轴对称**（等字号、等粗细，短的居中在长的之上）、
                                      与图标成左右两件；图标占定宽左槽，箭头/环在同一槽里换，切换不横跳
    箭头用 clip-path 画折角、不引 PNG：它要跟着手势做 180° 翻转过渡，是 UI 元素不是业务线稿
    （static/icons/ 那套 PNG 翻不了向）。

  ★ **不上底色**（用户 2026-10-23 定「不要背景页和颜色」）：没有芯片底、没有投影，
    墨色图标 + 两行墨灰文字直接坐灰蓝页底上。文字配色取 ink 两档（$text-main / $text-sub，
    参考图里两行同色，本项目按 ink 层级给一点主次）。
    ⚠️ **唯一例外 = 刷新中的转圈**：用户同日追加「loading 的 icon 用之前那个 loading 图」，
    故它**直接复用 app-loading 的品牌转圈**（同一套 token，见 .ar__ring），是本组件唯一的彩色处。

  ★ **整块骑在「下拉让出的空档」里**（同日前两轮返修的要害）：
    原生 refresher 会把自己撑出一段高 = 下拉距离的空档，把页面内容整体顶下去，
    内容是**从空档下沿开始**的。所以指示器不能钉在导航栏下缘不动（那样空档还很矮时
    它就跟内容挤在同一块地方，看着像「文案被内容压住」），而要**底边贴住内容的上沿**：
      bottom 锚点 = 内容上沿 − 6rpx  →  下拉越深它越往下走，空档浅时上半截藏在导航栏后面
      （导航栏是纯色不透明的，见 app-navbar 的 .nb__bar），读起来就是「从栏底长出来」。
    位移用内层一个纯 px 的 translateY 实现、锚定用纯 CSS bottom 实现——
    **不写 calc(百分比 + px)**：小程序端 transform 里的 calc/百分比不可靠（行程页的月历已踩过）。
    ⚠️ 位移**由 usePullRefresh 封顶在阈值**（用户 2026-10-23 定「能一直下滑不行」）：
    过阈值后它停在原处不再下移，内容继续往下走——这就是原生指示器的标准行为（到位后停住），
    松手回弹时原生区收在阈值高度，两者又正好对齐。

  last-at 传**秒级**时间戳（口径同 utils/date 的 formatDate，内部 parseInt(obj) * 1000），
  0/空则整行不出；格式化走 utils/date 的 dayHmText（「今天 10:49」那一档，不是 hh:mm:ss）。
-->
<template>
	<view
		class="ar"
		:class="{ 'ar--show': show, 'ar--track': show && state !== 'refresh' }"
		:style="{ top: barTop + 'px' }"
	>
		<!-- 跟手位移层：纯 px 平移，跟下拉距离走（已在 composable 里封顶） -->
		<view class="ar__ride" :style="{ transform: `translateY(${offset}px)` }">
			<!-- 锚定层：底边贴住内容上沿，整块永远待在空档里 -->
			<view class="ar__anchor">
				<view class="ar__row">
					<!-- 左：图标独立一件（不跟文案同一行内，见文件头） -->
					<view class="ar__lead">
						<view v-if="state === 'refresh'" class="ar__ring"></view>
						<view v-else class="ar__arrow" :class="{ 'ar__arrow--up': state === 'release' }"></view>
					</view>
					<!-- 右：文案块。「最后刷新」只在**刷新中**出（用户 2026-10-23 定：
					     下拉那两态不给时间，免得下拉过程里信息过载；没刷过（lastAt=0）也不出） -->
					<view class="ar__col">
						<text class="ar__text">{{ text }}</text>
						<text v-if="state === 'refresh' && lastText" class="ar__last">最后更新：{{ lastText }}</text>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { computed } from 'vue';
import { getLayout } from '@/services/platform';
import { dayHmText } from '@/utils/date';

const props = defineProps({
	// 浮层显隐：pulling || refreshing 期间常驻，回弹/复位淡出（由 usePullRefresh 的 visible 给）
	show: { type: Boolean, default: false },
	// pull / release / refresh；缺省 refresh —— 本组件首版只有这一态，老调用点不传也不会塌
	state: { type: String, default: 'refresh' },
	// 秒级时间戳，0 则不显示时间行
	lastAt: { type: Number, default: 0 },
	// 跟手位移 px（已由 usePullRefresh 封顶在阈值）
	offset: { type: Number, default: 0 }
});

// 文案表按状态查：未登记的态回落到 refresh，避免手滑传错值时整块空白
const TEXT = {
	pull: '下拉刷新',
	release: '松开立即刷新',
	refresh: '正在刷新数据中…'
};
const text = computed(() => TEXT[props.state] || TEXT.refresh);
// 「今天 10:49」口径（用户 2026-10-23 给的参考图）——不是 hh:mm:ss：见 utils/date 的 dayHmText
const lastText = computed(() => (props.lastAt ? dayHmText(props.lastAt) : ''));

// 浮层顶缘 = 导航栏总高（状态栏 + 导航内容），紧贴栏底不压栏；
// 布局尺寸进程内固定（getLayout 自带缓存），无需响应式
const barTop = getLayout().customBarHeight;
</script>

<style lang="scss" scoped>
/* 挂载点：fixed 贴导航栏下缘、零高。
   只管淡入淡出，**不挂位移**（位移交给内层一个纯 px 的 translateY，两个 transform 各管各的）；
   z 90 低于导航栏（$z-nav 100）——指示器上半截滑进栏体时正好被栏盖住 */
.ar {
	position: fixed;
	left: 0;
	right: 0;
	z-index: 90;
	pointer-events: none;
	opacity: 0;
	transition: opacity $duration-base $ease-standard;
}

.ar--show {
	opacity: 1;
}

/* 跟手位移层：零高 + relative，既做位移又给下面的锚定层当定位父级
   （transform 本身就会建立包含块，relative 只是写明意图） */
.ar__ride {
	position: relative;
	height: 0;
	transition: transform $duration-base $ease-standard;
}

/* 手指还按着的时候不许有过渡，否则指示器追不上手指。
   判据是「可见 且 非刷新态」而不是「非刷新态」：复位那一刻 visible 先落、offset 随后归 0，
   两者同帧渲染——此时若还挂着无过渡档，会看到「一边淡出、一边瞬间上跳」 */
.ar--track .ar__ride {
	transition: none;
}

/* 锚定层：**底边**贴住内容被顶下来的上沿，再用 6rpx 让开内容一点。
   用 bottom（纯 CSS、纯 rpx）而不是 translateY(-100%)：小程序端 transform 里的百分比不可靠。
   ⚠️ 让位宜小不宜大：它直接吃掉空档预算（.hud-page__body 自身还有 $sp-3 上内距，
   所以 bottom 6rpx 到第一张卡片之间其实已经隔着 30rpx，不会贴脸） */
.ar__anchor {
	position: absolute;
	left: 0;
	right: 0;
	bottom: 6rpx;
	display: flex;
	justify-content: center;
}

/* 图标左、文案右（用户 2026-10-23 定）。不铺底、不上色，整组靠 .ar__anchor 居中在屏 */
.ar__row {
	display: flex;
	align-items: center;
}

/* 左槽：箭头与环共用一格，定宽让两种图标切换时整行不横跳（槽比环大 2rpx 留一线余量） */
.ar__lead {
	width: 34rpx;
	height: 34rpx;
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
}

/* 右：两行文案**沿同一条中轴对称**（用户 2026-10-23 给的参考图就是这个排法：
   两行等字号、等颜色、中线重合，短的那行居中在长的那行之上）。
   上一版是 align-items: flex-start（两行彼此左对齐），与参考图不符，已改 */
.ar__col {
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-left: 12rpx;
}

/* 两行**同字号**（参考图实测两行字高一致，没有主次差），只靠颜色分主次 */
.ar__text,
.ar__last {
	font-size: $fs-caption;
	line-height: 1.2;
}

.ar__text {
	font-weight: $fw-medium;
	color: $text-main;
}

/* 行距按参考图的比例给（两行墨迹间距 ≈ 1.1 倍字高）：45rpx 换算到本项目尺度约 12rpx 外边距。
   ⚠️ 这个值受空档预算约束（见 usePullRefresh 的 PULL_THRESHOLD 注释）：块高 = 2 行 + 本外边距
   + bottom 让位，必须装得进那段空档——现在 67 + 6 = 73rpx，45px 在 428pt 大屏上 ≈ 79rpx，够用 */
.ar__last {
	margin-top: 12rpx;
	color: $text-sub;
}

/* 箭头：24×14rpx 的折角，笔画约 6rpx。用 clip-path 画而不是「两条 border 转 45°」——
   后者在转角处会露出一条斜接缝、观感毛糙（用户反馈「样式丑」的主因之一）。
   过阈值不换图，整体翻 180°（带过渡，跟着手势即时翻） */
.ar__arrow {
	width: 24rpx;
	height: 14rpx;
	background: $text-sub;
	clip-path: polygon(0 0, 30% 0, 50% 42%, 70% 0, 100% 0, 50% 100%);
	transition: transform $duration-base $ease-standard;
}

.ar__arrow--up {
	transform: rotate(180deg);
}

/* 刷新中：**直接用 app-loading 那只品牌转圈**（用户 2026-10-23 点单「loading 的 icon 用之前那个」）。
   构造与 token 与 components/app-loading 的 `.app-loading__spinner` 逐字同款
   （浅灰底圈 $bg-fill-chip + 主色高亮弧 + 数值强调色第二弧 + 0.8s 匀速），
   只按左槽尺寸缩小（72rpx/6rpx → 32rpx/5rpx）——**全项目「转圈」只此一种构造**，
   刷新指示器不另立第二套语言。
   ⚠️ 本组件**唯一**的彩色处就是这一枚：下拉两态（墨色箭头 + 墨灰文案）依旧无彩色 */
.ar__ring {
	width: 32rpx;
	height: 32rpx;
	border: 5rpx solid $bg-fill-chip;
	border-top-color: $color-primary;
	border-right-color: $color-primary-dark;
	border-radius: 50%;
	animation: ar-spin 0.8s linear infinite;
}

@keyframes ar-spin {
	to {
		transform: rotate(360deg);
	}
}
</style>