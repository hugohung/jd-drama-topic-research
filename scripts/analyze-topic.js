#!/usr/bin/env node
/**
 * analyze-topic.js - 话题短剧适配度分析脚本
 * 
 * 用法：
 *   node analyze-topic.js --topic "榴莲仅退款买家父亲向商家道歉"
 *   node analyze-topic.js --topic "摆烂哲学" --output json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 题材数据库（内置常见题材和爆款元素）
const GENRE_DB = {
  '都市情感': {
    subtypes: ['霸总', '闪婚', '带球跑', '破镜重圆', '先婚后爱'],
    elements: ['霸总', '豪门', '灰姑娘', '逆袭', '打脸'],
    target_audience: '18-35岁女性',
    episode_range: '12-24集',
    hot_examples: ['霸道总裁爱上我', '闪婚后，冷面总裁宠我入骨'],
  },
  '打脸虐渣': {
    subtypes: ['职场打脸', '校园打脸', '豪门打脸', '娱乐圈打脸'],
    elements: ['受气包', '逆袭', '打脸', '爽感'],
    target_audience: '18-40岁女性',
    episode_range: '12-20集',
    hot_examples: ['重生后，我打了前夫的脸', '职场小白逆袭记'],
  },
  '古装权谋': {
    subtypes: ['穿越', '重生', '宫斗', '宅斗', '权谋'],
    elements: ['穿越', '重生', '系统', '金手指', '打脸'],
    target_audience: '18-45岁女性',
    episode_range: '20-40集',
    hot_examples: ['穿越之我在古代当皇后', '重生之嫡女归来'],
  },
  '现实题材': {
    subtypes: ['职场', '家庭', '教育', '医疗', '法律'],
    elements: ['共鸣', '真实', '泪点', '爽点'],
    target_audience: '25-50岁',
    episode_range: '12-30集',
    hot_examples: ['职场妈妈', '高考倒计时'],
  },
  '悬疑推理': {
    subtypes: ['凶宅', '破案', '心理', '灵异'],
    elements: ['悬念', '反转', '恐怖', '烧脑'],
    target_audience: '18-40岁',
    episode_range: '12-24集',
    hot_examples: ['凶宅笔记', '心理罪'],
  },
};

// 情绪关键词库
const EMOTION_KEYWORDS = {
  '愤怒': ['退款', '维权', '欺负', '压迫', '不公', '打假', '揭露'],
  '感动': ['父亲', '母亲', '家人', '亲情', '爱情', '友情', '奉献'],
  '爽感': ['逆袭', '打脸', '翻身', '成功', '赢', '超越'],
  '好奇': ['秘密', '真相', '悬疑', '神秘', '未知', '谜团'],
  '共鸣': ['摆烂', '996', '裁员', '房价', '教育', '婚恋'],
};

// 风险评估
function assessRisk(topic, genre) {
  const risks = [];

  // 政策风险
  const sensitiveWords = ['政治', '宗教', '色情', '暴力', '赌博', '毒品'];
  for (const word of sensitiveWords) {
    if (topic.includes(word)) {
      risks.push({
        type: '政策风险',
        level: '高',
        description: `话题包含敏感词"${word}"，可能无法过审`,
      });
    }
  }

  // 同质化风险
  const hotGenres = ['霸总', '打脸', '穿越', '重生'];
  for (const g of hotGenres) {
    if (genre.includes(g)) {
      risks.push({
        type: '同质化风险',
        level: '中',
        description: `"${g}"题材已严重同质化，需差异化设定`,
      });
    }
  }

  // 制作难度
  if (genre.includes('古装') || genre.includes('穿越')) {
    risks.push({
      type: '制作难度',
      level: '中',
      description: '古装/穿越题材需要服装、场景投入',
    });
  }

  return risks;
}

// 分析话题
function analyzeTopic(topic) {
  const result = {
    topic,
    emotion_score: 0,
    resonance_score: 0,
    conflict_score: 0,
    adaptability_score: 0,
    recommended_genres: [],
    emotion_points: [],
    resonance_points: [],
    risks: [],
  };

  // 1. 情绪分析
  for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
    for (const keyword of keywords) {
      if (topic.includes(keyword)) {
        result.emotion_points.push(emotion);
        result.emotion_score += 1;
      }
    }
  }
  result.emotion_score = Math.min(result.emotion_score, 5);

  // 2. 共鸣分析（基于关键词匹配）
  const resonanceKeywords = ['摆烂', '996', '裁员', '房价', '婚恋', '教育', '职场', '家庭'];
  for (const keyword of resonanceKeywords) {
    if (topic.includes(keyword)) {
      result.resonance_points.push(keyword);
      result.resonance_score += 1;
    }
  }
  result.resonance_score = Math.min(result.resonance_score, 5);

  // 3. 冲突分析（基于标点符号和词语）
  if (topic.includes('！') || topic.includes('？')) {
    result.conflict_score += 2;
  }
  const conflictKeywords = ['道歉', '退款', '战', '打', '撕', '虐', '渣'];
  for (const keyword of conflictKeywords) {
    if (topic.includes(keyword)) {
      result.conflict_score += 1;
    }
  }
  result.conflict_score = Math.min(result.conflict_score, 5);

  // 4. 综合适配度
  result.adaptability_score = Math.round(
    (result.emotion_score * 0.3 +
      result.resonance_score * 0.3 +
      result.conflict_score * 0.4) *
      20 // 转换为百分制
  );

  // 5. 推荐题材
  // 基于关键词匹配推荐
  const topicLower = topic.toLowerCase();
  
  if (topic.includes('退款') || topic.includes('维权') || topic.includes('打')) {
    result.recommended_genres.push({
      genre: '打脸虐渣',
      reason: '话题包含冲突和反转元素，适合打脸剧情',
      subtype: '职场打脸',
    });
  }

  if (topic.includes('父亲') || topic.includes('母亲') || topic.includes('家庭')) {
    result.recommended_genres.push({
      genre: '现实题材',
      reason: '话题涉及家庭关系，适合现实题材',
      subtype: '家庭',
    });
  }

  if (topic.includes('摆烂') || topic.includes('职场') || topic.includes('裁员')) {
    result.recommended_genres.push({
      genre: '都市情感',
      reason: '话题涉及职场生活，适合都市情感题材',
      subtype: '职场逆袭',
    });
  }

  // 默认推荐
  if (result.recommended_genres.length === 0) {
    result.recommended_genres.push({
      genre: '都市情感',
      reason: '通用题材，适配度高',
      subtype: '通用',
    });
  }

  // 6. 风险评估
  for (const rec of result.recommended_genres) {
    const risks = assessRisk(topic, rec.genre);
    result.risks.push(...risks);
  }

  return result;
}

// 格式化输出（Markdown）
function formatAsMarkdown(result) {
  const lines = [];

  lines.push(`## 📋 话题适配度分析：${result.topic}\n`);

  // 评分
  lines.push('### 📊 综合评分');
  lines.push(`- **情绪强度**：${'⭐'.repeat(result.emotion_score)}${'☆'.repeat(5 - result.emotion_score)} (${result.emotion_score}/5)`);
  lines.push(`- **共鸣广度**：${'⭐'.repeat(result.resonance_score)}${'☆'.repeat(5 - result.resonance_score)} (${result.resonance_score}/5)`);
  lines.push(`- **冲突密度**：${'⭐'.repeat(result.conflict_score)}${'☆'.repeat(5 - result.conflict_score)} (${result.conflict_score}/5)`);
  lines.push(`- **综合适配度**：**${result.adaptability_score}分** ${result.adaptability_score >= 80 ? '⭐⭐⭐⭐⭐' : result.adaptability_score >= 60 ? '⭐⭐⭐⭐' : '⭐⭐⭐'}`);
  lines.push('');

  // 情绪点
  if (result.emotion_points.length > 0) {
    lines.push('### 🎯 情绪点');
    for (const ep of result.emotion_points) {
      lines.push(`- ${ep}`);
    }
    lines.push('');
  }

  // 共鸣点
  if (result.resonance_points.length > 0) {
    lines.push('### 🤝 共鸣点');
    for (const rp of result.resonance_points) {
      lines.push(`- ${rp}`);
    }
    lines.push('');
  }

  // 推荐题材
  lines.push('### 🎭 推荐题材');
  for (let i = 0; i < result.recommended_genres.length; i++) {
    const rec = result.recommended_genres[i];
    lines.push(`**${i + 1}. ${rec.genre}** (${rec.subtype})`);
    lines.push(`   - 推荐理由：${rec.reason}`);
    
    // 从数据库补充信息
    const genreInfo = GENRE_DB[rec.genre];
    if (genreInfo) {
      lines.push(`   - 目标人群：${genreInfo.target_audience}`);
      lines.push(`   - 建议集数：${genreInfo.episode_range}`);
      lines.push(`   - 爆款元素：${genreInfo.elements.join('、')}`);
    }
    lines.push('');
  }

  // 风险提示
  if (result.risks.length > 0) {
    lines.push('### ⚠️ 风险提示');
    for (const risk of result.risks) {
      const icon = risk.level === '高' ? '🔴' : risk.level === '中' ? '🟡' : '🟢';
      lines.push(`${icon} **${risk.type}** (等级：${risk.level})`);
      lines.push(`   - ${risk.description}`);
    }
    lines.push('');
  }

  // 京东植入建议
  lines.push('### 🛒 京东植入建议');
  lines.push('- **植入场景**：根据题材选择（都市情感→职场/家庭；现实题材→日常生活）');
  lines.push('- **植入方式**：自然融入 > 硬广 > 彩蛋');
  lines.push('- **示例**：');
  lines.push('  - 职场剧：主角用京东企业购采购办公用品');
  lines.push('  - 家庭剧：妈妈在京东买菜、买日用品');
  lines.push('  - 反转剧：打脸情节中，反派用京东自营假货坑人（然后被揭穿）');
  lines.push('');

  return lines.join('\n');
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  let topic = '';
  let output = 'markdown';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--topic' && args[i + 1]) {
      topic = args[++i];
    } else if (args[i] === '--output' && args[i + 1]) {
      output = args[++i];
    }
  }

  if (!topic) {
    console.error('错误：请指定 --topic 参数');
    console.error('用法：node analyze-topic.js --topic "话题标题"');
    process.exit(1);
  }

  const result = analyzeTopic(topic);

  if (output === 'markdown') {
    console.log(formatAsMarkdown(result));
  } else if (output === 'json') {
    console.log(JSON.stringify(result, null, 2));
  }
}

main().catch(e => {
  console.error('错误：', e.message);
  process.exit(1);
});
