// ---------------------------------------------------------------------------
// 多端差异适配层。页面里禁止出现 #ifdef —— 需要区分端时调这里。
// 目前保证 微信小程序 / H5 / App 三端，其余小程序端按 mp 分支处理。
// ---------------------------------------------------------------------------

import { withLoading } from '@/services/toast';

let runtime = 'mp';
// #ifdef H5
runtime = 'h5';
// #endif
// #ifdef APP-PLUS
runtime = 'app';
// #endif

/** 当前运行端：'mp' | 'h5' | 'app' */
export const RUNTIME = runtime;
export const isMP = runtime === 'mp';
export const isH5 = runtime === 'h5';
export const isApp = runtime === 'app';

let layout = null;

/**
 * 布局尺寸（进程内算一次就缓存）
 * @returns {{
 *   statusBarHeight: number, // 状态栏高度，H5 恒为 0
 *   navBarHeight: number,    // 自定义导航栏内容区高度
 *   customBarHeight: number, // 状态栏 + 导航栏总高，页面内容顶部要让出这个值
 *   capsuleReserve: number,  // 自绘顶栏右侧要给微信胶囊让出的宽度（px），非微信端恒为 0
 *   tabBarOverlay: number,   // tabBar 页内覆盖高度（px）：H5/App 的 tabBar 是页内 fixed 浮层要自让位，MP 原生栏已排除恒 0
 *   safeBottom: number,      // 底部安全区，H5 恒为 0（用 CSS env(safe-area-inset-bottom)）
 *   isNotch: boolean
 * }}
 */
export function getLayout() {
	if (layout) return layout;

	// uni.getSystemInfoSync 已废弃，改用拆分的新 API 合并
	let info = {};
	try {
		info = { ...uni.getDeviceInfo(), ...uni.getWindowInfo(), ...uni.getAppBaseInfo() };
		// isIphoneX 不在新 API 中，从 safeAreaInsets 推导
		if (info.isIphoneX === undefined) {
			info.isIphoneX = (info.safeAreaInsets?.bottom || 0) > 0 && info.platform === 'ios';
		}
	} catch (e) {
		info = uni.getSystemInfoSync() || {};
	}
	const statusBarHeight = isH5 ? 0 : info.statusBarHeight || 0;
	const insets = info.safeAreaInsets || {};

	let navBarHeight = 44;
	let capsuleReserve = 0;
	// #ifdef MP-WEIXIN
	// 小程序按胶囊按钮上下留白对称来算导航栏高度，才能和其他小程序原生页视觉一致
	const capsule = typeof uni.getMenuButtonBoundingClientRect === 'function' ? uni.getMenuButtonBoundingClientRect() : null;
	if (capsule && capsule.top) {
		navBarHeight = (capsule.top - statusBarHeight) * 2 + (capsule.height || 32);
		// 自绘顶栏的右侧内容不能钻到原生胶囊底下：让出宽度 = 屏宽 - 胶囊左缘 + 8px 呼吸
		capsuleReserve = (info.windowWidth || 375) - capsule.left + 8;
	}
	// #endif

	const safeBottom = isH5 ? 0 : insets.bottom || 0;

	layout = {
		statusBarHeight,
		navBarHeight,
		customBarHeight: statusBarHeight + navBarHeight,
		capsuleReserve,
		// H5/App 的 tabBar 是 webview 内 fixed 浮层（约 50px），盖在页面底部；MP 为原生栏不占 webview
		tabBarOverlay: isH5 || isApp ? 50 : 0,
		safeBottom,
		isNotch: (insets.bottom || 0) > 0 || info.isIphoneX || false,
		windowWidth: info.windowWidth || 375,
		platform: info.platform || ''
	};
	return layout;
}

// ---------------------------------------------------------------------------
// 全屏浮层锁滚（app-modal / app-loading 打开时调）：
// 小程序 / App 端浮层根节点 @touchmove.stop.prevent（等价 catchtouchmove）已挡住触摸滚动，这里空转；
// H5 桌面端鼠标滚轮 / 方向键直接滚 body，touchmove 拦不住 → 唯一办法是锁 body 溢出。
// 引用计数：弹窗 + loading 同时打开时各占一票，最后一票释放才真正解锁，
// 谁也不许直接再写 document.body.style（两处浮层各自恢复会把对方坑掉）。
// ---------------------------------------------------------------------------
let scrollLockCount = 0;

