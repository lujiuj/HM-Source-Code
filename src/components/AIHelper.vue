<template>
  <div class="ai-helper-container">
    <!-- 助手图标 -->
    <div 
      class="ai-helper-icon" 
      @click="toggleHelper"
      :class="{ active: isExpanded }"
    >
      <span class="notification-badge" v-if="unreadCount > 0">{{ unreadCount }}</span>
    </div>

    <!-- 对话窗口 -->
    <div class="ai-helper-window" v-if="isExpanded">
      <div class="window-header">
        <h3>AI解戏</h3>
        <div class="header-actions">
          <button class="clear-btn" @click="clearConversation" title="清空对话">
            🗑️
          </button>
          <button class="close-btn" @click="toggleHelper">×</button>
        </div>
      </div>
      
      <div class="conversation-area" ref="conversationArea">
        <!-- 系统欢迎消息 -->
        <div class="message-item system" v-if="conversation.length === 0">
          <div class="avatar">老戏痴</div>
          <div class="content">
            <p>🎭 你好！我是你的专属老戏痴，有什么不懂的都来问我吧。</p>
            <p v-if="videoContext?.currentVideo">📺 我正在关注您观看的《{{ videoContext.currentVideo.title }}》</p>
            <p>💫 我可以为你解答：</p>
            <ul>
              <li>🎵 黄梅戏历史与起源</li>
              <li>🌟 经典剧目和唱腔</li>
              <li>👥 著名演员与表演艺术</li>
              <li>📚 戏曲文化知识</li>
            </ul>
          </div>
        </div>
        
        <!-- 对话消息 -->
        <div 
          v-for="(msg, index) in conversation" 
          :key="index" 
          class="message-item" 
          :class="{ 
            user: msg.role === 'user', 
            ai: msg.role === 'ai'
          }"
        >
          <div class="avatar">
            {{ msg.role === 'user' ? '我' : '老戏痴' }}
            <span class="timestamp">{{ formatTime(msg.timestamp) }}</span>
          </div>
          <div class="content" v-html="formatMessage(msg.content)"></div>
        </div>
        
        <!-- 输入指示器 -->
        <div class="message-item ai" v-if="isAITyping">
          <div class="avatar">老戏痴</div>
          <div class="content typing-indicator">
            <div class="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span>老戏痴正在思考...</span>
          </div>
        </div>
      </div>
      
      <div class="input-area">
        <div class="input-wrapper">
          <input 
            type="text" 
            v-model="userInput" 
            :placeholder="videoContext?.currentVideo ? `询问关于《${videoContext.currentVideo.title}》的问题...` : '请输入关于黄梅戏的问题...'" 
            @keyup.enter="sendMessage"
            :disabled="isAITyping"
            maxlength="500"
          >
          <span class="char-count">{{ userInput.length }}/500</span>
        </div>
        <div class="btn-container">
          <button 
            @click="sendMessage" 
            :disabled="!userInput.trim() || isAITyping"
            class="send-btn"
          >
            <span class="button__text" v-if="!isAITyping">发送</span>
            <span class="button__text" v-else>发送中...</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted } from 'vue';

// 视频识别
const props = defineProps({
  videoContext: {
    type: Object,
    default: () => null
  }
});

// 状态管理
const isExpanded = ref(false);
const userInput = ref('');
const conversation = ref([]);
const isAITyping = ref(false);
const unreadCount = ref(0);
const conversationArea = ref(null);

// 保存和加载对话历史
onMounted(() => {
  const saved = localStorage.getItem('ai-helper-conversation');
  if (saved) {
    try {
      conversation.value = JSON.parse(saved);
    } catch (e) {
      console.error('加载对话历史失败:', e);
    }
  }
});

const saveConversation = () => {
  try {
    localStorage.setItem('ai-helper-conversation', JSON.stringify(conversation.value));
  } catch (e) {
    console.error('保存对话历史失败:', e);
  }
};

