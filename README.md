# Gemini CLI - AI Programming Assistant

🚀 **Gemini CLI** 是一个基于 Next.js 15 的现代 AI 编程助手 Web 应用程序，提供类似 VSCode/Cursor 的三栏式界面，集成 Google Gemini API 提供强大的 AI 辅助编程功能。

## ✨ 主要特性

### 🎯 核心功能
- **AI 编程助手** - 基于 Google Gemini 1.5 Pro/Flash 模型
- **三栏式界面** - 专业的 IDE 风格布局 (侧边栏 + 代码编辑器 + 聊天面板)
- **试用模式** - 无需登录即可体验，每日 1000 tokens 限制
- **实时流式响应** - 流畅的 AI 对话体验
- **文件管理** - 完整的文件树和上传功能
- **PDF 文档分析** - 支持 PDF 文件解析和内容分析

### 🛠️ 技术功能
- **脚本生成** - 使用 `/script` 命令生成 bash 脚本
- **代码分析** - 智能代码审查和优化建议
- **错误诊断** - 详细的错误解释和解决方案
- **多语言支持** - 支持多种编程语言的语法高亮
- **使用统计** - 详细的 token 使用和成本控制
- **响应式设计** - 完美适配移动端和桌面端

### 🔐 安全特性
- **API 密钥加密** - AES-256 加密存储用户 API 密钥
- **行级安全** - Supabase RLS 策略保护数据安全
- **OAuth 认证** - 支持 Google/GitHub 第三方登录
- **速率限制** - 内置 API 调用频率控制

## 🏗️ 技术架构

### 前端技术栈
- **Next.js 15** - React 全栈框架 (App Router)
- **TypeScript** - 类型安全的 JavaScript
- **Tailwind CSS** - 现代化 CSS 框架
- **shadcn/ui** - 高质量 UI 组件库
- **Monaco Editor** - VSCode 同款代码编辑器
- **Lucide Icons** - 精美的图标库

### 后端技术栈
- **Supabase** - 开源的 Firebase 替代方案
- **PostgreSQL** - 强大的关系型数据库
- **Supabase Auth** - 完整的认证解决方案
- **Row Level Security** - 数据行级安全策略

### AI 集成
- **Google Gemini API** - 先进的生成式 AI 模型
- **实时流式传输** - Server-Sent Events (SSE)
- **多模型支持** - Gemini 1.5 Pro/Flash 模型切换

## 🚀 快速开始

### 环境要求
- Node.js 18.0+
- npm 或 pnpm 包管理器
- Supabase 账户
- Google API 密钥 (可选)

### 1. 克隆项目
```bash
git clone <repository-url>
cd gemini-cli
```

### 2. 安装依赖
```bash
npm install
# 或
pnpm install
```

### 3. 配置环境变量
复制 `.env.local` 并填写必要的配置：

```env
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 试用模式 API 密钥
GEMINI_TRIAL_API_KEY=your_google_api_key

# 数据加密密钥 (32位字符串)
ENCRYPTION_KEY=your_32_character_encryption_key
```

### 4. 设置 Supabase 数据库
1. 在 Supabase 控制台创建新项目
2. 执行 `supabase/migrations.sql` 中的 SQL 脚本
3. 配置 OAuth 提供商 (Google/GitHub)

### 5. 启动开发服务器
```bash
npm run dev
# 或
pnpm dev
```

访问 `http://localhost:3000` 开始使用。

## 📁 项目结构

```
gemini-cli/
├── src/
│   ├── app/                 # Next.js 应用路由
│   │   ├── [locale]/       # 国际化路由
│   │   │   ├── app/        # 主应用页面
│   │   │   ├── auth/       # 认证相关页面
│   │   │   └── settings/   # 设置页面
│   │   └── api/            # API 路由
│   │       ├── chat/       # 聊天 API
│   │       └── files/      # 文件 API
│   ├── components/         # React 组件
│   │   ├── ui/            # 基础 UI 组件
│   │   ├── chat/          # 聊天组件
│   │   ├── editor/        # 代码编辑器组件
│   │   └── file-tree/     # 文件树组件
│   ├── services/          # 业务逻辑服务
│   │   ├── gemini.ts      # Gemini API 服务
│   │   ├── supabase-*.ts  # Supabase 相关服务
│   │   └── trial-mode.ts  # 试用模式服务
│   ├── models/            # 数据模型
│   ├── lib/               # 工具库
│   └── auth/              # 认证配置
├── supabase/
│   └── migrations.sql     # 数据库迁移脚本
├── public/                # 静态资源
└── docs/                  # 文档
```

