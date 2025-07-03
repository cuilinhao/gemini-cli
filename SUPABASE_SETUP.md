# Gemini CLI Supabase 配置指南

## 🚀 快速开始

### 1. 创建Supabase项目

1. 访问 [Supabase](https://supabase.com/)
2. 点击 "Start your project"
3. 创建新项目并等待初始化完成

### 2. 执行数据库迁移

1. 在Supabase控制台中，进入 **SQL Editor**
2. 复制 `supabase/migrations.sql` 文件的全部内容
3. 粘贴到SQL编辑器中并点击 **Run** 执行

> ⚠️ **重要**: 请确保按顺序执行SQL文件中的所有语句

### 3. 配置认证提供商

#### Google OAuth 配置
1. 在Supabase控制台进入 **Authentication > Providers**
2. 启用 **Google** 提供商
3. 添加你的Google OAuth凭据:
   - Client ID
   - Client Secret
4. 在重定向URL中添加: `https://your-project.supabase.co/auth/v1/callback`

#### GitHub OAuth 配置
1. 在同一页面启用 **GitHub** 提供商
2. 添加GitHub OAuth凭据
3. 配置重定向URL

### 4. 配置存储桶

1. 进入 **Storage** 面板
2. 创建新bucket: `files`
3. 设置bucket为**公开**（如果需要公开访问文件）
4. 在 **Policies** 标签中添加存储策略:

```sql
-- 用户可以上传自己的文件
CREATE POLICY "Users can upload own files" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 用户可以查看自己的文件
CREATE POLICY "Users can view own files" ON storage.objects
FOR SELECT USING (bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 用户可以删除自己的文件
CREATE POLICY "Users can delete own files" ON storage.objects
FOR DELETE USING (bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### 5. 获取项目凭据

在Supabase控制台的 **Settings > API** 页面获取:

- `NEXT_PUBLIC_SUPABASE_URL`: 你的项目URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: 匿名/公开密钥
- `SUPABASE_SERVICE_ROLE_KEY`: 服务角色密钥（仅在服务端使用）

### 6. 配置环境变量

复制 `.env.example` 到 `.env.local` 并填入你的值:

```bash
# Supabase配置
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google API密钥（试用模式）
GEMINI_TRIAL_API_KEY=your_google_api_key

# 加密密钥（32字符）
ENCRYPTION_KEY=your_32_character_encryption_key

# Auth配置
AUTH_SECRET=your_auth_secret
AUTH_URL=http://localhost:3000/api/auth

# Google OAuth
AUTH_GOOGLE_ID=your_google_client_id
AUTH_GOOGLE_SECRET=your_google_client_secret
NEXT_PUBLIC_AUTH_GOOGLE_ENABLED=true

# GitHub OAuth  
AUTH_GITHUB_ID=your_github_client_id
AUTH_GITHUB_SECRET=your_github_client_secret
NEXT_PUBLIC_AUTH_GITHUB_ENABLED=true
```

## 📋 数据库架构说明

### 核心表结构

1. **profiles** - 用户扩展信息
   - 存储API密钥、成本设置等
   - 与auth.users表关联

2. **chats** - 聊天会话
   - 存储用户的AI对话会话

3. **messages** - 聊天消息
   - 存储具体的对话内容和token使用

4. **usage_stats** - 使用统计
   - 详细记录API使用情况和成本

5. **rate_limits** - 速率限制
   - 控制用户请求频率

### 安全功能

- **行级安全 (RLS)**: 确保用户只能访问自己的数据
- **API密钥加密**: 所有API密钥都使用AES-256加密存储
- **自动触发器**: 自动创建用户profile和更新时间戳

## 🔧 开发和调试

### 查看实时数据
在Supabase控制台的 **Table Editor** 中可以实时查看数据变化

### 监控API调用
在 **API** 面板中可以监控数据库调用情况

### 查看日志
在 **Logs** 面板中可以查看详细的操作日志

## 🚀 生产部署

### 环境变量配置
确保在生产环境中设置所有必要的环境变量

### 数据库备份
Supabase会自动处理备份，但建议定期导出重要数据

### 监控设置
配置Supabase的监控和告警功能

## 💡 常见问题

### Q: 如何重置数据库？
A: 在SQL编辑器中运行DROP和CREATE语句，或者重新创建项目

### Q: 为什么RLS策略不生效？
A: 确保表已启用RLS，并且策略语法正确

### Q: 如何查看用户认证状态？
A: 在Authentication面板中可以查看所有用户

### Q: 存储文件太大怎么办？
A: 检查Storage设置中的文件大小限制

## 📚 相关文档

- [Supabase文档](https://supabase.com/docs)
- [NextAuth.js文档](https://next-auth.js.org/)
- [Google OAuth设置](https://console.developers.google.com/)
- [GitHub OAuth设置](https://github.com/settings/developers)

---

🎉 配置完成后，你的Gemini CLI应用就可以使用Supabase作为后端了！