// 切换助手窗口
const toggleHelper = () => {
  isExpanded.value = !isExpanded.value;
  if (isExpanded.value) {
    unreadCount.value = 0;
    scrollToBottom();
  }
};

// 清空对话
const clearConversation = () => {
  conversation.value = [];
  saveConversation();
};

// 发送消息到DeepSeek API
const sendMessage = async () => {
  const message = userInput.value.trim();
  if (!message) return;

  // 添加用户消息
  const userMessage = {
    role: 'user',
    content: message,
    timestamp: new Date()
  };
  conversation.value.push(userMessage);
  userInput.value = '';
  scrollToBottom();
  saveConversation();

  // 调用DeepSeek API
  isAITyping.value = true;
  try {
    const aiResponse = await callDeepSeekAPI(message);
    
    conversation.value.push({
      role: 'ai',
      content: aiResponse,
      timestamp: new Date()
    });

    if (!isExpanded.value) {
      unreadCount.value++;
    }
  } catch (error) {
    console.error('DeepSeek API调用失败:', error);
    conversation.value.push({
      role: 'ai',
      content: '抱歉，老戏痴暂时离线，请稍后再试。',
      timestamp: new Date(),
      isError: true
    });
  } finally {
    isAITyping.value = false;
    scrollToBottom();
    saveConversation();
  }
};

// 调用DeepSeek API
const callDeepSeekAPI = async (question) => {
  const API_KEY = 'sk-ae25d3a7c79a43c88a0b9e791cc0531d';
  const API_URL = 'https://api.deepseek.com/chat/completions';

  // 构建视频上下文信息
  let contextInfo = '';
  if (props.videoContext && props.videoContext.currentVideo) {
    const video = props.videoContext.currentVideo;
    contextInfo = `
当前播放视频信息：
🎬 剧目名称：《${video.title}》
📖 剧情简介：${video.description}
⏱️ 视频时长：${video.duration}
🎭 主要演员：${video.performers?.join('、') || '未知'}
🏷️ 作品标签：${video.tags?.join('、') || '无'}
📅 创作年份：${video.year}
🎨 艺术风格：${video.style}
🎵 唱腔特点：${video.singingStyle || '暂无信息'}
🌟 剧情亮点：${video.highlights?.join('、') || '无'}
👥 主要角色：${video.characters?.join('、') || '未知'}
💫 文化意义：${video.culturalSignificance || '暂无信息'}

视频播放状态：
${props.videoContext.videoState.isPlaying ? '▶️ 正在播放中' : '⏸️ 已暂停'}
${props.videoContext.videoState.isEnded ? '✅ 播放已结束' : ''}
    `;
  }

  // 增强系统提示词
  const systemPrompt = `你是一个专业的黄梅戏文化助手，能够识别当前播放的视频内容并回答相关问题。

${contextInfo ? `重要：当前用户正在观看《${props.videoContext.currentVideo.title}》，请优先基于这个视频内容回答问题。` : '用户没有在观看特定视频，请回答通用黄梅戏知识。'}

回答要求：
1. 🎯 如果问题与当前视频相关，请基于视频信息详细回答
2. 🎭 如果问题超出当前视频范围，可扩展到黄梅戏相关知识
3. 📝 使用优美的格式和适当的emoji
4. 🎨 保持专业性和文化内涵
5. 💫 语言生动有趣，富有戏曲特色

格式示例：
🎬《剧目名称》相关信息
📖 剧情梗概：...
🎭 艺术特色：...
🌟 经典片段：...
💡 文化价值：...

请根据用户问题智能选择回答角度。`;

  // 构建对话历史
  const messages = [
    {
      role: 'system',
      content: systemPrompt
    },
    ...conversation.value.slice(-6).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    })),
    {
      role: 'user',
      content: question
    }
  ];

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: messages,
        max_tokens: 2000,
        temperature: 0.7,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.choices && data.choices.length > 0) {
      return data.choices[0].message.content;
    } else {
      throw new Error('API返回数据格式异常');
    }
  } catch (error) {
    console.error('DeepSeek API调用错误:', error);
    throw error;
  }
};

