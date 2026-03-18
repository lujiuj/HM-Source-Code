<template>
  <div class="w-body">
    <button id="return" @click="gotoHome"></button>

    <div class="w-mix">
      <!-- 放置戏台模型和视频影象 -->
      <div class="stage">
        <canvas id="three"></canvas>
        <div class="video-show">
          <h2 class="mt30 mb10"></h2>
          <Video 
            :src="currentVideo.src" 
            :second="3" 
            :width="420" 
            :height="238" 
            :scale="commonScale"
            @video-ended="onVideoEnded"
            @video-paused="onVideoPaused"
            @video-playing="onVideoPlaying"
          />
        </div>
      </div>

      <!-- 视频菜单 -->
      <div 
        class="bottom-video-controls" 
        :class="{ expanded: isControlsExpanded }"
        @mouseenter="expandControls"
        @mouseleave="collapseControls"
      >
        <!-- 上拉箭头 -->
        <div class="pull-handle">
          <div class="arrow-icon">↑</div>
          <span class="handle-text">剧目菜单</span>
        </div>
        
        <!-- 菜单内容 -->
        <div class="controls-content">
          <!-- 视频切换菜单 -->
          <div class="video-menu">
            <div class="menu-header">
              <h4>所有剧目</h4>
              <span class="menu-count">{{ Object.keys(videoLibrary).length }} 个剧目</span>
            </div>
            <div class="video-grid">
              <div 
                v-for="(video, name) in videoLibrary" 
                :key="name"
                @click="switchVideo(name)"
                :class="{ active: currentVideo.title === video.title }"
                class="video-card"
              >
                <div class="card-thumb">
                  <div class="thumb-placeholder">{{ video.title.charAt(0) }}</div>
                  <div v-if="currentVideo.title === video.title" class="playing-badge">
                    <div class="playing-pulse"></div>
                    <span>播放中</span>
                  </div>
                </div>
                <div class="card-content">
                  <div class="card-title">{{ video.title }}</div>
                  <div class="card-meta">
                    <span class="duration">{{ video.duration }}</span>
                    <span class="year">{{ video.year }}</span>
                  </div>
                  <div class="card-performers">{{ video.performers.join('、') }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 悬浮可收缩聊天框 -->
      <div class="chatroom-wrapper" :class="{ 'chatroom-collapsed': isCollapsed }">
        <!-- 收缩/展开按钮 -->
        <button class="toggle-btn" @click="isCollapsed = !isCollapsed">
          {{ isCollapsed ? '←' : '→' }}
        </button>
        
        <!-- 聊天内容区域 -->
        <div v-if="!isCollapsed" class="chatroom">
          <div class="chat-header">
            <h3>观戏聊天室</h3>
            <span class="current-video">正在播放: {{ currentVideo.title }}</span>
          </div>
          <div id="messages">
            <div v-for="msg in messageList" :key="msg.id" 
                 :class="['message-item', { 'self-message': msg.isSelf, 'other-message': !msg.isSelf }]">
              <div class="message-content">
                {{ msg.content }}
              </div>
            </div>
          </div>
          <div class="container">
            <div class="form">
              <input 
                v-model="inputMessage" 
                class="input"
                type="text" 
                placeholder="输入消息...">
              
              <button id="button" @click="sendMessage">
                <svg viewBox="0 0 24 24" class="search__icon">
                  <g>
                    <path d="M21.53 20.47l-3.66-3.66C19.195 15.24 20 13.214 20 11c0-4.97-4.03-9-9-9s-9 4.03-9 9 4.03 9 9 9c2.215 0 4.24-.804 5.808-2.13l3.66 3.66c.147.146.34.22.53.22s.385-.073.53-.22c.295-.293.295-.767.002-1.06zM3.5 11c0-4.135 3.365-7.5 7.5-7.5s7.5 3.365 7.5 7.5-3.365 7.5-7.5 7.5-7.5-3.365-7.5-7.5z">
                    </path>
                  </g>
                </svg>
              </button>
            </div>
          </div>
          
        </div>
      </div>
    </div>
    
    <!-- 添加AIHelper组件,传递视频上下文 -->
    <AIHelper :videoContext="videoContext" />
  </div>
</template>

<script setup>
import { useRouter, useRoute } from "vue-router";
import { io } from "socket.io-client";
import * as THREE from 'three';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { ref, onMounted, onUnmounted, computed, provide } from 'vue';
import Video from '../components/Video.vue'
import AIHelper from '../components/AIHelper.vue';
import videoLibrary from '../config/videoList'

// 消息栏收缩
const isCollapsed = ref(false);
// 底部控制菜单展开状态
const isControlsExpanded = ref(false);

// 当前播放视频
const currentVideo = ref(videoLibrary['梁祝·楼台会']);

// 视频播放状态
const videoState = ref({
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  isEnded: false
});

// 计算视频上下文信息
const videoContext = computed(() => ({
  currentVideo: currentVideo.value,
  videoState: videoState.value,
  videoLibrary: videoLibrary,
  timestamp: new Date().toLocaleString('zh-CN')
}));

// 展开控制菜单
const expandControls = () => {
  isControlsExpanded.value = true;
};

// 收缩控制菜单
const collapseControls = () => {
  isControlsExpanded.value = false;
};

// 视频事件处理
const onVideoEnded = () => {
  videoState.value.isPlaying = false;
  videoState.value.isEnded = true;
  console.log('视频播放结束');
};

const onVideoPaused = () => {
  videoState.value.isPlaying = false;
};

const onVideoPlaying = () => {
  videoState.value.isPlaying = true;
  videoState.value.isEnded = false;
};

// 切换视频函数
const switchVideo = (videoName) => {
  if (videoLibrary[videoName]) {
    currentVideo.value = videoLibrary[videoName];
    videoState.value.isPlaying = false;
    videoState.value.isEnded = false;
    console.log(`切换到视频: ${videoName}`);
  }
};

// three.js 初始化代码
function initThree() {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#eee')
  const canvas = document.querySelector('#three')
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  // 提高模型清晰度
  const stageContainer = canvas.parentElement;
  renderer.setSize(stageContainer.offsetWidth, stageContainer.offsetHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  )
  camera.position.set(0, 5, 15);


  const dracoLoader = new DRACOLoader()
  dracoLoader.setDecoderPath('/draco/') 
  const gltfLoader = new GLTFLoader()
  gltfLoader.setDRACOLoader(dracoLoader)
  gltfLoader.load(
    'https://cdn.jsdelivr.net/gh/lujiuj/hm-cdn-assents/model/addw.glb', 
    (gltf) => {
      console.log('模型加载成功：', gltf.scene);
      const model = gltf.scene;
      scene.add(model);
    },
    (xhr) => {
      console.log(`加载进度：${(xhr.loaded / xhr.total) * 100}%`);
    },
    (error) => {
      console.error('模型加载失败：', error);
    }
  );

  function animate() {
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.zoomSpeed = 0.005;
    controls.minDistance = 50;
    controls.maxDistance = 85;
    controls.enableRotate = false;
    controls.enableDamping = true
    controls.update()
    renderer.render(scene, camera)
    requestAnimationFrame(animate)
  }
  animate()
}

// 获取路由实例
const router = useRouter();
const gotoHome = () => {
  router.push("/");
};

// 连接Socket.IO服务器
const inputMessage = ref('');
const messageList = ref([]);
let socket = null;

// 初始化连接
onMounted(() => {
  initThree();
  
  // 连接后端Socket服务
  socket = io('https://hmx1-backend.onrender.com', {
    autoConnect: false, 
    reconnection: true, 
    reconnectionAttempts: 5
  });

  // socket = io('http://localhost:3000', {
  //   autoConnect: false, 
  //   reconnection: true, 
  //   reconnectionAttempts: 5
  // });
  // 建立连接
  socket.connect();

  // 监听连接成功事件
  socket.on('connect', () => {
    console.log('Socket连接成功，ID:', socket.id);
  });

  // 监听后端发送的消息
  socket.on('chatMessage', (data) => {
    // 忽略自己的信息
    const lastMessage = messageList.value[messageList.value.length - 1];
    if (lastMessage && lastMessage.content === data && lastMessage.isSelf) {
      return;
    }
    
    messageList.value.push({
      id: Date.now(),
      content: data,
      isSelf: false
    });
  });

  // 监听连接错误
  socket.on('connect_error', (err) => {
    console.error('连接失败:', err);
  });
});

// 发送消息
const sendMessage = () => {
  if (!inputMessage.value.trim() || !socket) return;
  
  // 添加自己的消息
  const newMessage = {
    id: Date.now(),
    content: inputMessage.value,
    isSelf: true
  };
  messageList.value.push(newMessage);
  
  // 发送到服务器
  socket.emit('sendMessage', inputMessage.value);
  inputMessage.value = '';
};

// 组件卸载时断开连接
onUnmounted(() => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
});
</script>

