// 时间戳格式化（纯函数，无业务语义）
// format: ymdhms(默认) / ymdhm / ymd / ym / hms(仅时分秒) / hm(仅时分) / md(仅月日) /
//         yStr / ymStr / ymdStr / mdStr

export function formatDate(obj, format = 'ymdhms') {
	const time = new Date(parseInt(obj) * 1000);
	const y = time.getFullYear();
	const m = String(time.getMonth() + 1).padStart(2, '0');
	const d = String(time.getDate()).padStart(2, '0');
	const h = String(time.getHours()).padStart(2, '0');
	const mm = String(time.getMinutes()).padStart(2, '0');
	const s = String(time.getSeconds()).padStart(2, '0');

	const formatMap = {
		yStr: `${y}年`,
		ymStr: `${y}年${m}月`,
		ymdStr: `${y}年${m}月${d}日`,
		ymd: `${y}-${m}-${d}`,
		ym: `${y}-${m}`,
		ymdhm: `${y}-${m}-${d} ${h}:${mm}`,
		hms: `${h}:${mm}:${s}`,
		hm: `${h}:${mm}`,
		md: `${m}-${d}`,
		mdStr: `${m}月${d}日`
	};
	return formatMap[format] || `${y}-${m}-${d} ${h}:${mm}:${s}`;
}

/**
 * 秒级时间戳 → 「今天 10:49」/「昨天 10:49」/「10-20 10:49」。
 * 与 formatDate 的 hm 档区别在**前面带一个相对日**：用户只关心「刚更新过没有」，
 * 跨天时给「今天/昨天」比丢一个完整日期更像人话；再往前才退化成月-日。
 * 只比到「日」，故两边都归零到当天 0 点再比。
 */
export function dayHmText(obj, now = Date.now()) {
	const time = new Date(parseInt(obj) * 1000);
	const hm = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
	const dayStart = t => new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
	const diffDays = Math.round((dayStart(new Date(now)) - dayStart(time)) / 86400000);
	if (diffDays === 0) return `今天 ${hm}`;
	if (diffDays === 1) return `昨天 ${hm}`;
	const m = String(time.getMonth() + 1).padStart(2, '0');
	const d = String(time.getDate()).padStart(2, '0');
	return `${m}-${d} ${hm}`;
}

/**
 * 秒级时间戳 → 「MM-DD HH:mm」，跨年补年份（「YYYY-MM-DD HH:mm」）。
 * 列表 / 详情统一走这一档；缺值 / 非法时间回空串，由消费方印 `--`。
 */
export function mdHmText(obj, now = Date.now()) {
	const ts = Number(obj) || 0;
	if (ts <= 0) return '';
	const d = new Date(ts * 1000);
	if (Number.isNaN(d.getTime())) return '';
	const pad = n => String(n).padStart(2, '0');
	const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
	const md = `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
	const nowYear = new Date(now).getFullYear();
	return d.getFullYear() === nowYear ? `${md} ${time}` : `${d.getFullYear()}-${md} ${time}`;
}

/**
 * 'YYYY-MM-DD HH:mm:ss' → Date（本地时区；时间部分可缺省，也容忍 T 分隔）。
 * 不用 new Date(str)：iOS JSC 不认横杠日期串、恒回 Invalid Date（多端坑），统一正则拆分构造。
 * 入参非法/空回 null，展示兜底由调用方决定。
 */
export function parseDateTimeStr(str) {
	const m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/.exec(String(str || '').trim());
	if (!m) return null;
	const d = new Date(
		Number(m[1]), Number(m[2]) - 1, Number(m[3]),
		Number(m[4] || 0), Number(m[5] || 0), Number(m[6] || 0)
	);
	return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * 相对时间文案：不足 1 分钟=刚刚 / 不足 1 小时=x分钟前 / 不足 24 小时=x小时前 /
 * 不足 48 小时=昨天 / 7 天内=x天前 / 更远回落 MM-DD。解析失败回 ''。
 */
export function timeAgo(str, now = Date.now()) {
	const d = parseDateTimeStr(str);
	if (!d) return '';
	const min = Math.floor((now - d.getTime()) / 60000);
	if (min < 1) return '刚刚';
	if (min < 60) return `${min}分钟前`;
	const hour = Math.floor(min / 60);
	if (hour < 24) return `${hour}小时前`;
	if (hour < 48) return '昨天';
	const day = Math.floor(hour / 24);
	if (day <= 7) return `${day}天前`;
	const mm = String(d.getMonth() + 1).padStart(2, '0');
	const dd = String(d.getDate()).padStart(2, '0');
	return `${mm}-${dd}`;
}