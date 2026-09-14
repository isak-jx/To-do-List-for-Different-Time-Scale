# FocusFlow Google Calendar 侧栏插件

这是基于现有 FocusFlow 数据结构实现的 Apps Script Google Workspace add-on，面向电脑网页版 Google Calendar 的个人使用。代码和离线测试已完成；2026-09-14 已在个人 Google 账号完成测试安装、授权，验证侧栏主页、时区、每周任务、独立长期列表及复盘页面。真实日历事件写入和旧数据迁移尚未验收。不是已上架的 Marketplace 插件。

## 使用方式

- **当天 / 本周**：查看指定日期，添加任务、编辑说明、完成勾选、添加和勾选子任务。当天新建任务会自动建立当周对应项；周任务可以加入同一周的某天。内容及完成状态在关联的日／周任务间共享，延续原 app 行为。
- **复制到下周**：创建独立周任务，整体完成状态重置，子任务状态保留，符合原 app 行为。不会复制日关联或日历时段。
- **长期列表**：独立清单，支持创建、改名、添加事项、编辑、勾选、完成比例及归档。与日／周任务、日历完全无关联。原有列表起止日期会随数据导入和导出保留。
- **工作时段**：在当天任务中填写日期、起止时间、时区，创建到专用的 FocusFlow 日历。默认提前 10 分钟弹出提醒；通知能否显示取决于 Google Calendar 和设备通知设置。
- **复盘 / 日志**：保存每日总结、0.5–5 分评分、每周总结；新增带时间的日志，可使用导入的标签。
- **归档**：任务与列表可以恢复。归档单个日任务不会归档周任务；归档长期列表隐藏列表，不改动其中的完成状态。

## 数据与同步边界

1. 原 app 使用当前网站域名下的浏览器 localStorage。插件不能直接读取它；需要一次性导出、导入。原网站与插件**不进行双向同步**。
2. 插件数据存放在当前 Google 用户的 Drive `appDataFolder`，只有此应用可访问，不出现在普通 Drive 文件列表。账号之间隔离；不同 Apps Script / Cloud 项目不自动共用这些数据。
3. Calendar 是工作时段的真实来源。创建后在 Calendar 中改时间或删除；侧栏“查看日历中的实际时间”会重新读取。时间段移动不改变任务所属日期、周归属或完成状态。任务改名不自动修改已经创建的事件标题。
4. 每个当天任务、每个工作日期最多由插件创建一个时段。重复点击及请求失败后的重试不会覆盖现有时段。需要同日第二个时段时，在 Calendar 内手动建立。已删除时段请在 Calendar 恢复或手动新建。
5. 完成／归档任务不会删除日历事件；长期列表永远不会产生事件。
6. 没有 Gmail、Google Tasks 或个人主日历访问。课程和会议直接在 Calendar 主界面查看；插件不读取空闲时间、不自动避让会议。
7. 使用用户级写锁和版本号，旧页面提交会提示刷新，避免覆盖另一窗口保存的数据。保存失败不会把空状态覆盖到云端。
8. 第一版上限为 5000 个任务、1000 个列表、单任务 100 个子任务、整体 JSON 100 万字符。列表按 12 项分页；日历时段读取最多 25 项。大数据 JSON 在侧栏的复制粘贴仍需真实宿主验收。
9. 日志第一版支持查看和新增；导入的标签与历史日志完整保留，暂未提供标签管理、历史日志编辑／删除、列表日期编辑或子任务重命名／删除。

## 安装（你自己的 Google 账号）

无需部署 Vercel，也无需建立公共网页接口。推荐先用你自己的个人 Google 账号测试；学校账号可能受管理员限制。

