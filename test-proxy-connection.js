#!/usr/bin/env node

/**
 * 代理连接测试脚本
 * 测试代理配置是否正确工作
 */

const { setGlobalDispatcher, ProxyAgent } = require('undici');
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testProxyConnection() {
  console.log('🔧 开始测试代理连接...\n');
  
  // 从环境变量或命令行参数获取配置
  const proxyUrl = process.env.HTTP_PROXY || process.argv[2] || 'http://127.0.0.1:7890';
  const apiKey = process.env.GOOGLE_API_KEY || process.argv[3];
  
  if (!apiKey) {
    console.error('❌ 错误: 未提供 API 密钥');
    console.log('使用方法:');
    console.log('  node test-proxy-connection.js [PROXY_URL] [API_KEY]');
    console.log('  或设置环境变量 HTTP_PROXY 和 GOOGLE_API_KEY');
    console.log('\n示例:');
    console.log('  node test-proxy-connection.js http://127.0.0.1:7890 YOUR_API_KEY');
    process.exit(1);
  }
  
  console.log(`🌐 代理地址: ${proxyUrl}`);
  console.log(`🔑 API 密钥: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 8)}`);
  console.log('');
  
  try {
    // 1. 测试基础网络连接
    console.log('1️⃣ 测试基础网络连接...');
    try {
      const response = await fetch('https://www.google.com');
      if (response.ok) {
        console.log('✅ 基础网络连接正常');
      } else {
        console.log('⚠️  基础网络连接异常，状态码:', response.status);
      }
    } catch (error) {
      console.log('❌ 基础网络连接失败，需要配置代理');
    }
    
    // 2. 配置代理
    console.log('\n2️⃣ 配置全局代理...');
    setGlobalDispatcher(new ProxyAgent(proxyUrl));
    console.log('✅ 代理配置完成');
    
    // 3. 测试代理连接
    console.log('\n3️⃣ 测试代理连接到 Google...');
    try {
      const response = await fetch('https://www.google.com', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Gemini-CLI/1.0)'
        }
      });
      
      if (response.ok) {
        console.log('✅ 代理连接 Google 成功');
      } else {
        console.log('❌ 代理连接 Google 失败，状态码:', response.status);
        throw new Error(`代理连接失败: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ 代理连接测试失败:', error.message);
      console.log('\n💡 可能的解决方案:');
      console.log('   1. 检查代理地址是否正确');
      console.log('   2. 确认代理服务正在运行');
      console.log('   3. 检查防火墙设置');
      console.log('   4. 尝试其他代理端口 (7890, 1080, 8080)');
      throw error;
    }
    
    // 4. 测试 Gemini API 连接
    console.log('\n4️⃣ 测试 Gemini API 连接...');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const result = await model.generateContent('请回复"代理连接测试成功"');
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Gemini API 连接成功!');
    console.log('📋 API 响应:');
    console.log(`   "${text}"`);
    console.log(`\n🎯 模型: gemini-1.5-flash`);
    console.log(`🌐 代理: ${proxyUrl}`);
    console.log(`⏰ 时间: ${new Date().toLocaleString()}`);
    
    // 5. 测试流式连接
    console.log('\n5️⃣ 测试流式 API 连接...');
    try {
      const streamResult = await model.generateContentStream('测试流式连接');
      let streamText = '';
      
      for await (const chunk of streamResult.stream) {
        const chunkText = chunk.text();
        streamText += chunkText;
      }
      
      console.log('✅ 流式 API 连接成功!');
      console.log('📋 流式响应:', streamText ? '有内容' : '空响应');
    } catch (error) {
      console.log('⚠️  流式 API 连接失败:', error.message);
    }
    
    console.log('\n🎉 所有代理连接测试完成！');
    console.log('💡 你可以在项目中设置以下环境变量:');
    console.log(`   HTTP_PROXY=${proxyUrl}`);
    console.log(`   HTTPS_PROXY=${proxyUrl}`);
    console.log(`   USE_PROXY=true`);
    
  } catch (error) {
    console.error('\n❌ 代理连接测试失败!');
    console.error('📋 错误详情:', error.message);
    
    console.log('\n🔧 故障排除步骤:');
    console.log('1. 确认代理服务正在运行');
    console.log('2. 检查代理地址和端口是否正确');
    console.log('3. 测试代理是否支持 HTTPS');
    console.log('4. 检查防火墙和网络设置');
    console.log('5. 尝试不同的代理软件 (Clash, V2Ray, etc.)');
    
    process.exit(1);
  }
}

// 运行测试
testProxyConnection().catch(console.error);