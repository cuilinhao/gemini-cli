#!/usr/bin/env node

/**
 * Gemini API 连接测试脚本
 * 用于验证 API 密钥是否正确配置
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGeminiConnection() {
  console.log('🔧 开始测试 Gemini API 连接...\n');
  
  // 从环境变量或命令行参数获取 API 密钥
  const apiKey = process.env.GOOGLE_API_KEY || process.argv[2];
  
  if (!apiKey) {
    console.error('❌ 错误: 未提供 API 密钥');
    console.log('使用方法:');
    console.log('  node test-gemini-connection.js YOUR_API_KEY');
    console.log('  或设置环境变量 GOOGLE_API_KEY');
    process.exit(1);
  }
  
  console.log(`🔑 使用 API 密钥: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 8)}`);
  console.log('🌐 测试连接到 Gemini API...\n');
  
  try {
    // 创建 Gemini 客户端
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    // 发送测试请求
    const result = await model.generateContent('请回复"连接测试成功"');
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ 连接测试成功!');
    console.log('📋 API 响应:');
    console.log(`   "${text}"`);
    console.log(`\n🎯 模型: gemini-1.5-flash`);
    console.log(`⏰ 时间: ${new Date().toLocaleString()}`);
    
    // 测试其他模型
    console.log('\n🔍 测试其他模型...');
    try {
      const proModel = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
      const proResult = await proModel.generateContent('ping');
      const proResponse = await proResult.response;
      console.log('✅ gemini-1.5-pro 模型可用');
    } catch (error) {
      console.log('⚠️  gemini-1.5-pro 模型测试失败:', error.message);
    }
    
    console.log('\n🎉 所有测试完成！你的 API 密钥配置正确。');
    
  } catch (error) {
    console.error('❌ 连接测试失败!');
    console.error('📋 错误详情:', error.message);
    
    // 详细的错误分析
    if (error.message.includes('403') || error.message.includes('PERMISSION_DENIED')) {
      console.error('\n🔐 权限错误 - 403 PERMISSION_DENIED');
      
      if (error.message.includes('SERVICE_DISABLED')) {
        console.error('📋 问题: Generative Language API 未启用');
        console.error('💡 解决方案:');
        console.error('   1. 访问 Google Cloud Console');
        console.error('   2. 进入 API 库页面');
        console.error('   3. 搜索并启用 "Generative Language API"');
        console.error('   4. 等待 2-5 分钟生效');
        console.error('   5. 重新运行此测试');
        console.error('🔗 链接: https://console.developers.google.com/apis/api/generativelanguage.googleapis.com/overview');
      } else if (error.message.includes('API_KEY_INVALID')) {
        console.error('🔑 问题: API 密钥无效');
        console.error('💡 解决方案:');
        console.error('   1. 检查 API 密钥是否完整');
        console.error('   2. 确认密钥没有多余的空格');
        console.error('   3. 验证密钥是否有效且未过期');
      } else if (error.message.includes('RATE_LIMIT_EXCEEDED')) {
        console.error('⚡ 问题: API 配额已用完');
        console.error('💡 解决方案:');
        console.error('   1. 检查配额使用情况');
        console.error('   2. 等待配额重置');
        console.error('   3. 考虑升级到付费计划');
      }
    } else if (error.message.includes('400') || error.message.includes('INVALID_ARGUMENT')) {
      console.error('❌ 请求参数错误');
    } else if (error.message.includes('401') || error.message.includes('UNAUTHENTICATED')) {
      console.error('🔐 身份验证失败');
    } else if (error.message.includes('429')) {
      console.error('⚡ API 调用频率过高');
    } else if (error.message.includes('500') || error.message.includes('INTERNAL_ERROR')) {
      console.error('🔥 Google 服务器内部错误');
    } else if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
      console.error('🌐 网络连接问题');
      console.error('💡 解决方案:');
      console.error('   1. 检查互联网连接');
      console.error('   2. 确认防火墙设置');
      console.error('   3. 检查代理配置');
      console.error('   4. 尝试使用 VPN');
    }
    
    process.exit(1);
  }
}

// 运行测试
testGeminiConnection().catch(console.error);