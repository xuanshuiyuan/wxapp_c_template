---
name: design-preview
description: 用户直接贴设计稿/原型截图（一张或多张），或给后端仓的 versions/vN/design-brief.md / 一段文字需求，要求在 docs/design 生成设计预览 HTML 模板；或要求把已落地的旧模板归档进 docs/design/archive 时使用。给出完整流程：先归档旧稿并修相对资源路径 → 读图或读 brief 提取可落地参数 → 判断有无契约 → 按内置骨架出稿（手机框 / token 表 / 状态档 / 待后端确认）→ headless Chrome 渲染自检 → 更新 archive/README 与记忆 → 待确认回灌后端 open-questions.md 的待确认区。产出的只有 docs/ 下的 HTML，不改业务代码。
---

# design-preview

> 本 skill 只讲**怎么出一份稿**。视觉 token 的唯一权威是 `rule-style-css`（theme.scss 真源）；分层与归位是 `rule-project-structure`；
> 稿里的业务口径若已进代码，写法以对应 rule-skill 为准（本 skill 不重复禁令）。
> 产出物：`docs/design/*.html`（**不进版本库**，`.gitignore` 已忽略整个 `docs/`）。

## 什么时候用

- 用户贴图（1~N 张原型 / 截图）说「生成模板」「做个稿」「放在 docs/design」；
- 用户贴图 + 一句话需求（如「首页这里加一个按钮」）——**先出稿**；
- 用户给后端仓 `后端仓` 的 `versions/vN/design-brief.md`（页面清单 / 字段口径 / 状态档 / 动作）或一段文字需求，说「按这个出稿」——**先出稿**；
- 用户要「把之前的模板移到 archive」；
- 用户贴图后**明确要求直接改代码** → 转 `rule-add-page` / `project-dev`，稿作为附属产物。

**不触发**：只是问某个页面怎么实现、只是改样式、只是评审代码。

---

## 一、开工第一步：归档旧稿

新稿一律放 `docs/design/` **根**；已落地页面的旧稿进 `docs/design/archive/`。

```bash
cd docs/design
mkdir -p archive
# 只搬旧稿：把本轮要新建的文件名从 case 里排除
for f in *.html; do
  case "$f" in my-new-page-preview.html) ;;
  *) [ -f "$f" ] && mv "$f" archive/ ;;
  esac
done
```

⚠️ **同一批只归档一次**：用户在同一批里追加稿（「再加一个模板」）时**不要重复归档**——
archive 里已经装着上一批，本轮已写在根目录的稿不该被搬走。只在新一批开工时执行一次；
真要重跑，先把本轮文件名全部列进 `case` 排除。

**移动后必须修相对资源路径**（archive 比根深一层；旧稿普遍直链 `../../src/static/...`）：

```bash
sed -i 's|="\.\./\.\./src/|="../../../src/|g' archive/*.html
# 若同时存在更深层的旧引用（历史上偶有 3 级），统一归一后再校验：
sed -i 's|="\.\./\.\./\.\./\.\./src/|="../../../src/|g' archive/*.html
```

**校验（必做）**——列出所有解析不到的相对资源，逐条如实登记（真的缺失就写进 README，别伪造）：

```bash
python3 - <<'PY'
import glob, os, re
base = os.path.abspath("docs/design/archive")
bad = []
for f in glob.glob(base + "/*.html"):
    for p in re.findall(r'(?:src|href)="([^"]+)"', open(f, encoding="utf-8").read()):
        if p.startswith(("http", "#", "data:")):
            continue
        if not os.path.exists(os.path.normpath(os.path.join(base, p))):
            bad.append((os.path.basename(f), p))
print("missing:", len(bad)); [print(b) for b in bad]
PY
```

`archive/README.md` 必写四件事：
1. 归档日期与原因（「根目录只放新稿」）；
2. 路径映射：旧文档里的 `docs/design/<name>-preview.html` → 现在在 `docs/design/archive/<name>-preview.html`；
3. **旧引用不改写**（`.claude/changelog/`、`project-meta/versions/*` 属历史审计，按项目约定「历史条目不改写」）；
4. 「新稿在哪」表（本轮新增的每一份都要登记）。

⚠️ `docs/` 被 `.gitignore` 忽略：**不要 `git add docs/`**，也不要在 SYNC 里把它们的未跟踪状态当漂移修掉。

---

## 二、读输入：截图 / 文字需求 → 可落地的清单

逐屏（逐块）记录，不要漏：

