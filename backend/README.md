# Backend

本目录包含 Silver Spoon Society 网站的所有后端服务，包括食谱、食材和营养匹配相关的 Serverless API。

## 目录结构

```
backend/
├── functions/
│   ├── foods-api/              # 食材信息查询 API
│   ├── nutrition-match-api/    # 营养匹配 API（支持单位换算）
│   └── recipes-api/            # 菜谱信息查询 API
├── scripts/                    # 数据批量导入/清理脚本
└── README.md                   # 后端说明文档
```

## 主要功能

- 食材信息查询（foods-api）：支持按名称前缀查找食材，返回营养成分等详细信息。
- 菜谱信息查询（recipes-api）：支持菜谱检索、详情获取。
- 营养匹配（nutrition-match-api）：根据 ingredients 列表自动归一化、单位换算，返回总营养值。
- 数据批量导入/清理脚本：支持批量写入、删除 DynamoDB 数据。

## 技术栈

- Node.js 18+
- AWS Lambda（Serverless）
- DynamoDB（主表 Foods_v2，GSI 索引）
- AWS SDK v3

## 部署方法

1. 安装依赖
	```bash
	cd backend/functions/nutrition-match-api
	npm install --omit=dev --workspaces=false
	```
2. 打包并部署到 AWS Lambda
	```bash
	./deploy.ps1 -deploy
	```
3. 配置环境变量（Lambda 控制台）：
	- TABLE_NAME=Foods_v2
	- GSI_NAME=gsi_name_prefix
	- AWS_REGION=ap-southeast-2

## API 说明

- foods-api：GET /foods?name_prefix=xxx
- recipes-api：GET /recipes?title_prefix=xxx
- nutrition-match-api：POST /match { ingredients: [...] }
  - 支持如 "1 tbsp sugar" 自动单位换算
  - 返回 summary_100g_sum 为总营养值

## 维护建议

- 保持 ingredients 规范与数据库 name_lc 字段一致，提升命中率
- 可定期补充 Foods_v2 表数据，覆盖常见复合食材

---
如有问题请联系项目维护者。