// 格式化消息内容
const formatMessage = (content) => {
  return content
    .replace(/^# (.*$)/gim, '<h3 class="message-title">$1</h3>')
    .replace(/^## (.*$)/gim, '<h4 class="message-subtitle">$1</h4>')
    .replace(/^[-*] (.*$)/gim, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gim, '<ul class="message-list">$1</ul>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="message-strong">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="message-em">$1</em>')
    .replace(/^-{3,}/g, '<hr class="message-divider">')
    .replace(/\n/g, '<br>')
    .replace(/([\u{1F300}-\u{1F9FF}])/gu, '<span class="message-emoji">$1</span>');
};

// 格式化时间
const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (conversationArea.value) {
      conversationArea.value.scrollTop = conversationArea.value.scrollHeight;
    }
  });
};

// 监听对话变化
watch(conversation, scrollToBottom, { deep: true });
</script>

<style scoped>
.ai-helper-container {
  position: fixed;
  left: 30px;
  bottom: 30px;
  z-index: 9999;
  font-family: 'Microsoft YaHei', 'SimSun', sans-serif;
}

/* AI */
.ai-helper-icon {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: url('https://cdn.jsdelivr.net/gh/lujiuj/hm-cdn-assents/assets/performers/actor2.png');
  background-size: cover;
  color: #fefefe;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  cursor: pointer;
  /* box-shadow: 0 6px 25px rgba(212, 175, 55, 0.4); */
  transition: all 0.4s ease;
  position: relative;
  /* border: 3px solid #f39521; */
  font-weight: bold;
  text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.5);
  overflow: hidden;
}

.ai-helper-icon::before {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  background: url('https://cdn.jsdelivr.net/gh/lujiuj/hm-cdn-assents/assets/sface.png');
  border-radius: 50%;
  animation: shine 3s infinite linear;
}

@keyframes shine {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.notification-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  /* background: url('../assets/backgrounds/back1.jpg'); */
  color: white;
  font-size: 12px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #8B0000;
  box-shadow: 0 2px 8px rgba(139, 0, 0, 0.3);
  z-index: 1;
}

