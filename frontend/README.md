# Silver Spoon Society 网站

这是一个响应式的营养健康网站，专为健康衰老而设计。网站采用现代化的设计风格，完全响应式，可以在各种设备上完美显示。

## 功能特点

### 🎨 设计特色
- 清新现代的绿色主题设计
- 响应式布局，支持所有设备尺寸
- 平滑的动画效果和过渡
- 专业的图标和字体设计

### 📱 响应式设计
- 桌面端：完整导航栏和横向布局
- 平板端：优化的中等屏幕布局
- 移动端：汉堡菜单和垂直布局
- 触摸设备优化

### 🚀 交互功能
- 移动端汉堡菜单
- 按钮点击动画效果
- 卡片悬停效果
- 平滑滚动导航
- 键盘导航支持

## 文件结构

```
silver-spoon-website/
├── index.html          # 主页面HTML
├── styles.css          # 样式文件
├── script.js           # JavaScript功能
└── README.md           # 说明文档
```

## 使用方法

### 1. 直接打开
在浏览器中直接打开 `index.html` 文件即可查看网站。

### 2. 本地服务器（推荐）
为了获得最佳体验，建议使用本地服务器：

```bash
# 使用Python 3
python3 -m http.server 8000

# 使用Node.js
npx serve .

# 使用PHP
php -S localhost:8000
```

然后在浏览器中访问 `http://localhost:8000`

### 3. 在线部署
可以将文件上传到任何支持静态网站的托管服务，如：
- GitHub Pages
- Netlify
- Vercel
- 阿里云OSS
- 腾讯云COS

## 技术栈

- **HTML5**: 语义化标签和现代HTML特性
- **CSS3**: Flexbox、Grid、动画、媒体查询
- **JavaScript ES6+**: 现代JavaScript语法和API
- **Font Awesome**: 图标库
- **响应式设计**: 移动优先的设计理念

## 浏览器兼容性

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+
- 移动端浏览器

## 自定义修改

### 颜色主题
在 `styles.css` 中修改CSS变量：
```css
:root {
    --primary-color: #4CAF50;    /* 主色调 */
    --secondary-color: #666;     /* 次要色调 */
    --background-color: #ffffff; /* 背景色 */
}
```

### 内容修改
- 在 `index.html` 中修改文字内容
- 在 `styles.css` 中调整样式
- 在 `script.js` 中添加新功能

## 性能优化

- 使用CDN加载Font Awesome图标
- CSS和JavaScript文件分离
- 响应式图片和图标
- 平滑的CSS动画

## 许可证

本项目采用MIT许可证，可自由使用和修改。

## 联系方式

如有问题或建议，请通过以下方式联系：
- 创建Issue
- 发送邮件
- 提交Pull Request

---

**注意**: 这是一个演示网站，按钮点击后会显示提示信息。在实际使用中，您需要将这些功能连接到真实的后端服务。