1. 打开 [Google Apps Script](https://script.google.com/home)，新建项目，命名 `FocusFlow Calendar`。
2. 将 `Core.js`、`Google.js`、`Cards.js` 分别复制到项目的三个脚本文件（编辑器显示 `.gs` 后缀正常）。也可将三个文件按上述顺序拼接，全部放进 `Code.gs`。
3. 项目设置中启用“在编辑器中显示 appsscript.json”，用本目录的 `appsscript.json` 替换其内容并保存。
4. 清单已声明 **Google Calendar API v3** 和 **Google Drive API v3**，确认编辑器左侧“服务”中显示 Calendar、Drive；缺少时通过 **服务 +** 添加。使用默认 Cloud 项目时，通过此入口启用相应服务；如果使用自选标准 Cloud 项目，还需在该项目的 Cloud Console 中确认两个 API 已启用。
5. 选择 **部署 → 测试部署 → 安装**，按 Google 页面提示完成个人授权。只安装给自己，无需发布到 Marketplace。学校账号出现管理员阻止时不要更换安全设置，应使用获准账号或联系管理员。
6. 打开或刷新 [Google Calendar](https://calendar.google.com/)，展开右侧栏，点击 FocusFlow。图标当前使用 Google Tasks 图标作为开发期占位，名称是 FocusFlow。
7. 首次打开应显示空任务页；此时先导入旧数据，再开始使用。第一次点击“安排到 Google Calendar”会创建独立的 `FocusFlow` 日历。若主界面未显示，刷新并在左侧勾选该日历。

此项目没有 `.clasp.json` 或 OAuth 凭据。高级用户可使用 clasp 上传，但应将自己的项目 ID 和凭据保留在本地，不提交到仓库。

### 权限用途

| 权限 | 用途 |
| --- | --- |
| `drive.appdata` | 保存、读取当前用户的插件专用数据和导入预览文件 |
| `calendar.addons.execute` | 在 Google Calendar 侧栏运行插件 |
| `calendar.app.created` | 创建并管理由此应用创建的 FocusFlow 日历及事件 |
| `script.external_request` | 从 Apps Script 调用 Google Drive / Calendar REST API；代码仅访问 `www.googleapis.com` |
| `script.locale` | 获取 Calendar 提供的用户时区，避免固定使用服务器时区 |

请在 Google 自己的授权页面核对并授权；不需要把密码、验证码或访问令牌发给开发者。卸载应用／清理应用数据前先导出备份，Google Drive 应用专用数据可能被一并删除。

## 从当前网站迁移

**方式 A：更新网页后使用导出按钮。** 本分支给原 app 顶栏添加了 `Export Backup`。该改动部署到原网站后，在保存着原数据的同一浏览器、同一域名打开页面，点击导出。Vercel 的另一个预览域名看不到原域名的 localStorage。

**方式 B：无需部署的导出书签。** 打开发行包中的 `export-bookmark.html`，将“导出 FocusFlow 数据”链接拖到浏览器书签栏。回到原 FocusFlow 网站，点击书签，下载 JSON。此脚本只读取原域名下六个已知的 FocusFlow 键，不发送网络请求，不修改原数据。仓库中的 `make-export-bookmark.cjs` 可重新生成该 HTML。

在插件中打开“数据 / 归档 → 导入旧数据”，将 JSON 全文粘贴，点击“检查并预览”，核对数量后确认。**合并到已有插件**，保留现有内容；相同 ID 或同日复盘存在不同内容时停止，不覆盖。导入前自动保存插件备份；也不会把旧日程自动写入 Calendar。取消预览不会更改正式数据。预览文件会保留在应用专用空间作为原始导入副本。

导入验证保留原任务 ID、日／周关联、独立长期清单、评分、总结、日志和标签；长期任务的日／周关联会被清空。遇到旧版无日期周任务、重复 ID 或损坏关联会拒绝导入，而不是猜测并覆盖。

## 本地验证

```sh
npm run test:addon
npm run lint
npm run build
```

插件测试使用 Node 自带测试运行器，模拟 CardService、Drive 和 Calendar；不调用真实 Google 账号，不需要安装依赖。覆盖周边界、日／周共享状态、长期列表隔离、非法数据、版本冲突、导入往返、重复日历写入及存储失败后的重试。它们不能替代真实 Apps Script 部署测试。

### Google 内进一步验收清单

- 安装、授权后主页与导航正常显示，刷新后数据还在。
- 新建一个周任务及子任务，加入当天，勾选后日／周状态一致。
- 新建长期列表、添加事项并勾选；日／周页面没有额外任务，日历没有额外事件。
- 排一个工作时段；连点不重复；在 Calendar 拖动后，侧栏读取到新时间。
- 分别测试当地时区和另一个时区；夏令时不存在／重复的墙上时间应提示直接在 Calendar 操作。
- 保存评分、每日总结、周总结和日志，刷新后仍存在。
- 从原域名导出真实 JSON，核对导入预览数量；导入后逐项抽查，原网页数据不变。
- 导出插件 JSON 并在本地妥善保存。

## 官方依据

- [Calendar 插件界面](https://developers.google.com/workspace/add-ons/calendar/building-calendar-interfaces)
- [个人测试安装](https://developers.google.com/workspace/add-ons/how-tos/testing-workspace-addons)
- [Drive 应用专用存储](https://developers.google.com/workspace/drive/api/guides/appdata)
- [日历创建权限](https://developers.google.com/workspace/calendar/api/v3/reference/calendars/insert)
- [事件创建权限与 ID](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert)
- [用户时区](https://developers.google.com/workspace/add-ons/guides/access-user-locale-timezone)

### 页面响应
页面导航使用当前用户的 30 秒分块缓存，减少重复 Drive 读取；刷新强制读取 Drive，保存始终读取最新版本并检查冲突。导航不再标记数据变更。每次点击仍需 Apps Script 服务器往返，不能达到本地网页的即时响应。
