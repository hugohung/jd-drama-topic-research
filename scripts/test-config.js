#!/usr/bin/env node
/**
 * test-config.js - 测试配置文件是否正确
 * 
 * 用法：
 *   node test-config.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_PATH = path.join(__dirname, '../config.json');
const EXAMPLE_PATH = path.join(__dirname, '../config.example.json');

console.log('🔍 开始测试配置...\n');

// 1. 检查配置文件是否存在
console.log('1️⃣ 检查配置文件...');
if (!fs.existsSync(CONFIG_PATH)) {
  console.error(`❌ 配置文件不存在: ${CONFIG_PATH}`);
  console.error(`💡 请先复制配置文件模板：`);
  console.error(`   cp ${EXAMPLE_PATH} ${CONFIG_PATH}`);
  process.exit(1);
}
console.log(`✅ 配置文件存在: ${CONFIG_PATH}\n`);

// 2. 检查配置文件格式
console.log('2️⃣ 检查配置文件格式...');
let config;
try {
  config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  console.log('✅ 配置文件格式正确\n');
} catch (e) {
  console.error('❌ 配置文件格式错误：', e.message);
  process.exit(1);
}

// 3. 检查 API Key
console.log('3️⃣ 检查 52api.cn API Key...');
const apiKey = config['52api_key'] || '';
if (!apiKey) {
  console.warn('⚠️  未配置 52api.cn API Key');
  console.warn('⚠️  红果短剧功能将不可用');
  console.warn('💡 请编辑 config.json，填入你的 52api.cn API Key\n');
} else {
  console.log(`✅ 52api.cn API Key 已配置 (长度: ${apiKey.length})\n`);
  
  // 4. 测试 API Key 是否有效
  console.log('4️⃣ 测试 52api.cn API Key 是否有效...');
  try {
    const url = `https://www.52api.cn/api/hg_top?key=${apiKey}&type=top`;
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.code === 200) {
      console.log('✅ API Key 有效！\n');
      
      // 显示可用的榜单
      const lists = data.data?.lists || [];
      console.log(`📊 可用的榜单数量: ${lists.length}`);
      for (const lst of lists.slice(0, 3)) {
        console.log(`   - ${lst.cell_name} (${lst.cell_id})`);
      }
      if (lists.length > 3) {
        console.log(`   ... 还有 ${lists.length - 3} 个榜单`);
      }
      console.log('');
    } else {
      console.error(`❌ API Key 无效: ${data.msg || '未知错误'}`);
      console.error('💡 请检查 API Key 是否正确，或登录 52api.cn 查看配额\n');
    }
  } catch (e) {
    console.error('❌ 测试 API Key 时出错：', e.message);
    console.error('💡 请检查网络连接\n');
  }
}

// 5. 检查依赖
console.log('5️⃣ 检查依赖...');
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8'));
  console.log(`✅ 项目: ${packageJson.name} v${packageJson.version}`);
  console.log(`✅ 描述: ${packageJson.description}\n`);
} catch {
  console.warn('⚠️  未找到 package.json\n');
}

console.log('🎉 配置测试完成！');
console.log('\n📝 下一步：');
console.log('   1. 如果未配置 API Key，请编辑 config.json');
console.log('   2. 运行测试命令：');
console.log('      node scripts/fetch-hotnews.js --platforms weibo,zhihu');
console.log('      node scripts/fetch-hongguo.js --action top');
console.log('   3. 在 WorkBuddy 中测试 skill\n');