export function lockPageScroll() {
	// #ifdef H5
	scrollLockCount += 1;
	document.body.style.overflow = 'hidden';
	// uni-app H5 实际可滚容器，仅 body 不够
	const pageBody = document.querySelector('uni-page-body');
	if (pageBody) pageBody.style.overflow = 'hidden';
	// #endif
}

export function unlockPageScroll() {
	// #ifdef H5
	scrollLockCount = Math.max(0, scrollLockCount - 1);
	if (scrollLockCount === 0) {
		document.body.style.overflow = '';
		const pageBody = document.querySelector('uni-page-body');
		if (pageBody) pageBody.style.overflow = '';
	}
	// #endif
}

/**
 * 拨打电话：uni.makePhoneCall 三端行为一致（H5 走 tel: 协议），统一包这一个小出口。
 * 用户取消拨号也走 fail，属正常路径只留日志。
 * @param {string} phoneNumber 号码字符串，拨打前剔除连字符等非拨号字符
 */
export function callPhone(phoneNumber) {
	const tel = String(phoneNumber || '').replace(/[^\d+\-*#]/g, '');
	if (!tel) return;
	uni.makePhoneCall({
		phoneNumber: tel,
		fail: err => console.warn('[callPhone] 取消或拨号失败：', err)
	});
}

/**
 * 短促轻震（微信 type:'light' 需基础库 ≥2.2.3；App 端为默认短震；H5 静默跳过）。
 * 失败不打日志：震动属可选反馈，拿不到反馈不算异常。
 */
export function vibrateLight() {
	if (isH5) return;
	uni.vibrateShort({ type: 'light', fail: () => {} });
}

// ---------------------------------------------------------------------------
// 打开在线文档（PDF）。
// 为什么要包在这层：三端打开方式不一样——小程序 / App 没有可直接预览 PDF 的 API，
// 必须先 downloadFile 落地到本地临时文件再 openDocument；H5 只能新窗口直开链接。
// ---------------------------------------------------------------------------

/**
 * 打开在线文档（PDF）。
 * 小程序 / App：先下载到本地临时文件，再调起原生文档预览；下载过程托管 loading。
 * H5：静默回落新窗口打开直链。
 * @param {string} url 文档绝对地址
 * @param {object} [options]
 * @param {string} [options.fileType] 小程序 openDocument 的文件类型；地址无扩展名时必须显式给
 * @returns {Promise<void>} 失败 reject，由调用方 toast 兜底
 */
export function openDocument(url, options = {}) {
	if (!url) return Promise.reject(new Error('文档地址为空'));

	// #ifdef H5
	const win = window.open(url);
	if (!win) return Promise.reject(new Error('新窗口被浏览器拦截'));
	return Promise.resolve();
	// #endif

	// #ifndef H5
	return withLoading(
		() =>
			new Promise((resolve, reject) => {
				uni.downloadFile({
					url,
					success: res => {
						if (res.statusCode !== 200) {
							reject(new Error(`下载失败（${res.statusCode}）`));
							return;
						}
						uni.openDocument({
							filePath: res.tempFilePath,
							...(options.fileType ? { fileType: options.fileType } : {}),
							showMenu: true,
							success: () => resolve(),
							fail: reject
						});
					},
					fail: reject
				});
			}),
		'正在打开文件'
	);
	// #endif
}

// ---------------------------------------------------------------------------
// 横屏锁定（手写签名这类全屏横屏页）：
//   · 小程序：方向由页面配置 pageOrientation: "landscape" 承担，运行时无需动作；
//   · App：必须显式锁定，离开页面再解锁；
//   · H5：浏览器不允许脚本强制锁方向，这里空转。
// 锁 / 解锁必须成对调用（页面 onShow / onHide + onUnload 都要兜）。
// ---------------------------------------------------------------------------
export function lockLandscape() {
	// #ifdef APP-PLUS
	plus.screen.lockOrientation('landscape-primary');
	// #endif
}

export function unlockOrientation() {
	// #ifdef APP-PLUS
	plus.screen.lockOrientation('portrait-primary');
	// #endif
}

// ---------------------------------------------------------------------------
// 点分版本号比较：按 target 的段数逐段比，缺段补 0，全等视为满足
// ---------------------------------------------------------------------------
function versionGte(current, target) {
	const cur = String(current || '0').split('.').map(Number);
	const need = String(target || '0').split('.').map(Number);
	for (let i = 0; i < need.length; i++) {
		const a = cur[i] || 0;
		const b = need[i] || 0;
		if (a > b) return true;
		if (a < b) return false;
	}
	return true;
}

/** 系统/微信版本号比较，用于「低版本走降级方案」 */
export function systemVersionGte(target) {
	let info = {};
	try {
		info = { ...uni.getDeviceInfo(), ...uni.getWindowInfo(), ...uni.getAppBaseInfo() };
	} catch (e) {
		info = uni.getSystemInfoSync() || {};
	}
	return versionGte(info.version, target);
}

// ---------------------------------------------------------------------------
// 扫码能力分档：
//   'camera' —— 页内全屏 camera 取景层就地扫：微信小程序，且基础库 ≥ 2.27.1
//   'system' —— 系统全屏「扫一扫」：App 端，以及微信低版本的降级档
//   'none'   —— 无扫码能力：H5（没有相机权限模型）
// 页面只消费「能力」，不区分端（同 MAP_MODE 的分工）。
// ---------------------------------------------------------------------------
const MP_SDK_SCAN_BARCODE = '2.27.1';

function resolveScanMode() {
	if (isH5) return 'none';
	if (isApp) return 'system';
	// #ifdef MP-WEIXIN
	let sdk = '';
	try {
		sdk = (wx.getAppBaseInfo ? wx.getAppBaseInfo() : wx.getSystemInfoSync()).SDKVersion || '';
	} catch (e) {
		// 取不到版本按支持处理：判 false 反而把主路误降级
		sdk = MP_SDK_SCAN_BARCODE;
	}
	return versionGte(sdk, MP_SDK_SCAN_BARCODE) ? 'camera' : 'system';
	// #endif
	return 'system';
}

/** 扫码方式：'camera' | 'system' | 'none'（进程内算一次） */
export const SCAN_MODE = resolveScanMode();
/** 有没有扫码入口（H5 = false） */
export const canScan = SCAN_MODE !== 'none';
/** 能不能页内就地扫（true 时页面才挂全屏相机取景层） */
export const canInlineScan = SCAN_MODE === 'camera';

/**
 * 相机授权（scope.camera）：先显式要权限再挂相机，免得 camera 组件自己弹框、被拒后页面没有引导位。
 * @returns {Promise<boolean>} true = 已授权；false = 被拒（页面出「去设置」带）
 */
export function authorizeCamera() {
	return new Promise(resolve => {
		uni.authorize({
			scope: 'scope.camera',
			success: () => resolve(true),
			fail: () => resolve(false)
		});
	});
}

/**
 * 系统全屏扫一扫：一维条形码优先，qrCode 并收兼容码型变更。
 * 用户取消属正常操作，与失败一样回空串。
 * @returns {Promise<string>} 码文，取消/失败为 ''
 */
export function scanCodeSystem() {
	return new Promise(resolve => {
		uni.scanCode({
			scanType: ['barCode', 'qrCode'],
			success: res => resolve(String((res && res.result) || '')),
			fail: () => resolve('')
		});
	});
}

/**
 * 打开小程序设置页引导用户开相机。
 * @returns {Promise<boolean>} 用户回到页面时 scope.camera 是否已开启
 */
export function openCameraSetting() {
	return new Promise(resolve => {
		uni.openSetting({
			success: res => resolve(!!(res.authSetting && res.authSetting['scope.camera'])),
			fail: () => resolve(false)
		});
	});
}

export default {
	RUNTIME,
	isMP,
	isH5,
	isApp,
	getLayout,
	lockPageScroll,
	unlockPageScroll,
	callPhone,
	vibrateLight,
	openDocument,
	lockLandscape,
	unlockOrientation,
	systemVersionGte,
	SCAN_MODE,
	canScan,
	canInlineScan,
	authorizeCamera,
	scanCodeSystem,
	openCameraSetting
};
