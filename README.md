# 迪拜私立学校选校助手

基于 [KHDA 官方开放数据](https://web.khda.gov.ae/en/Education-Directory/schools)（2024-25 学年）的离线选校工具，支持筛选、排序、对比与家长 FAQ。

**在线访问**（GitHub Pages 部署后）：`https://<你的用户名>.github.io/<仓库名>/`

## 本地使用

双击 `迪拜选校助手.html`，或用浏览器打开 `index.html` 即可，无需安装、可离线使用。

## 更新数据后重新生成

```bash
node extract-schools.mjs   # 从 KHDA xlsx 提取 schools-data.json
node build-html.mjs        # 生成 迪拜选校助手.html 与 index.html
```

## GitHub Pages 部署

1. 在 GitHub 新建仓库（例如 `dubai-school-picker`）
2. 上传本目录文件（至少包含 `index.html`）
3. 仓库 **Settings → Pages → Build and deployment**
   - Source：**Deploy from a branch**
   - Branch：`main`，文件夹 **`/ (root)`**
4. 保存后等待 1～2 分钟，访问 `https://<用户名>.github.io/<仓库名>/`

## 数据来源

- 学校目录：https://web.khda.gov.ae/en/Education-Directory/schools
- 开放数据：https://web.khda.gov.ae/KHDA/media/KHDA/DubaiPrivateSchoolsOpenData.xlsx
- 家长 FAQ：https://web.khda.gov.ae/en/Guides/Parents/Common-Question-For-Parents/Common-Questions-for-Parents

入学决策请以 KHDA 官网最新信息为准。
