import { setGlobalDispatcher, ProxyAgent } from 'undici';

/**
 * 全局代理配置
 * 用于解决墙内网络访问 Google API 的问题
 */

// 从环境变量获取代理设置
const httpProxy = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
const defaultProxy = 'http://127.0.0.1:7890'; // 默认代理地址

// 检查是否需要启用代理
const shouldUseProxy = process.env.NODE_ENV === 'production' || process.env.USE_PROXY === 'true' || httpProxy;

if (shouldUseProxy) {
  const proxyUrl = httpProxy || defaultProxy;
  
  try {
    console.log('🌐 正在配置全局代理:', proxyUrl);
    
    // 设置全局代理调度器
    setGlobalDispatcher(new ProxyAgent(proxyUrl));
    
    console.log('✅ 全局代理配置成功');
    console.log('📋 所有 fetch() 请求将通过代理:', proxyUrl);
    
    // 可选：设置额外的代理环境变量
    if (!process.env.HTTP_PROXY) {
      process.env.HTTP_PROXY = proxyUrl;
    }
    if (!process.env.HTTPS_PROXY) {
      process.env.HTTPS_PROXY = proxyUrl;
    }
    
  } catch (error) {
    console.error('❌ 代理配置失败:', error);
    console.error('💡 请检查代理地址是否正确:', proxyUrl);
    console.error('💡 常见代理端口: 7890, 1080, 8080, 3128');
  }
} else {
  console.log('ℹ️  未启用代理模式');
  console.log('💡 如需启用代理，请设置环境变量:');
  console.log('   - HTTP_PROXY=http://127.0.0.1:7890');
  console.log('   - 或 USE_PROXY=true');
}

// 导出代理配置信息
export const proxyConfig = {
  enabled: shouldUseProxy,
  url: shouldUseProxy ? (httpProxy || defaultProxy) : null,
  isDefault: shouldUseProxy && !httpProxy
};

// 检查代理连接的辅助函数
export async function testProxyConnection(targetUrl: string = 'https://www.google.com'): Promise<boolean> {
  try {
    console.log('🔧 测试代理连接:', targetUrl);
    
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Gemini-CLI/1.0)'
      }
    });
    
    const success = response.ok;
    console.log(success ? '✅ 代理连接测试成功' : '❌ 代理连接测试失败');
    return success;
  } catch (error) {
    console.error('❌ 代理连接测试失败:', error);
    return false;
  }
}