| 维度 | 记什么 |
|---|---|
| 页面骨架 | 导航栏（标题/返回/胶囊）、分几块、哪块是白舱、哪块是无框 |
| 每块 | 标题（含黄竖条？）、右侧件（链接 / 芯片 / 计数）、主体结构 |
| 每个读数 | 标签 / 值 / 单位 / 副行 / 小数位 / 千分位 / 单位大小写 |
| 颜色语义 | 哪些是状态色（绿/橙/红）、哪些是主色（薄荷绿）、哪些只是装饰 |
| 动作 | 按钮文案、主次、是否吸底 |
| 出口 | 页脚 / 跳转箭头 / 强制的列表项，**每个出口的落点** |
| 注释气泡 | 稿上的编号说明（设计师意图，往往就是验收口径） |

同时标记三类「不能自己拍」的点，直接进「待后端确认 / 待拍板」表：
1. 语义不明（如「表显上探值」到底是什么口径）；
2. 与项目既有口径冲突（如里程用精确 km vs `mileageWanText` 的万公里、单位大小写）；
3. 前后矛盾（同一数字出现两遍、注释与画面对不上）。

### 输入是文字需求（含后端 design-brief）

`后端仓/.claude/project-meta/versions/vN/design-brief.md` 已经把页面清单和逐页的
区块 / 字段口径 / 状态档 / 动作写好了。**按会话所在环境选路径写法，两种不能混用**：

| 会话环境 | 路径写法 |
|---|---|
| 本机 / WSL | `<后端仓>/ .claude/project-meta/versions/vN/design-brief.md`（按实际路径） |

UNC 地址在 WSL 里解析不到（反斜杠不是目录分隔符），Linux 路径在 Windows 侧也不认；
读不到先换另一种写法，别猜文件不存在。按它读，**不要自己重排信息架构**：

- 先确认这次是哪一页 / 哪几页：只出清单里的页面，不顺手加 brief 没写的区块；
- 用上面同一张维度表把 brief 转成稿子清单；brief 没写的（空态、断网、失败提示）按常识默认，
  并在稿头「与参考图的差异」里写明「brief 未定义，暂按……画」；
- **契约**：brief 标「无契约」或「示意名」的字段，稿里也必须标示意名，稿头写「本页当前无契约」；
  brief 里出现字段名 ≠ 已定契约；
- 三档状态照画（正常 / 空或离线 / 未绑定或不可评估）；brief 只给两档时补第三档并说明；
- 视觉 token 仍只从 `src/common/css/theme.scss` 取，brief 不写色值。

---

## 三、调研（先查再画，10 分钟内）

1. **页面是否已存在**：`grep -rn "<关键词>" src/pages src/packages`；
2. **接口与契约**：`src/config/endpoints.js` + 后端 `.claude/project-meta/versions/<最新>/api-miniprogram.md`
   —— **没有就明写「本页当前无契约」**，字段名一律标「示意名」；
3. **token**：`src/common/css/theme.scss`（唯一值源，别自造色值）；版式读 `src/styles/scaffold.scss`；
4. **可复用组件**：`components/app-*`（已存在的才能在稿里出现）、`.hud-frame/.hud-panel/.hud-tile`；
5. **同类稿**：看 `docs/design/archive/` 里最近一份同族页面稿，抄它的骨架而不是从零造。

---

## 四、写稿：固定骨架（可直接抄）

### 4.1 文件命名与拆分

- `<page>-preview.html`，kebab-case，带域前缀（`home-` / `battery-` / `vehicle-` / `valuation-` / `sell-` / `recycle-`）；
- **一屏一稿**：同一张图里并排两屏（如「主页面 + 全屏地图页」）= 两个文件，互相引用；
- 增改型需求（给某模块加一个入口）= 单独一份「入口稿」，**不重画整页**，但要带 1:1 局部图与周边节奏；
- 有页面代号（H01 / B10 / 灌在页脚的出口编号）就照抄；**代号没给就不编**。

### 4.2 稿头注释块（必须，逐条填）

```html
<!--
  ============================================================================
  「<页面名>」页设计稿（YYYY-MM-DD 建稿）
  ============================================================================
  来源：用户 YYYY-MM-DD 给的 N 屏参考稿（<出处/旁注>）。
  本页角色：一句话说清它解决什么（与邻居页的分工也要写）。
  入口 / 出口：从哪进、能去哪（含页面代号）。
  ⚠️ 当前无契约：仓库里没有对应接口（列举已查过的位置）；本稿只定展示形态与信息架构，
     字段名与语义待后端，落地前按 memory「设计稿先于契约的顺序」逐条回验。
  ── 与参考图的差异（本稿为准）────────────────────────────────
   a. 通用白圆角卡 → .hud-frame/.hud-panel 圆角舱（28rpx 描边 + 白瓷面，理由）
   b. 深色牌照块 → app-plate-chip（理由）
   c. ...逐条列
  ── 色值来源：src/common/css/theme.scss 镜像（见 :root），1rpx = 1px ──────────
  ============================================================================
-->
```

