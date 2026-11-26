// ---------------------------------------------------------------------------
// JS 侧的主题 token。
//
// 存在的原因：u-icon / u-loading-icon 这类组件的 color 是 prop，只能传字符串，
// 读不到 SCSS 变量（common/css/theme.scss）。没有这个文件的话，色值就会散落在
// 各页面的模板里，改主色时必然漏几处。
//
// ⚠️ 这里的值必须与 common/css/theme.scss 保持一致，改颜色时两处一起改
//    （theme.scss 是唯一真源）。
// 样式表里请优先用 SCSS 变量或 base.scss 的原子类，不要 import 这个文件拼字符串。
// ---------------------------------------------------------------------------

export const theme = {
	// 主色
	primary: '#1FBF8F',
	primaryDark: '#12A276',
	primaryLight: '#E6F8F1',

	success: '#16A34A',
	// warning 是暖橙告警，与 accent（数值强调）不是同一语义
	warning: '#F0A22E',
	danger: '#EF4444',
	info: '#8C9B95',
	// 文字
	textTitle: '#1B2A25',
	textMain: '#2C3A34',
	textSub: '#5D716A',
	textMuted: '#95A7A1',
	textDisabled: '#B9C6C1',
	textInverse: '#ffffff',
	textOnYellow: '#FFFFFF', // 主色底上的文字（历史名）

	// 背景与填充
	bgPage: '#FFFFFF',
	bgCard: '#FFFFFF',
	bgFillWeak: '#F2F8F5',
	bgFillChip: '#EFF9F5',
	bgFillIcon: '#2F4A42',
	// 导航栏 / tabBar / pages.json 窗口底色（三处同值）
	navSolid: '#E9F4EF',

	// 描边
	border: '#E3EFE9',
	divider: '#E2EBE7',

	// 保留
	bgHover: '#F2F7F5',
	iconPlaceholder: '#dcdfe6'
};

export default theme;