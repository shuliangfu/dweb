/**
 * 公共配置文件
 * 用于存放多应用共享的配置
 */

export const commonConfig = {
  appName: 'DWeb Multi-App',
  version: '1.0.0',
  apiBaseUrl: typeof Deno !== 'undefined' && Deno.env.get('API_BASE_URL') || 'http://localhost:3000',
};

export default commonConfig;
