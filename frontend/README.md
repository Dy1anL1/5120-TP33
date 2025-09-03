# Silver Spoon Society 前端

这是 Silver Spoon Society 网站的前端部分，专为健康衰老和营养管理设计，采用现代响应式布局和交互。

## 主要功能

- 首页、菜谱搜索、每日推荐、营养仪表盘、购物清单等页面
- 响应式设计，支持桌面、平板、移动端
- 动态渲染菜谱卡片，支持弹窗查看详情和营养信息
- 营养仪表盘可自动统计每日营养摄入
- 支持本地存储（localStorage）记录用户菜单

## 文件结构

```
frontend/
├── index.html                  # CTA页
├── home.html                   # 首页
├── explore-recipes.html        # 菜谱搜索页
├── daily-recommendations.html  # 每日推荐
├── nutrition-dashboard.html    # 营养数据表
├── shopping-list.html          # 购物清单
├── styles.css                  # 全站样式
├── script.js                   # 主 JS 逻辑（动态渲染、API 调用、仪表盘等）
├── assets/                     # 图片和静态资源
└── README.md                   # 前端说明文档
```

## 使用方法

1. 直接打开 `index.html` 或其他页面即可浏览（推荐本地服务器）
2. 推荐用 Python/Node.js 本地服务器：
    ```bash
    python3 -m http.server 8000
    # 或
    npx serve .
    ```
3. 在线部署：支持 GitHub Pages、Netlify、Vercel 等静态托管

## 技术栈

- HTML5 / CSS3 / JavaScript (ES6+)
- Font Awesome 图标库
- 响应式设计（Flexbox、Grid、媒体查询）
- 动态 API 调用（与后端 Serverless API 对接）

## 自定义与扩展

- 可在 `styles.css` 修改主题色和样式
- 可在 `script.js` 增加新功能或对接更多 API
- 页面内容和结构可自由调整

## 许可证

MIT License，欢迎自由使用和修改。

---
如有问题请联系项目维护者。
