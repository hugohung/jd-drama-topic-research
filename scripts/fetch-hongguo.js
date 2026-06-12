#!/usr/bin/env node
/**
 * fetch-hongguo.js - 红果短剧热播榜抓取脚本
 * 
 * 用法：
 *   node fetch-hongguo.js --action top
 *   node fetch-hongguo.js --action list --cell_id ranklist_hot_play_sc
 *   node fetch-hongguo.js --action list --cell_id ranklist_hot_sc --sub_cell_id gender_female
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_PATH = path.join(__dirname, '../config.json');

// 读取 API Key
let API_KEY = '';
try {
  const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  API_KEY = cfg['52api_key'] || '';
} catch {
  console.error('警告: 无法读取 config.json，红果短剧功能将不可用。');
}

const API_BASE = 'https://www.52api.cn/api/hg_top';

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    action: 'top',
    cell_id: '',
    sub_cell_id: '',
    page: 1,
    output: 'markdown',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--action' && args[i + 1]) {
      result.action = args[++i];
    } else if (arg === '--cell_id' && args[i + 1]) {
      result.cell_id = args[++i];
    } else if (arg === '--sub_cell_id' && args[i + 1]) {
      result.sub_cell_id = args[++i];
    } else if (arg === '--page' && args[i + 1]) {
      result.page = parseInt(args[++i]) || 1;
    } else if (arg === '--output' && args[i + 1]) {
      result.output = args[++i];
    }
  }

  return result;
}

// 调用 API
async function fetchHongguo(type, extraParams = {}) {
  if (!API_KEY) {
    throw new Error('未配置 52api.cn API Key，请在 config.json 中配置 52api_key。');
  }

  const params = new URLSearchParams();
  params.set('key', API_KEY);
  params.set('type', type);
  for (const [k, v] of Object.entries(extraParams)) {
    if (v) params.set(k, v);
  }

  const url = `${API_BASE}?${params.toString()}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.code !== 200) {
    throw new Error(`API 返回错误: ${data.msg || '未知错误'}`);
  }

  return data;
}

// 格式化榜单列表
function formatTopAsMarkdown(data) {
  const lists = data.data?.lists || [];
  const lines = ['## 🎬 红果短剧榜单列表\n'];

  for (const lst of lists) {
    const cellName = lst.cell_name || '';
    const cellId = lst.cell_id || '';
    lines.push(`### ${cellName} (\`${cellId}\`)`);

    const subLists = lst.sub_lists || [];
    if (subLists.length > 0) {
      for (const sub of subLists) {
        const subName = sub.sub_cell_name || '';
        const subId = sub.sub_cell_id || '';
        if (subName) {
          lines.push(`- \`${cellId}\`${subId ? `/${subId}` : ''} — ${subName}`);
        }
      }
    }
    lines.push('');
  }

  lines.push('> 💡 使用 --action list --cell_id <ID> 获取指定榜单的短剧列表。');
  lines.push('> 示例: `--cell_id ranklist_hot_play_sc`');

  return lines.join('\n');
}

// 格式化短剧列表
function formatListAsMarkdown(data) {
  const listData = data.data || {};
  const items = listData.lists || [];
  const cellName = listData.cell_name || '红果短剧榜';

  const lines = [`## 🎬 ${cellName}\n`];

  if (!items.length) {
    lines.push('暂无数据。');
    return lines.join('\n');
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const title = item.title || '';
    const desc = item.desc || '';
    const episodes = item.episode_num || 0;
    const playNum = item.play_num || 0;
    const score = item.score || '';
    const subTitleList = item.sub_title_list || [];
    const secondaryList = item.secondary_info_list || [];
    const recItem = item.rec_text_item || {};
    const hotValue = recItem.content || '';

    lines.push(`**${i + 1}. ${title}**`);
    if (hotValue) lines.push(`   🔥 热度: ${hotValue}`);
    if (playNum) lines.push(`   ▶️ 播放量: ${(playNum / 10000).toFixed(1)}万`);
    if (score) lines.push(`   ⭐ 评分: ${score}`);
    if (episodes) lines.push(`   📺 集数: ${episodes}集`);

    // 标签
    if (subTitleList.length > 0) {
      const tags = subTitleList.map(t => t.content).filter(Boolean).join(' · ');
      lines.push(`   🏷️ ${tags}`);
    }

    // 收藏、点赞等
    if (secondaryList.length > 0) {
      const extra = secondaryList.map(t => t.content).filter(Boolean).join(' | ');
      lines.push(`   ${extra}`);
    }

    if (desc) lines.push(`   📗 简介: ${desc.substring(0, 60)}...`);
    lines.push('');
  }

  return lines.join('\n');
}

// 格式化 JSON
function formatAsJson(data, action) {
  if (action === 'top') {
    return {
      type: 'top',
      lists: (data.data?.lists || []).map(lst => ({
        cell_name: lst.cell_name,
        cell_id: lst.cell_id,
        sub_lists: (lst.sub_lists || []).map(sub => ({
          sub_cell_name: sub.sub_cell_name,
          sub_cell_id: sub.sub_cell_id,
        })),
      })),
    };
  } else {
    const listData = data.data || {};
    return {
      type: 'list',
      cell_name: listData.cell_name,
      items: (listData.lists || []).map(item => ({
        title: item.title,
        desc: item.desc,
        episode_num: item.episode_num,
        play_num: item.play_num,
        score: item.score,
        tags: (item.sub_title_list || []).map(t => t.content).filter(Boolean),
      })),
    };
  }
}

// 主函数
async function main() {
  const options = parseArgs();

  if (options.action === 'top') {
    const data = await fetchHongguo('top');
    if (options.output === 'markdown') {
      console.log(formatTopAsMarkdown(data));
    } else {
      console.log(JSON.stringify(formatAsJson(data, 'top'), null, 2));
    }
  } else if (options.action === 'list') {
    if (!options.cell_id) {
      console.error('错误：请指定 --cell_id 参数');
      console.error('用法：node fetch-hongguo.js --action list --cell_id ranklist_hot_play_sc');
      process.exit(1);
    }

    const extraParams = { cell_id: options.cell_id };
    if (options.sub_cell_id) extraParams.sub_cell_id = options.sub_cell_id;
    extraParams.page = String(options.page);

    const data = await fetchHongguo('list', extraParams);
    if (options.output === 'markdown') {
      console.log(formatListAsMarkdown(data));
    } else {
      console.log(JSON.stringify(formatAsJson(data, 'list'), null, 2));
    }
  } else {
    console.error('错误：未知 action，请使用 top 或 list');
    process.exit(1);
  }
}

main().catch(e => {
  console.error('错误：', e.message);
  process.exit(1);
});
