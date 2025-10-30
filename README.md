# PDF 文本提取服务

一个基于 Node.js 和 PDF.js 的 PDF 文本提取工具，支持文本整合、发票信息提取等功能。

## 功能特性

- **PDF 文本提取**：使用 pdf.js-extract 提取 PDF 中的文本内容
- **文本智能整合**：对提取的文本进行智能整合处理，提高可读性
- **发票信息提取**：从 PDF 发票中提取结构化信息（发票号码、开票日期、金额等）
- **可视化预览**：前端页面提供 PDF 预览和文本内容展示
- **文件上传**：支持拖拽上传和文件选择上传 PDF 文件
- **Canvas 渲染**：在 Canvas 上按坐标渲染 PDF 文本内容

## 技术栈

- **后端**：Node.js + Express v5.1.0
- **前端**：原生 HTML + CSS + JavaScript
- **PDF 处理**：
  - pdf.js-extract v0.2.1（文本提取）
  - pdfkit v0.17.2（PDF 生成）
- **文件上传**：multer v2.0.2
- **跨域支持**：cors v2.8.5
- **开发工具**：nodemon v3.1.10（热重载）

## 项目结构

```
.
├── frontend/                  # 前端界面
│   ├── css/style.css          # 样式文件
│   ├── js/main.js             # 前端交互逻辑
│   └── index.html             # 主页面
├── uploads/                   # 上传文件存储目录（运行时创建）
├── create-invoice-pdf.js      # 发票 PDF 生成示例
├── create-test-pdf.js         # 测试 PDF 生成示例
├── pdf-extract-util.js        # PDF 文本提取工具模块
├── text-integration.js        # 文本整合处理模块
├── server.js                  # Express 服务主文件
├── package.json               # 项目依赖和脚本配置
└── README.md                  # 项目说明文档
```

## 安装与运行

### 环境要求

- Node.js >= 16.x
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 启动服务

```bash
# 开发模式（带热重载）
npm run dev

# 生产模式
npm start
```

启动后访问：http://localhost:3000

## 使用说明

1. **上传 PDF 文件**：
   - 点击"选择文件"按钮或拖拽 PDF 文件到上传区域
   - 上传的文件将保存在 `uploads/` 目录中

2. **PDF 预览**：
   - 上传成功后，可以在预览区域查看 PDF 内容

3. **文本解析**：
   - 点击"解析 PDF 内容"按钮提取原始文本
   - 点击"显示整合的文本"按钮提取并整合文本
   - 点击"提取发票信息"按钮提取发票结构化信息

4. **生成测试文件**：
   ```bash
   # 生成测试 PDF
   node create-test-pdf.js
   
   # 生成发票测试 PDF
   node create-invoice-pdf.js
   ```

## 文本整合功能

文本整合模块通过多轮处理优化文本提取结果：

1. **横向文本合并**：将同一行中相邻的文本片段合并
2. **纵向文本合并**：将同一列中连续的单字符合并
3. **多次优化处理**：通过多轮处理提高整合准确性

## 发票信息提取

支持从发票 PDF 中提取以下信息：
- 发票号码
- 开票日期
- 不含税金额
- 税额
- 含税金额

## API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/pdf-files` | GET | 获取上传目录中的所有 PDF 文件 |
| `/api/upload` | POST | 上传 PDF 文件 |
| `/api/parse-pdf` | POST | 解析 PDF 文件（原始文本）|
| `/api/parse-pdf-integrated` | POST | 解析 PDF 文件（整合文本）|
| `/api/extract-invoice-info` | POST | 提取发票信息 |

## 注意事项

1. 项目默认运行在 3000 端口
2. 上传的文件保存在 `uploads/` 目录中
3. 中文文本提取效果取决于原始 PDF 的编码和字体嵌入情况
4. 项目适用于内网或受信环境，暂无身份验证机制

## 已知限制

- 不适合大文件批量处理（因内存中处理 PDF）
- Express 5 仍为实验版本，可能存在稳定性问题
- `pdf.js-extract` 维护状态较旧（v0.2.1 发布于 2018 年）
- 中文文本提取可能出现乱码或缺失（取决于原始 PDF）

## 开发建议

1. 添加日志记录功能（如 winston）
2. 增加错误处理中间件
3. 配置文件上传大小限制
4. 添加单元测试和集成测试
5. 实现用户身份验证机制