<style scoped>
#three {
  width: 100%;
  height: 100%;
  display: block;
}

.w-body {
  height: 100vh;
  width: 100vw;
  background: white;
}

.w-mix {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  position: relative;
}

#return{
  position: fixed;
  left: 0;
  top:0;
  width: 100px;
  height:100px;
  background: url('https://cdn.jsdelivr.net/gh/lujiuj/hm-cdn-assents/assets/icon/return_icon.png') no-repeat;
  background-position: center;
  background-size:contain; 
  z-index: 100;
}

/* 视频区域 */
.video-show{
  top: 15%;
  left: 50%;
  transform: translate(-50%, -50%); 
  z-index: 10; 
  width: auto; 
  height: auto;
  position: absolute;
}

/* 底部悬浮视频控制菜单栏 */
.bottom-video-controls {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: url('https://cdn.jsdelivr.net/gh/lujiuj/hm-cdn-assents/assets/backgrounds/background1.png');
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255, 215, 0, 0.3);
  z-index: 50;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.bottom-video-controls.expanded {
  height: 350px;

}

/* 上拉箭头手柄 */
.pull-handle {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 20px;
  background: rgba(255, 215, 0, 0.1);
  border-radius: 0 0 15px 15px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-top: none;
}

.pull-handle:hover {
  background: rgba(255, 215, 0, 0.2);
}

