/**
 * Docker 健康检查脚本 (备用)
 * 当 Node.js HTTP 请求不可用时的备用方案
 */
const healthCheck = async () => {
  try {
    // 尝试导入相关模块进行基础检查
    const fs = require('fs');
    const path = require('path');

    // 检查 dist 目录是否存在
    const distPath = path.join(__dirname, 'main.js');
    if (!fs.existsSync(distPath)) {
      console.error('Application files not found');
      process.exit(1);
    }

    // 检查 package.json 是否存在
    const packagePath = path.join(__dirname, '..', 'package.json');
    if (!fs.existsSync(packagePath)) {
      console.error('Package.json not found');
      process.exit(1);
    }

    console.log('Application files validated');
    process.exit(0); // 健康
  } catch (error) {
    console.error('Health check failed:', error.message);
    process.exit(1);
  }
};

// 执行健康检查
healthCheck();