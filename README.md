# 迪拜私立学校选校助手

基于 [KHDA 教育目录](https://web.khda.gov.ae/en/Education-Directory/schools)（实时校名/评级/详情页）与 [开放数据](https://web.khda.gov.ae/KHDA/media/KHDA/DubaiPrivateSchoolsOpenData.xlsx)（学费与在校生）的离线选校工具，支持筛选、排序、对比与家长 FAQ。每所学校可跳转 KHDA 官网详情页。

**在线访问：** https://abudhabi-realestate.github.io/dubai-school-picker/

## 本地使用

双击 `迪拜选校助手.html`，或用浏览器打开 `index.html` 即可，无需安装、可离线使用。

## 更新数据后重新生成

```bash
npm install                # 首次运行，安装 xlsx 依赖
node extract-schools.mjs   # 从 KHDA xlsx 提取 schools-data.json
node build-html.mjs        # 生成 迪拜选校助手.html 与 index.html
```

## GitHub Pages 部署

1. 在 GitHub 新建仓库（例如 `dubai-school-picker`）
2. 上传本目录文件（至少包含 `index.html`）
3. 仓库 **Settings → Pages → Build and deployment**
   - Source：**Deploy from a branch**
   - Branch：`main`，文件夹 **`/ (root)`**
4. 保存后等待 1～2 分钟，访问 `https://abudhabi-realestate.github.io/<仓库名>/`

## 数据来源

- 学校目录（名单、评级、KHDA 链接）：https://web.khda.gov.ae/en/Education-Directory/schools
- 开放数据（学费、在校生、坐标）：https://web.khda.gov.ae/KHDA/media/KHDA/DubaiPrivateSchoolsOpenData.xlsx
- 家长 FAQ：https://web.khda.gov.ae/en/Guides/Parents/Common-Question-For-Parents/Common-Questions-for-Parents

入学决策请以 KHDA 官网最新信息为准。