## 🎨 界面设计

### 三栏式布局
- **侧边栏** (260px): 文件树、聊天历史、设置
- **编辑器面板** (自动): Monaco 代码编辑器、文件预览
- **聊天面板** (340px): AI 对话界面、实时响应

### 响应式设计
- **桌面端**: 完整三栏布局
- **平板端**: 可折叠侧边栏
- **移动端**: 单栏显示，支持切换

## 🔧 核心功能

### 1. AI 聊天功能
- 支持多种 AI 模型 (Gemini 1.5 Pro/Flash)
- 实时流式响应
- 上下文对话记忆
- 代码语法高亮

### 2. 脚本生成
使用 `/script` 命令快速生成 bash 脚本：
```
/script 创建一个文件备份脚本
```

### 3. 代码分析
- 智能代码审查
- 性能优化建议
- 安全漏洞检测
- 最佳实践推荐

### 4. 文件管理
- 文件树可视化
- 文件上传和下载
- PDF 文档解析
- 代码文件预览

### 5. 使用统计
- 实时 token 使用监控
- 成本估算和控制
- 使用历史记录
- 预算限制和警报

## 🛡️ 安全特性

### 数据安全
- 所有用户数据通过 Supabase RLS 策略保护
- API 密钥使用 AES-256 加密存储
- 敏感信息不会记录在日志中
- 严格的数据访问控制

### 认证和授权
- OAuth 2.0 集成 (Google/GitHub)
- 基于会话的权限控制
- 试用模式功能限制
- API 速率限制防止滥用

## 🚀 部署指南

### Vercel 部署
1. 连接 GitHub 仓库到 Vercel
2. 配置环境变量
3. 自动部署

### 自托管部署
```bash
# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

### Docker 部署
```bash
# 构建镜像
docker build -t gemini-cli .

# 运行容器
docker run -p 3000:3000 --env-file .env.local gemini-cli
```

## 🧪 开发指南

### 本地开发
```bash
# 启动开发服务器
npm run dev

# 类型检查
npm run type-check

# 代码格式化
npm run format

# 构建项目
npm run build
```

### 代码规范
- 使用 TypeScript 进行类型安全
- 遵循 ESLint 和 Prettier 规范
- 组件采用函数式编程风格
- 使用 Tailwind CSS 进行样式管理

## 📊 性能优化

- **服务端渲染** - Next.js 15 App Router
- **代码分割** - 按需加载组件
- **图片优化** - Next.js Image 组件
- **缓存策略** - 智能缓存机制
- **CDN 优化** - 静态资源加速

## 🔍 API 文档

### 聊天 API
```typescript
POST /api/chat/stream
{
  "message": "您的问题",
  "model": "gemini-1.5-pro",
  "isTrialMode": false
}
```

### 文件 API
```typescript
POST /api/files/upload
Content-Type: multipart/form-data
```

## 🛠️ 配置选项

### 环境变量
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase 项目 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase 匿名密钥
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase 服务角色密钥
- `GEMINI_TRIAL_API_KEY` - Google API 密钥
- `ENCRYPTION_KEY` - 数据加密密钥

### 自定义主题
在 `src/app/theme.css` 中自定义颜色和样式。

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 🐛 问题报告

如果你发现 bug 或有功能建议，请在 GitHub Issues 中提交。

## 📝 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。

## 🆘 支持

如果你在使用过程中遇到问题：

1. 查看项目文档
2. 在 GitHub Issues 中提问
3. 查看常见问题解答

## 🎯 路线图

- [ ] 支持更多 AI 模型 (Claude, GPT-4)
- [ ] 实时协作编辑
- [ ] 插件系统
- [ ] 桌面端应用
- [ ] 移动端优化
- [ ] 企业级功能
- [ ] 多语言界面
- [ ] 主题定制

## 🙏 致谢

感谢以下开源项目的支持：
- [Next.js](https://nextjs.org/) - React 全栈框架
- [Supabase](https://supabase.com/) - 开源后端服务
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - 代码编辑器
- [Google Gemini API](https://ai.google.dev/) - AI 模型
- [shadcn/ui](https://ui.shadcn.com/) - UI 组件库

## 📈 统计数据

- **代码行数**: 10,000+ 行
- **组件数量**: 50+ 个
- **API 端点**: 20+ 个
- **支持语言**: 多种编程语言
- **浏览器兼容**: 现代浏览器

---

**Made with ❤️ by the Gemini CLI Team**

如果这个项目对你有帮助，请给我们一个 ⭐️ Star！
