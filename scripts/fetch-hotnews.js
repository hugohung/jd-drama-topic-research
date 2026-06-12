#!/usr/bin/env node
/**
 * fetch-hotnews.js - 热点热榜抓取脚本
 * 
 * 用法：
 *   node fetch-hotnews.js --platforms weibo,zhihu,xiaohongshu
 *   node fetch-hotnews.js --platforms weibo --time 1718000000000
 *   node fetch-hotnews.js --platforms weibo --keyword "AI" --time_start 1715000000000 --time_end 1718000000000
 *   node fetch-hotnews.js --platforms weibo --output json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_PATH = path.join(__dirname, '../config.json');

// 平台配置
const PLATFORMS = {
  weibo: { name: '微博热搜', emoji: '🔥', weight: 0.8 },
  zhihu: { name: '知乎热榜', emoji: '📚', weight: 0.8 },
  'zhihu-daily': { name: '知乎日报', emoji: '📰', weight: 0.8 },
  bilibili: { name: 'B站热榜', emoji: '📺', weight: 0.8 },
  douyin: { name: '抖音热点', emoji: '🎵', weight: 0.8 },
  kuaishou: { name: '快手热榜', emoji: '🎬', weight: 0.8 },
  xiaohongshu: { name: '小红书热榜', emoji: '📕', weight: 0.8 },
  hupu: { name: '虎扑热榜', emoji: '🏀', weight: 0.8 },
  acfun: { name: 'A站热榜', emoji: '🅰️', weight: 0.2 },
  hostloc: { name: '全球主机交流', emoji: '🖥️', weight: 0.2 },
  toutiao: { name: '今日头条', emoji: '📱', weight: 0.2 },
  'netease-news': { name: '网易新闻', emoji: '🐷', weight: 0.2 },
  ithome: { name: 'IT之家', emoji: '💻', weight: 0.2 },
  guokr: { name: '果壳', emoji: '🔬', weight: 0.2 },
  weread: { name: '微信读书', emoji: '📖', weight: 0.2 },
  weatheralarm: { name: '天气预警', emoji: '⛈️', weight: 0.2 },
  earthquake: { name: '地震速报', emoji: '🌍', weight: 0.2 },
  smzdm: { name: '什么值得买', emoji: '🛒', weight: 0.2 },
  rednote: { name: '小红书(备用)', emoji: '📗', weight: 0.2 },
};

const API_BASE = 'https://uapis.cn/api/v1/misc/hotboard';

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    platforms: [],
    time: null,
    keyword: null,
    time_start: null,
    time_end: null,
    output: 'markdown',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--platforms' && args[i + 1]) {
      result.platforms = args[++i].split(',').map(p => p.trim());
    } else if (arg === '--time' && args[i + 1]) {
      result.time = parseInt(args[++i]);
    } else if (arg === '--keyword' && args[i + 1]) {
      result.keyword = args[++i];
    } else if (arg === '--time_start' && args[i + 1]) {
      result.time_start = parseInt(args[++i]);
    } else if (arg === '--time_end' && args[i + 1]) {
      result.time_end = parseInt(args[++i]);
    } else if (arg === '--output' && args[i + 1]) {
      result.output = args[++i];
    }
  }

  return result;
}

// 获取热榜数据
async function fetchHotboard(type, options = {}) {
  const params = new URLSearchParams();
  params.set('type', type);
  
  if (options.time) params.set('time', String(options.time));
  if (options.keyword) params.set('keyword', options.keyword);
  if (options.time_start) params.set('time_start', String(options.time_start));
  if (options.time_end) params.set('time_end', String(options.time_end));

  const url = `${API_BASE}?${params.toString()}`;
  const res = await fetch(url);
  return await res.json();
}

// 格式化 Markdown
function formatAsMarkdown(data, platformKey, options = {}) {
  const platform = PLATFORMS[platformKey];
  const pName = platform ? `${platform.emoji} ${platform.name}` : platformKey;
  const weight = platform?.weight ?? 0.2;

  const items = data.list ?? data.data?.list ?? data.results ?? data.data?.results ?? [];

  if (!items.length) {
    return `## ${pName} (权重:${weight})\n\n暂无数据，可能该平台当前不可用。`;
  }

  const lines = [];
  lines.push(`## ${pName} (权重:${weight})`);
  if (data.update_time) lines.push(`> 更新时间: ${data.update_time}`);
  if (options.time) lines.push(`> 🕰️ 时光机模式: ${new Date(options.time).toLocaleString('zh-CN')}`);
  if (options.keyword) lines.push(`> 🔍 搜索关键词: 「${options.keyword}」`);
  if (weight >= 0.8) {
    lines.push(`> ⭐ 高优先级话题，建议重点参考`);
  } else {
    lines.push(`> 📝 补充参考话题，权重较低`);
  }
  lines.push('');

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const title = item.title ?? item.name ?? item.query ?? '未知标题';
    const hot = item.hot ?? item.heat ?? item.score ?? item.count ?? '';
    const url = item.url ?? item.link ?? '';

    const parts = [`**${i + 1}. ${title}**`];
    if (hot) parts.push(`热度: ${hot}`);
    lines.push(parts.join(' | '));
    if (url) lines.push(`   ${url}`);
    lines.push('');
  }

  return lines.join('\n');
}

// 格式化 JSON
function formatAsJson(data, platformKey) {
  return {
    platform: platformKey,
    name: PLATFORMS[platformKey]?.name ?? platformKey,
    weight: PLATFORMS[platformKey]?.weight ?? 0.2,
    update_time: data.update_time ?? null,
    items: data.list ?? data.data?.list ?? data.results ?? data.data?.results ?? [],
  };
}

// 主函数
async function main() {
  const options = parseArgs();

  if (!options.platforms.length) {
    console.error('错误：请指定 --platforms 参数');
    console.error('用法：node fetch-hotnews.js --platforms weibo,zhihu,xiaohongshu');
    process.exit(1);
  }

  // 按权重排序
  const sorted = [...options.platforms].sort((a, b) => {
    const wa = PLATFORMS[a]?.weight ?? 0;
    const wb = PLATFORMS[b]?.weight ?? 0;
    return wb - wa;
  });

  const results = [];
  const fetchOptions = {};
  if (options.time) fetchOptions.time = options.time;
  if (options.keyword) fetchOptions.keyword = options.keyword;
  if (options.time_start) fetchOptions.time_start = options.time_start;
  if (options.time_end) fetchOptions.time_end = options.time_end;

  // 统计
  const highCount = sorted.filter(p => (PLATFORMS[p]?.weight ?? 0) >= 0.8).length;
  const lowCount = sorted.length - highCount;

  if (options.output === 'markdown') {
    results.push(`## 📊 热榜获取结果`);
    results.push(`- 高优先级平台（权重80%）：${highCount} 个`);
    results.push(`- 补充参考平台（权重20%）：${lowCount} 个`);
    results.push(`\n> 💡 AI 创作参考建议：请优先使用高优先级平台的话题，低优先级平台仅作补充。\n`);
  }

  let highDone = false;
  for (let i = 0; i < sorted.length; i++) {
    const platform = sorted[i];
    const w = PLATFORMS[platform]?.weight ?? 0;

    if (!highDone && w < 0.8 && i > 0) {
      if (options.output === 'markdown') {
        results.push(`\n---\n> ⚠️ 以下为低权重平台，仅供参考，请勿作为主要创作依据\n`);
      }
      highDone = true;
    }

    if (!PLATFORMS[platform]) {
      if (options.output === 'markdown') {
        results.push(`## ❌ 不支持的平台: ${platform}\n可选平台: ${Object.keys(PLATFORMS).join(', ')}`);
      }
      continue;
    }

    try {
      const data = await fetchHotboard(platform, fetchOptions);
      if (options.output === 'markdown') {
        results.push(formatAsMarkdown(data, platform, fetchOptions));
      } else {
        results.push(formatAsJson(data, platform));
      }
    } catch (e) {
      if (options.output === 'markdown') {
        results.push(`## ${PLATFORMS[platform].emoji} ${PLATFORMS[platform].name}\n❌ 获取失败: ${e.message}`);
      } else {
        results.push({ platform, error: e.message });
      }
    }

    // 频率限制
    if (i < sorted.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  if (options.output === 'markdown') {
    console.log(results.join('\n\n---\n\n'));
  } else {
    console.log(JSON.stringify(results, null, 2));
  }
}

main().catch(e => {
  console.error('错误：', e.message);
  process.exit(1);
});