### 4.3 页面骨架（章节顺序固定）

1. `<h1>` + `.sub`（一句话定位 + 无契约声明）
2. `① 手机框`：750px 宽 = 750rpx，`statusbar 44` + `navbar 84` + `.body`
3. `② 逐件 token 落点`：左表「元素 / 字号·色值·间距」+ 右表「为什么是这个形态」
4. `③ 状态与边界`：**至少三类**——正常 / 离线或空 / 未绑定或不可评估；每类一张 690 宽的裁切卡 + 说明
5. `④ 出口与交互`：动作 → 触发处 → 落点（含门槛、频控、不重试口径）
6. `⑤ 待后端确认`：Q1..Qn 表（每条写「为什么必须先答」）+ 落地红线 okbox
7. 可选 `⑥ 待拍板`：产品口径二选一（给默认值与理由）

### 4.4 常用 CSS 骨架（改数不改结构）

```css
:root{
  /* 2026-10-29 换肤 A「青柠氧气」：主色薄荷绿；brand-* 是历史名别名 */
  --primary:#1FBF8F; --primary-dark:#12A276; --primary-light:#E6F8F1;
  --accent:#0E9B72;                       /* 数值强调（深绿） */
  --brand-yellow:var(--primary); --brand-yellow-dark:var(--primary-dark); --brand-orange:var(--accent);
  --success:#16A34A; --warning:#F0A22E; --danger:#EF4444;   /* warning 是暖橙，别写成 brand-orange */
  --text-title:#1B2A25; --text-main:#2C3A34; --text-sub:#5D716A; --text-muted:#95A7A1;
  --border-color:#E3EFE9; --divider-color:#E2EBE7;
  --bg-fill-weak:#F2F8F5; --bg-fill-chip:#EFF9F5; --bg-card:#FFFFFF; --nav-solid:#E9F4EF;
  --rd-card:28px; --rd-tile:26px; --rd-button:44px;
  --shadow-card:0 10px 26px rgba(21,66,53,.06); --glow-primary:0 0 20px rgba(31,191,143,.14);
}
.phone{width:750px;border:1px solid #E3EFE9;border-radius:44px;overflow:hidden;
  box-shadow:0 18px 48px rgba(21,66,53,.16);
  background:radial-gradient(120% 26% at 50% -4%,rgba(31,191,143,.14),transparent 62%),
             linear-gradient(180deg,#F6FBF8 0%,var(--bg-fill-weak) 60%);}
/* 舱卡：静态主色描边 + 白瓷面（流光只给主模块，加 .hud-frame--flow） */
.hud-frame{padding:2px;border-radius:var(--rd-card);box-shadow:var(--shadow-card),var(--glow-primary);
  background:linear-gradient(115deg,rgba(31,191,143,.50) 0%,rgba(31,191,143,.26) 30%,
    rgba(27,42,37,.10) 52%,rgba(31,191,143,.26) 74%,rgba(31,191,143,.50) 100%);}
.hud-frame--flow{background-image:linear-gradient(115deg,
  rgba(31,191,143,.30) 0%,rgba(31,191,143,1) 12%,rgba(31,191,143,.22) 26%,
  rgba(27,42,37,.10) 50%,rgba(31,191,143,.22) 74%,rgba(31,191,143,1) 88%,rgba(31,191,143,.30) 100%);
  background-size:200% 100%;animation:flow 4.5s linear infinite;}
.hud-panel{padding:32px;border-radius:calc(var(--rd-card) - 2px);
  background:radial-gradient(120% 85% at 8% -8%,rgba(31,191,143,.06),transparent 52%),#fff;}
.hud-frame--band{border-radius:20px;box-shadow:none}  .hud-panel--band{border-radius:18px;}
@keyframes flow{0%{background-position:0% 0}100%{background-position:100% 0}}
```

自绘地图（trip-track 同族，**不开 canvas / 不用 SVG**）：画布渐变 + 绝对定位 `.blk` 街区块 + `.avenue` 斜穿宽条 + `.pin`（圆角 `50% 50% 50% 8px` + `rotate(-45deg)`）+ 水印 `.map__wm`。

---

## 五、渲染自检（每次必做，不许只凭肉眼读 HTML）

```bash
mkdir -p /tmp/dp-check
google-chrome --headless=new --no-sandbox --disable-gpu --hide-scrollbars \
  --window-size=1600,6200 \
  --screenshot=/tmp/dp-check/xxx.png \
  "file://$PWD/docs/design/xxx-preview.html"
```