.arrow-icon {
  color: #ffd700;
  font-size: 16px;
  transition: transform 0.3s ease;
}

.bottom-video-controls.expanded .arrow-icon {
  transform: rotate(180deg);
}

.handle-text {
  color: #f7a41e;
  font-size: 12px;
  font-weight: 500;
}

/* 菜单内容 */
.controls-content {
  padding: 70px 20px 20px 20px;
  background: url('https://cdn.jsdelivr.net/gh/lujiuj/hm-cdn-assents/assets/backgrounds/background1.png');
  height: calc(100% - 60px);
  display: flex;
  gap: 30px;
  opacity: 0;
  transition: opacity 0.3s ease 0.1s;
}

.bottom-video-controls.expanded .controls-content {
  opacity: 1;
}

.now-playing {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 15px;
}

.playing-label {
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.video-title {
  color: #ffd700;
  font-size: 24px;
  margin: 5px 0;
  font-weight: bold;
}

.video-meta {
  display: flex;
  gap: 15px;
}

.meta-item {
  font-size: 12px;
  opacity: 0.8;
}

.video-description p {
  font-size: 14px;
  line-height: 1.5;
  margin: 0 0 10px 0;
  opacity: 0.9;
}

.video-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  background: rgba(255, 215, 0, 0.2);
  color: #ffd700;
  padding: 4px 12px;
  border-radius: 15px;
  font-size: 12px;
  border: 1px solid rgba(255, 215, 0, 0.4);
}

/* 视频切换菜单 */
.video-menu {
  flex: 2;
  border-radius: 10px;
  padding: 15px;
  max-height: 250px;
  overflow-y: auto;
}

.menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.menu-header h4 {
  color: #ffd700;
  margin: 0;
  font-size: 16px;
}

.menu-count {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
}

.video-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.video-card {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0.05);
}

.video-card:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
  border-color: rgba(255, 215, 0, 0.3);
}

.video-card.active {
  background: rgba(255, 215, 0, 0.15);
  border-color: rgba(255, 215, 0, 0.5);
}

.card-thumb {
  position: relative;
  width: 50px;
  height: 50px;
  border-radius: 8px;
  background: linear-gradient(135deg, #8B4513, #A0522D);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  flex-shrink: 0;
}

.thumb-placeholder {
  color: white;
  font-weight: bold;
  font-size: 18px;
}

.playing-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background: #ff6b6b;
  color: white;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 10px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.playing-pulse {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: white;
  animation: pulse 1.5s infinite;
}

.card-content {
  flex: 1;
  min-width: 0;
}

.card-title {
  color: white;
  font-weight: bold;
  font-size: 14px;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-meta {
  display: flex;
  gap: 8px;
  margin-bottom: 2px;
}

.duration, .year {
  color: rgba(255, 255, 255, 0.7);
  font-size: 11px;
}

.card-performers {
  color: rgba(255, 255, 255, 0.6);
  font-size: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 滚动条样式 */
.video-menu::-webkit-scrollbar {
  width: 6px;
}

.video-menu::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.video-menu::-webkit-scrollbar-thumb {
  background: rgba(255, 215, 0, 0.5);
  border-radius: 3px;
}

.video-menu::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 215, 0, 0.7);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* 聊天框头部当前视频信息 */
.chat-header .current-video {
  font-size: 12px;
  opacity: 0.8;
  margin-left: 10px;
  font-style: italic;
}

/* 聊天消息样式 */
#messages {
  height: 300px;
  overflow-y: auto;
  padding: 15px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  margin-bottom: 15px;
}

/* 通用消息项样式 */
.message-item {
  margin-bottom: 12px;
  display: flex;
  animation: fadeIn 0.3s ease;
}

/* 自己的消息样式 */
.self-message {
  justify-content: flex-end;
}

/* 他人的消息样式 */
.other-message {
  justify-content: flex-start;
}

/* 消息内容样式 */
.message-content {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 18px;
  word-wrap: break-word;
  line-height: 1.4;
  position: relative;
}

/* 自己的消息内容样式 */
.self-message .message-content {
  background: #4a90e2;
  color: white;
  border-bottom-right-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

/* 他人的消息内容样式 */
.other-message .message-content {
  background: white;
  color: #333;
  border-bottom-left-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 消息动画 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 聊天输入区域样式 */
.container {
  display: flex;
  gap: 10px;
  padding: 0 15px 15px;
}

.input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #ddd;
  border-radius: 24px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.3s ease;
}

.input:focus {
  border-color: #4a90e2;
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
}

#button {
  background: #4a90e2;
  color: white;
  border: none;
  border-radius: 50%;
  width: 48px;
  height: 48px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  outline: none;
}

#button:hover {
  background: #357abd;
  transform: scale(1.05);
}