/* 对话窗口 */
.ai-helper-window {
  width: 400px;
  height: 520px;
  background: linear-gradient(135deg, #FFF8F0, #FDF5E6);
  border-radius: 20px;
  box-shadow: 0 12px 50px rgba(139, 0, 0, 0.2), 0 0 0 1px rgba(212, 175, 55, 0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 2px solid #D4AF37;
  position: relative;
}

.ai-helper-window::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border: 8px solid transparent;
  border-image: linear-gradient(45deg, #D4AF37, #8B0000, #008080, #D4AF37) 1;
  border-radius: 20px;
  pointer-events: none;
  z-index: 0;
}

.window-header {
  background: url('https://cdn.jsdelivr.net/gh/lujiuj/hm-cdn-assents/assets/backgrounds/back1.webp');
  background-size: cover;
  background-repeat: no-repeat;
  color: #FFD700;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #D4AF37;
  position: relative;
  z-index: 1;
}

.window-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 2px;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.clear-btn, .close-btn {
  background: rgba(212, 175, 55, 0.3);
  border: 1px solid #FFD700;
  color: #FFD700;
  font-size: 16px;
  cursor: pointer;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  backdrop-filter: blur(4px);
}

.clear-btn:hover, .close-btn:hover {
  background: rgba(255, 215, 0, 0.5);
  transform: scale(1.1);
}

.clear-btn {
  font-size: 18px;
}

.conversation-area {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background: rgb(255, 247, 213);
  position: relative;
  z-index: 1;
}

.message-item {
  margin-bottom: 20px;
  max-width: 85%;
  animation: messageSlide 0.4s ease-out;
  position: relative;
  z-index: 1;
}

@keyframes messageSlide {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.message-item.system {
  margin: 0 auto 20px;
  max-width: 90%;
  background: rgba(255, 248, 240, 0.9);
  border: 2px solid #D4AF37;
  border-radius: 12px;
  padding: 15px;
  box-shadow: 0 4px 15px rgba(139, 0, 0, 0.1);
}

.message-item.system .content {
  background: transparent;
  border: none;
  color: #8B0000;
  font-size: 14px;
  line-height: 1.6;
  text-align: center;
}

.message-item.system .content p {
  margin: 8px 0;
}

.message-item.system .content ul {
  list-style: none;
  padding: 0;
  margin: 10px 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  text-align: left;
}

.message-item.system .content li {
  padding: 6px 10px;
  background: rgba(212, 175, 55, 0.1);
  border-radius: 6px;
  border-left: 3px solid #8B0000;
  font-size: 12px;
}

.message-item.user {
  margin-left: auto;
}

.message-item.ai {
  margin-right: auto;
}

.avatar {
  font-size: 13px;
  margin-bottom: 8px;
  color: #8B0000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 500;
  padding: 0 5px;
}

.timestamp {
  font-size: 11px;
  opacity: 0.8;
  color: #666;
}

.content {
  padding: 16px 20px;
  border-radius: 15px;
  line-height: 1.6;
  word-wrap: break-word;
  box-shadow: 0 4px 12px rgba(139, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
  border: 1px solid transparent;
  background-clip: padding-box;
}

.message-item.ai .content::after {
  content: '';
  position: absolute;
  top: 25px;
  left: 25px;
  width: 20px;
  height: 20px;
  background: linear-gradient(135deg, #FF6B8B, #FF1493);
  border-radius: 50%;
  opacity: 0.1;
  pointer-events: none;
  z-index: 0;
}

.message-item.user .content {
  background: linear-gradient(135deg, #8B0000, #A52A2A);
  color: #FFD700;
  border-bottom-right-radius: 8px;
  border: 1px solid #FFD700;
  position: relative;
  z-index: 1;
}

.message-item.ai .content {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #D4AF37;
  color: #5D4037;
  border-bottom-left-radius: 8px;
  text-align: left;
  position: relative;
  z-index: 1;
  backdrop-filter: blur(5px);
}

.message-item.ai .content :deep(.message-title) {
  color: #8B0000;
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 10px 0;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 2px solid #D4AF37;
  padding-bottom: 6px;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
}

.message-item.ai .content :deep(.message-subtitle) {
  color: #A52A2A;
  font-size: 14px;
  font-weight: 600;
  margin: 12px 0 8px 0;
  padding-left: 8px;
  border-left: 3px solid #008080;
}

.message-item.ai .content :deep(.message-list) {
  margin: 10px 0;
  padding-left: 20px;
}

.message-item.ai .content :deep(.message-list li) {
  margin-bottom: 8px;
  line-height: 1.5;
  position: relative;
  padding-left: 10px;
}

.message-item.ai .content :deep(.message-list li:before) {
  content: "•";
  color: #D4AF37;
  font-size: 20px;
  position: absolute;
  left: -15px;
  top: -2px;
}

.message-item.ai .content :deep(.message-strong) {
  color: #8B0000;
  font-weight: 600;
  text-shadow: 1px 1px 2px rgba(212, 175, 55, 0.2);
}

.message-item.ai .content :deep(.message-em) {
  color: #8B0000;
  font-style: italic;
  background: linear-gradient(135deg, transparent 50%, rgba(212, 175, 55, 0.1) 50%);
}

.message-item.ai .content :deep(.message-divider) {
  border: none;
  border-top: 2px dashed #D4AF37;
  margin: 15px 0;
  position: relative;
}

.message-item.ai .content :deep(.message-divider)::after {
  content: '✧';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: #FFF8F0;
  padding: 0 10px;
  color: #8B0000;
  font-size: 12px;
}

.message-item.ai .content :deep(.message-emoji) {
  font-size: 1.2em;
  margin-right: 4px;
  filter: drop-shadow(1px 1px 1px rgba(0, 0, 0, 0.1));
}

.typing-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #dec5c5;
  font-style: italic;
}

.typing-dots {
  display: flex;
  gap: 4px;
}

.typing-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: linear-gradient(135deg, #D4AF37, #FFD700);
  animation: typing 1.4s infinite ease-in-out;
  box-shadow: 0 0 4px rgba(212, 175, 55, 0.5);
}

.typing-dots span:nth-child(1) { animation-delay: -0.32s; }
.typing-dots span:nth-child(2) { animation-delay: -0.16s; }

@keyframes typing {
  0%, 80%, 100% { 
    transform: scale(0.8); 
    opacity: 0.5; 
  }
  40% { 
    transform: scale(1.2); 
    opacity: 1; 
  }
}

.input-area {
  padding: 20px;
  border-top: 2px solid #D4AF37;
  background: rgba(255, 248, 240, 0.9);
  position: relative;
  z-index: 1;
}

.input-wrapper {
  position: relative;
  margin-bottom: 12px;
}

.input-area input {
  width: 100%;
  padding: 14px 18px;
  border: 2px solid #D4AF37;
  border-radius: 10px;
  outline: none;
  font-size: 14px;
  transition: all 0.3s ease;
  padding-right: 70px;
  background: white;
  color: #5D4037;
  box-shadow: inset 0 2px 6px rgba(139, 0, 0, 0.1);
}

.input-area input:focus {
  border-color: #8B0000;
  box-shadow: 0 0 0 3px rgba(139, 0, 0, 0.1), inset 0 2px 6px rgba(139, 0, 0, 0.1);
}

.input-area input:disabled {
  background: #F5F5F5;
  cursor: not-allowed;
  border-color: #CCCCCC;
}

.input-area input::placeholder {
  color: #767473;
  opacity: 0.7;
}

.char-count {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: #f1f1f1;
  font-weight: 500;
  background: rgba(255, 215, 0, 0.2);
  padding: 2px 8px;
  border-radius: 10px;
}
.btn-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 60px;
}

.send-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 240px;
  height: 56px;
  text-decoration: none;
  font-size: 14px;
  font-weight: bold;
  color: #00135c; /* Default line color */
  background-color: #defffa; /* Default background color */
  letter-spacing: 2px;
  transition: all 0.3s ease;
  border: 3px solid #00135c; /* Border with line color */
  border-radius: 30px;

}

.send-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: 0.5s;
}

.send-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(250, 217, 217, 0.4);
  background: linear-gradient(135deg, #f8e5a1, #f07008);
}

.send-btn:hover:not(:disabled)::before {
  left: 100%;
}

.send-btn:disabled {
  background: linear-gradient(135deg, #CCCCCC, #999999);
  color: #666666;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
  border-color: #999999;
}

.window-footer {
  padding: 8px 16px;
  background: rgba(255, 248, 240, 0.9);
  border-top: 1px solid #D4AF37;
  text-align: center;
  position: relative;
  z-index: 1;
}

.model-info {
  font-size: 12px;
  color: #8B0000;
  opacity: 0.8;
}

/* 滚动条样式 */
.conversation-area::-webkit-scrollbar {
  width: 8px;
}

.conversation-area::-webkit-scrollbar-track {
  background: rgba(255, 248, 240, 0.8);
  border-radius: 4px;
  border: 1px solid #D4AF37;
}

.conversation-area::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #8B0000, #D4AF37);
  border-radius: 4px;
  border: 1px solid #FFD700;
}

.conversation-area::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #A52A2A, #FFD700);
}

/* 响应式调整 */
@media (max-width: 768px) {
  .ai-helper-container {
    left: 20px;
    bottom: 20px;
  }
  
  .ai-helper-window {
    width: 350px;
    height: 450px;
  }
  
  .ai-helper-icon {
    width: 60px;
    height: 60px;
    font-size: 24px;
  }
}
</style>