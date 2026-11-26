// ---------------------------------------------------------------------------
// 定位基础设施：跨端「取当前经纬度」统一入口。
//
// 为什么单独一层：wx.getLocation / uni.getLocation 在小程序/H5 端只回经纬度、不带城市名
// （逆地理仅 App 端支持），城市名解析交给后端；
// 本层只负责「拿坐标 + 吞失败」——拒权/失败/不支持端统一回落 null 由调用方兜底，
// 不向上抛：定位是装饰性能力的前置，不能把异常扩散进页面主流程。
//
// 坐标系统一 gcj02：国内逆地理/地图服务口径。
// ---------------------------------------------------------------------------

// 系统定位回调超时（ms）：真机上授权弹窗挂着不确认时 success/fail/complete 一个都不会回，
// 而上层调用方通常是「单飞」语义——死 Promise 会把后续调用全部复用成悬挂请求。
// 3s 覆盖正常冷启动定位耗时，超即按失败放行调用方走兜底。
const LOCATE_TIMEOUT = 3000;

// 定位失败退避窗（ms）：拒权是持续状态，原实现只缓存成功值，导致每次调用都重打一遍
// 注定失败的 getLocation。窗内直接回 null；窗满再给一次机会。
const FAIL_COOLDOWN = 60000;

// 会话级坐标缓存 + 单飞：一次冷启动定位一次就够（省电、避免频繁唤起定位）
let cached = null; // { longitude, latitude }
let pending = null;
let failAt = 0;

/**
 * 获取当前经纬度
 * @param {object} [opts]
 * @param {boolean} [opts.force=false] 绕过会话缓存与失败退避重新定位
 * @returns {Promise<{longitude: string, latitude: string}|null>} 拒权/失败/超时/不支持端返回 null
 */
export function getCurrentCoord(opts = {}) {
	const { force = false } = opts;
	if (cached && !force) return Promise.resolve(cached);
	if (!force && failAt && Date.now() - failAt < FAIL_COOLDOWN) return Promise.resolve(null);
	if (pending) return pending;

	pending = new Promise(resolve => {
		let timer = null;
		let settled = false; // 超时后才回来的回调：结果照常入库供下次用，但不再二次 resolve

		const finish = value => {
			if (value) cached = value;
			else failAt = Date.now();
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			pending = null; // 单飞口在每个出口释放
			resolve(value);
		};

		timer = setTimeout(() => finish(null), LOCATE_TIMEOUT);
		uni.getLocation({
			type: 'gcj02',
			success: res => finish({ longitude: String(res.longitude), latitude: String(res.latitude) }),
			// 拒权 / 平台不支持 / manifest 未声明 requiredPrivateInfos 等全部降级为 null
			fail: () => finish(null)
		});
	});
	return pending;
}