/* 戏台区域 */
.stage {
  width: 100%;
  height: 100%;
  background: #1a1a1a; 
  position: relative;
}

/* 聊天框容器（悬浮可收缩） */
.chatroom-wrapper {
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  display: flex;
  z-index: 20;
  transition: all 0.3s ease;
}

/* 收缩状态 */
.chatroom-collapsed .chatroom {
  width: 0;
  overflow: hidden;
}

/* 收缩/展开按钮 */
.toggle-btn {
  width: 30px;
  height: 60px;
  background: rgb(245, 148, 58);
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-size: 18px;
  border-radius: 6px 0 0 6px;
  z-index: 30;
  transition: background 0.2s;
}

.toggle-btn:hover {
  background: #555;
}

/* 聊天框主体 */
.chatroom {
  width: 300px;
  height: 80%;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  flex-direction: column;
  box-shadow: -2px 0 10px rgba(255, 255, 255, 0.2);
}

/* 聊天框头部 */
.chat-header {
  padding: 12px 20px;
  height: 10%;
  background: rgb(185, 121, 79);
  color: white;
  font-size: 16px;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* 消息列表 */
#messages {
  list-style-type: none;
  margin: 0;
  padding: 20px;
  flex-grow: 1;
  overflow-y: auto;
  background: url('https://cdn.jsdelivr.net/gh/lujiuj/hm-cdn-assents/assets/backgrounds/face.jpg');
  background-size: cover;
  opacity: 0.5;
}

.message-item {
  padding: 8px 12px;
  margin-bottom: 10px;
  border-radius: 8px;
  
  color:rgb(36, 2, 2);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  max-width: 80%;
}

/* 输入框区域 */
.container {
  position: relative;
  background: linear-gradient(135deg, rgb(255, 166, 33) 0%, rgb(237, 72, 17) 100%);
  border-radius: 5px;
  padding: 10px;
  place-content: center;
  z-index: 0;
  width:100%;
}

.form {
  position: relative;
  width: 100%;
  border-radius: 5px;
  background: linear-gradient(135deg, rgb(250, 208, 102) 0%, rgb(210, 241, 176) 100%);
  padding: 5px;
  display: flex;
  /* align-items: ; */
}

.form::after, .form::before {
  content: "";
  width: 100%;
  height: 100%;
  border-radius: inherit;
  position: absolute;
}

.form::before {
  top: -1px;
  left: -1px;
  background: linear-gradient(0deg, rgb(225, 240, 168) 0%, rgb(255, 255, 255) 100%);
  z-index: -1;
}

.form::after {
  bottom: -1px;
  right: -1px;
  background: linear-gradient(0deg, rgb(215, 255, 163) 0%, rgb(211, 232, 255) 100%);
  box-shadow: rgba(79, 156, 232, 0.7019607843) 3px 3px 5px 0px, rgba(79, 156, 232, 0.7019607843) 5px 5px 20px 0px;
  z-index: -2;
}

.input {
  padding: 10px;
  width: 100%;
  background: linear-gradient(135deg, rgb(239, 236, 167) 0%, rgb(255, 255, 255) 100%);
  border: none;
  color: #9EBCD9;
  font-size: 20px;
  border-radius: 5px;
}

.input:focus {
  outline: none;
  background: white;
}

#button {
  background: url('https://cdn.jsdelivr.net/gh/lujiuj/hm-cdn-assents/assets/icon/send.webp');
  background-size: cover;
  background-position: center;
  width:10px;
  margin-right: 50px;
  margin-left: 10px;
}

</style>