```bash
# PIL 装在 user site：python3 -I 会 import 不到；裁自己的截图用普通 python3（别在下载目录里跑）
python3 - <<'PY'
from PIL import Image
im = Image.open("/tmp/dp-check/xxx.png"); w, h = im.size
for i, top in enumerate(range(0, h, 1400)):
    im.crop((0, top, min(w, 1600), min(h, top + 1400))).save(f"/tmp/dp-check/xxx-{i}.png")
PY
```

**已知坑（全部实际踩过，逐条过一遍）**

1. **`<span>` 是行内元素**：`width/height/display:flex` 不生效 —— 地图针、在线点、发丝线、进度条、`hr` 这类件必须补 `display:block`（预览里的地图针消失就是这条）。
2. **多 / 少一个 `</div>`**：卡片会掉出 flex 行（第二列空着、第三张自动换行）。用脚本数平衡，别看渲染猜：
   `python3 -c "s=open('x.html').read();print(s.count('<div'),s.count('</div>'))"`
3. **两列卡片需要容器宽 ≥ 690×2 + 32**：`.page{max-width:1560px}`，否则永远单列。
4. **浮卡遮挡**：地图水印 `bottom`、空态文案 `padding-bottom` 都要让开顶部/底部浮卡（按浮卡实际高度算，别拍 24）。
5. **表格首列不定宽**：中文按钮名会被拆成一字一行 —— 关键表给 `th` 写 `width`。
6. **结构伪类别用**（`nth-child` / `first-child` / 相邻兄弟）：与小程序端口径一致，分隔线用**显式类**。
7. **绝对定位的悬浮钮组**：位置要按容器高度反算，别和底部浮卡重叠。
8. **大图看不清字**：裁到 1000×1400 再读一次关键区域（按钮、数字、表头）。

---

## 六、收尾

1. `archive/README.md` 的「新稿在哪」表加行（文件名 / 页面 / 状态）；
2. 回复里**单独点出稿里替用户做的产品判断**（如「入口只在 `home_status=1` 出」），方便拍板；
3. 涉及新的路径或口径（归档位置、命名约定、判档规则）→ 写/更新长期记忆；
4. 相关稿互相引用（入口稿 ↔ 目标页稿），并在目标页稿里同步「入口从哪来」；
5. 输入来自后端 design-brief 时，把稿头的「待后端确认」写回后端
   `后端仓/.claude/project-meta/versions/vN/open-questions.md` 的「待确认」区（编号自定）；
   路径写法同上节的 WSL / Windows 表，别混用。本仓不建第二份 Q 表（拍板真相源只放后端那一份）。

---

## 硬性禁令

- ❌ **出完稿顺手改业务代码**。稿是稿；要写代码另起批次，走 `project-dev` / `rule-add-page`。
- ❌ **把「待后端」的假设当结论**。无契约时必须写「本页当前无契约」+ 待确认表，字段名标「示意名」。
- ❌ **把 brief 当契约**。brief 标「无契约 / 示意名」的字段，稿里照标示意名，稿头照写「本页当前无契约」。
- ❌ **拿参考图的数字/文案当契约**。参考图只决定版式与信息架构。
- ❌ **缺值印 0**。没数据一律 `--`；`0` 必须是真的 0（离线车速、算不出的费用都是反例）。
- ❌ **用 canvas / SVG 画图**（项目三端口径不一）。自绘走 `div` + `clip-path` + `conic-gradient`。
- ❌ **在稿里发明 `app-*` 组件名**。只能写已存在的（见 `rule-ui-components`）。
- ❌ **用结构伪类做分隔线 / 去线 / 首项特判**。显式类。
- ❌ **`git add docs/`**、把 `docs/` 的未跟踪状态当漂移、或重写 `.claude/` 里历史文档的旧路径。
- ❌ **只画手机框不做状态**。每份稿至少三档：正常 / 空或离线 / 未绑或不可评估。

## 交付清单（逐条打勾）

- [ ] 旧稿已移入 `archive/`，相对资源路径已修并校验通过
- [ ] `archive/README.md` 有映射说明 + 新稿表
- [ ] 稿头注释：来源日期 / 角色 / 入口出口 / 有无契约 / 与参考图的差异
- [ ] 手机框 1:1（750 宽），`.hud-frame` 参数正确（外 44 / 内 42）
- [ ] token 表逐件，数值取自既有尺度、不自造
- [ ] 状态档 ≥ 3，缺值统一 `--`
- [ ] 出口表写清落点、门槛、频控与「不自动重试」
- [ ] 无契约稿有 Q 表（每条写为什么必须先答）
- [ ] headless Chrome 渲染 + 分段裁剪，逐段看过并修完
- [ ] 回复里点明替用户做的判断与未决项