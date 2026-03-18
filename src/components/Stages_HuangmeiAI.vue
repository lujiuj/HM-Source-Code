<template>
  <div class="stages-container">
    <canvas id="three"></canvas>
    <header class="header">
      <h1>《{{ dramaName }}》 互动剧场</h1>
      <p>你的角色是{{ roleName }}</p>
      <span class="opponent-status" :class="{ online: opponentOnline }">
          {{ opponentName }} {{ opponentOnline ? '在线' : '离线' }}
        </span>
    </header>

    <div class="controls">
      <div class="audio-controls">
        <input id="audioToggle" type="checkbox" class="toggleInput" v-model="ttsEnabled">
        <label title="配音开关" class="toggleSwitch" for="audioToggle"></label>
      </div>
    </div>
    <div class="play-container">
      <div class="chatting-role"></div>
      <main class="frame" ref="frame">
        <section class="stage-info">
          <div class="progress">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
            </div>
            <span class="progress-text">进度：{{ progressPercent }}%</span>
          </div>
          <div v-if="waitingForOpponent" class="waiting-indicator">
            <span class="loading-dots">等待对方选择中</span>
          </div>
        </section>

        <section class="dialogues" ref="dialoguesRef">
          <TransitionGroup name="dialogue">
            <div
              v-for="(node, idx) in timeline"
              :key="node.id + '_' + idx"
              :class="[
                'dialogue-card', 
                node.type, 
                { 
                  'my-turn': node.speaker === roleName,
                  'opponent-turn': node.speaker === opponentRole,
                  'is-choice': node.isChoice
                }
              ]"
            >
              <div class="text">
                <div class="who">
                  {{ node.speaker }}
                  <span v-if="node.speaker === roleName" class="you-tag">你</span>
                </div>
                <div class="line" v-html="formatText(node.text)"></div>
                <div v-if="node.note" class="note">{{ node.note }}</div>
              </div>
            </div>
          </TransitionGroup>
          <section class="interaction">
          <!-- 我的回合，显示选择按钮 -->
          <div v-if="showChoices && isMyTurn" class="choices">
            <div class="choices-header">请选择你的回应：</div>
            <ul>
              <li
                v-for="(c, i) in currentChoices"
                :key="i"
                :class="['choice', { disabled: c.disabled }]"
              >
                <button 
                  @click="selectChoice(i)" 
                  :disabled="c.disabled || isProcessing"
                  class="choice-btn"
                >
                  <span class="choice-number">{{ i + 1 }}</span>
                  <span class="choice-text">{{ c.text }}</span>
                </button>
              </li>
            </ul>
          </div>
          
          <!-- 对方回合，显示等待提示 -->
          <div v-else-if="showChoices && !isMyTurn" class="waiting-choices">
            <div class="waiting-animation">
              <div class="dot"></div>
              <div class="dot"></div>
              <div class="dot"></div>
            </div>
            <p>等待 <strong>{{ currentNode?.speaker }}</strong> 做出选择...</p>
          </div>

          <!-- 自动播放中 -->
          <div v-else-if="isProcessing && !ended" class="auto-playing">
            <p>剧情进行中...</p>
          </div>
        </section>
        </section>

        

        <!-- 结束画面 -->
        <Transition name="fade">
          <section class="end-screen" v-if="ended">
            <!-- Peach Blossom Decorations -->
            <div v-for="i in 20" :key="i" class="peach-blossom" :style="{ left: Math.random() * 100 + '%', animationDelay: Math.random() * 10 + 's' }"></div>
            
            <div class="end-content">
              <h2>终章</h2>
              <p class="end-message">{{ endMessage }}</p>
              <div class="end-stats">
                <div class="stat">
                  <span class="stat-label">演出时长</span>
                  <span class="stat-value">{{ performanceDuration }}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">选择次数</span>
                  <span class="stat-value">{{ choiceCount }} 次</span>
                </div>
              </div>
              <div class="ending-actions">
                <button class="btn btn-primary" @click="restart">
                  重新开始
                </button>
                <button class="btn btn-secondary" @click="goToSceneList">
                  退出演绎
                </button>
              </div>
            </div>
          </section>
        </Transition>
      </main>
      <div class="self-role"></div>
    </div>
    
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { matchService } from '../config/matchService';
import { scenes, getSceneById } from '../config/sceneList';
import * as THREE from 'three';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

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
    controls.minDistance = 90;
    controls.maxDistance = 90;
    controls.enableRotate = false;
    controls.enableDamping = true
    controls.update()
    renderer.render(scene, camera)
    requestAnimationFrame(animate)
  }
  animate()
}
// -----------------------------
// Props & Emits
// -----------------------------
const props = defineProps({
  mode: {
    type: Boolean,
    required: true 
  },
  drama: {
    type: Object,
    default: () => ({})
  },
  role: {
    type: Object,
    default: () => ({})
  },
  roomId: {
    type: String,
    default: ''
  },
  matchData: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['goToSceneList', 'restart']);

// -----------------------------
// 响应式状态
// -----------------------------
const timeline = reactive([]);
const nodeMap = reactive({});
const activeSceneNodes = ref([]);
const playedLines = ref(0);
const currentNode = ref(null);
const currentNodeId = ref(null);
const ended = ref(false);
const ttsEnabled = ref(true);
const voicesLoaded = ref(false);
const isProcessing = ref(false);
const waitingForOpponent = ref(false);
const dialoguesRef = ref(null);
const startTime = ref(Date.now());
const choiceCount = ref(0);
const isSceneInitialized = ref(false);

// 对手信息
const opponentOnline = ref(false);
const opponentName = ref('对方');
const opponentRole = ref('');

// Firebase 监听取消函数
const unsubscribeMatch = ref(null);

// -----------------------------
// 计算属性
// -----------------------------
const totalLines = computed(() => activeSceneNodes.value.length);

const progressPercent = computed(() => {
  if (totalLines.value === 0) return 0;
  return Math.min(100, Math.round((playedLines.value / totalLines.value) * 100));
});

const dramaName = computed(() => props.drama?.name || '未知剧目');
const roleName = computed(() => props.role?.name || '未知角色');
const roomId = computed(() => props.roomId || 'default-room');

// 判断当前是否是我的回合
const isMyTurn = computed(() => {
  if (!currentNode.value) return false;
  return currentNode.value.speaker === roleName.value;
});

// 显示选择按钮的条件
const showChoices = computed(() => {
  return currentNode.value && 
         currentNode.value.choices && 
         currentNode.value.choices.length > 0 && 
         !ended.value &&
         !isProcessing.value;
});

const currentChoices = computed(() => {
  if (!currentNode.value || !currentNode.value.choices) return [];
  return currentNode.value.choices;
});

const endMessage = computed(() => {
  const lastNode = timeline[timeline.length - 1];
  return lastNode?.text || '感谢您的精彩演绎！';
});

const performanceDuration = computed(() => {
  const duration = Math.floor((Date.now() - startTime.value) / 1000);
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  return `${minutes}分${seconds}秒`;
});

// -----------------------------
// 监听器
// -----------------------------
watch(
  () => props.drama,
  (newDrama) => {
    if (newDrama && newDrama.id) {
      // 剧目变化时初始化
      if (!isSceneInitialized.value || newDrama.id !== currentDramaId.value) {
        initScene(newDrama.id);
        isSceneInitialized.value = true;
      }
    }
  },
  { immediate: true }
);

watch(
  () => props.matchData,
  (newMatch) => {
    if (newMatch && !props.mode) {
      updateFromMatchData(newMatch);
    }
  },
  { deep: true }
);

// -----------------------------
// 生命周期
// -----------------------------
onMounted(() => {
  loadVoices();
  initThree();
  startTime.value = Date.now();
  
  // 双人模式下初始化 Firebase 监听
  if (!props.mode && props.roomId) {
    initMultiplayerSync();
  }

  // 初始化对手信息
  if (props.matchData) {
    initOpponentInfo();
  }
  console.log('进入演绎')
});

onUnmounted(() => {
  // 清理监听
  if (unsubscribeMatch.value) {
    unsubscribeMatch.value();
  }
  
  // 取消 TTS
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
});

// -----------------------------
// 初始化对手信息
// -----------------------------
function initOpponentInfo() {
  console.log('初始化对手')
  if (!props.matchData || props.mode) return;
 
  const match = props.matchData;
  const myId = props.role?.id;
  console.log("matchData为："+match);
  
  if (match.players && match.playerNames && match.playerRoles) {
    const opponentId = match.players.find(p => p !== myId);
    if (opponentId) {
      opponentName.value = match.playerNames[opponentId] || '对方';
      opponentRole.value = match.playerRoles[opponentId] || '';
    }
  }
  console.log(opponentRole.value);
}

// -----------------------------
// 初始化多人同步
// -----------------------------
function initMultiplayerSync() {
  if (!props.roomId) return;

  unsubscribeMatch.value = matchService.listenToMatch(props.roomId, (matchData) => {
    if (matchData) {
      handleMatchUpdate(matchData,true);   // 实时更新
    }
  });
}

// -----------------------------
// 处理匹配数据更新
// -----------------------------
function handleMatchUpdate(matchData,isFromFirebaseUpdate=false) {
  // 更新对手在线状态
  const myId = props.role?.id;
  const opponentId = matchData.players?.find(p => p !== myId);
  console.log('handleMatchUpdate:'+opponentId);
  opponentOnline.value = true;
  updateFromMatchData(matchData, isFromFirebaseUpdate);  // 
  if (matchData.performance) {
    // 处理对方的选择
    const lastChoice = matchData.performance.lastChoice;
    if (lastChoice && lastChoice.playerId !== myId) {
      if (lastChoice.nodeId === currentNodeId.value && waitingForOpponent.value) {
        // 延时确定
        setTimeout(() => {
          // 再次检查状态
          if (waitingForOpponent.value && currentNodeId.value === lastChoice.nodeId) {
            executeChoice(lastChoice.choiceIndex, false);
          } else {
            console.log('状态已变更，跳过对方选择处理');
          }
        }, 300);
      }
    }
  }
}

// -----------------------------
// 从匹配数据更新状态
// -----------------------------
function updateFromMatchData(matchData, isFromFirebaseUpdate = false) {
  if (!matchData || !matchData.performance) return;
  
  const serverTimeline = matchData.performance.timeline || [];
  const serverNodeId = matchData.performance.currentNodeId;
  
  // 1：本地时间线为空，完全同步
  if (timeline.length === 0 && serverTimeline.length > 0) {
    console.log('初始同步：从服务器恢复时间线');
    timeline.splice(0, timeline.length, ...serverTimeline);
    
    if (serverNodeId) {
      const node = nodeMap[serverNodeId];
      if (node) {
        currentNode.value = node;
        currentNodeId.value = serverNodeId;
        playedLines.value = serverTimeline.length;
        
        // 如果是对手回合，设置等待状态
        if (node.speaker !== roleName.value && node.choices?.length > 0) {
          waitingForOpponent.value = true;
        }
      }
    }
    return;
  }
  
  // 2：增量同步
  if (isFromFirebaseUpdate && serverTimeline.length > timeline.length) {
    console.log('增量同步：从', timeline.length, '到', serverTimeline.length);
    
    // 只添加缺失的部分
    const newNodes = serverTimeline.slice(timeline.length);
    timeline.push(...newNodes);
    playedLines.value = serverTimeline.length;
    
    // 更新当前节点
    if (serverNodeId && serverNodeId !== currentNodeId.value) {
      const node = nodeMap[serverNodeId];
      if (node) {
        currentNode.value = node;
        currentNodeId.value = serverNodeId;
        
        // 处理对手的节点
        if (node.speaker !== roleName.value) {
          handleNode(node, true);  // 标记为来自对手同步
        }
      }
    }
  }
  
  // 3：处理对手的选择
  if (matchData.performance?.lastChoice) {
    const lastChoice = matchData.performance.lastChoice;
    const myId = props.role?.id;
    
    if (lastChoice.playerId !== myId && 
        lastChoice.nodeId === currentNodeId.value && 
        waitingForOpponent.value) {
      
      setTimeout(() => {
        if (waitingForOpponent.value && currentNodeId.value === lastChoice.nodeId) {
          executeChoice(lastChoice.choiceIndex, false);
        }
      }, 300);
    }
  }
}
// -----------------------------
// 初始化场景
// -----------------------------
function initScene(sceneId) {
  console.log('初始化场景')
  const scene = getSceneById(sceneId);
  if (!scene) {
    console.warn(`场景不存在: ${sceneId}`);
    return;
  }

  // 清理旧的节点映射
  Object.keys(nodeMap).forEach(key => delete nodeMap[key]);
  
  // 构建新的节点映射
  scene.nodes.forEach(n => {
    nodeMap[n.id] = n;
  });
  
  activeSceneNodes.value = scene.nodes;

  // 重置状态
  timeline.splice(0, timeline.length);
  playedLines.value = 0;
  ended.value = false;
  currentNode.value = null;
  currentNodeId.value = null;
  isProcessing.value = false;
  waitingForOpponent.value = false;
  choiceCount.value = 0;
  startTime.value = Date.now();

  // 开始剧本
  const startNode = nodeMap['start'];
  if (startNode) {
    advanceToNode('start');
  }
}

// -----------------------------
// 推进到指定节点
// -----------------------------
function advanceToNode(nodeId,isFromOpponentSync = false) {
  const node = nodeMap[nodeId];
  if (!node) {
    console.error(`节点不存在: ${nodeId}`);
    return;
  }

  isProcessing.value = true;
  currentNodeId.value = nodeId;
// 检查重复添加
  const alreadyInTimeline = timeline.some(item => item.id === node.id);

  // 将节点添加到时间线
  if ((node.type !== 'start' || node.text) && !alreadyInTimeline) {
    const timelineEntry = { 
      ...node, 
      timestamp: Date.now(),
      id: node.id
    };
    timeline.push(timelineEntry);
    playedLines.value++;

    // 双人模式同步进度
    if (!props.mode && props.roomId && !isFromOpponentSync) {
      console.log('本地操作，同步到服务器')
      matchService.syncProgress(props.roomId, nodeId, timeline);
    } else if (isFromOpponentSync) {
      console.log('来自对手同步，不重复同步')
    }
  }else if (alreadyInTimeline) {
    console.log('节点已存在于时间线，跳过添加:', node.id);
  }

  // 播放 TTS
  if (ttsEnabled.value && node.text && node.speaker !== '系统' && !isFromOpponentSync) {
    speakText(node.text, node.speaker);
  }
  // 处理不同类型的节点
  handleNode(node,isFromOpponentSync);

  // 滚动到底部
  scrollToBottom();
}

// -----------------------------
// 处理节点逻辑
// -----------------------------
function handleNode(node,isFromOpponentSync = false) {
  switch (node.type) {
    case 'start':
      currentNode.value = null;
      isProcessing.value = false;
      if (node.next) {
        setTimeout(() => advanceToNode(node.next,isFromOpponentSync), 500);
      }
      break;

    case 'end':
      ended.value = true;
      currentNode.value = null;
      isProcessing.value = false;
      
      // 双人模式通知结束
      if (!props.mode && props.roomId) {
        matchService.endPerformance(props.roomId);
      }
      break;

    case 'narration':
    case 'aside':
      currentNode.value = node;
      isProcessing.value = false;
      if (node.next) {
        setTimeout(() => advanceToNode(node.next), getReadingDelay(node.text));
      }
      break;

    case 'dialogue':
    case 'choice':
    default:
      currentNode.value = node;
      isProcessing.value = false;
      
      if (node.choices && node.choices.length > 0) {
        handleChoiceNode(node);
      } else {
        if (node.next) {
          setTimeout(() => advanceToNode(node.next), getReadingDelay(node.text));
        }
      }
      break;
  }
}

// -----------------------------
// 处理选择节点
// -----------------------------
function handleChoiceNode(node) {
  const speaker = node.speaker;
  const isMySpeaker = speaker === roleName.value;
  console.log('当前说话者：'+speaker);
  console.log('你的身份是：'+roleName.value);

  if (props.mode) {
    // 单人模式
    if (isMySpeaker) {
      waitingForOpponent.value = false;
    } else {
      // AI 自动选择
      waitingForOpponent.value = false;
      setTimeout(() => {
        const availableChoices = node.choices.filter(c => !c.disabled);
        if (availableChoices.length > 0) {
          // 随机选择
          const randomIndex = Math.floor(Math.random() * availableChoices.length);
          const choiceIndex = node.choices.indexOf(availableChoices[randomIndex]);
          executeChoice(choiceIndex, false);
        }
      }, 1500);
    }
  } else {
    // 双人模式
    console.log('进入双人模式节点选择：'+isMySpeaker)
    if (isMySpeaker) {
      waitingForOpponent.value = false;
      
      // 通知服务器等待我的选择
      const myId = props.role?.id;
      if (myId) {
        matchService.updateWaitingFor(props.roomId, myId);
      }
    } else {
      waitingForOpponent.value = true;
    }
  }
}

// -----------------------------
// 用户选择处理
// -----------------------------
function selectChoice(index) {
  if (isProcessing.value) return;
  if (!currentNode.value || !currentNode.value.choices) return;
  
  const choice = currentNode.value.choices[index];
  if (!choice || choice.disabled) return;

  if (!isMyTurn.value && !props.mode) {
    console.warn('不是你的回合');
    return;
  }

  // 双人模式同步选择
  if (!props.mode && props.roomId) {
    matchService.submitChoice(props.roomId, currentNodeId.value, index);
  }

  executeChoice(index, true);
}

// -----------------------------
// 执行选择
// -----------------------------
function executeChoice(index, isMyChoice = true) {
  if (!currentNode.value || !currentNode.value.choices) return;
  
  const choice = currentNode.value.choices[index];
  if (!choice) return;
  waitingForOpponent.value = false;  // 先重置等待状态
  isProcessing.value = true;
  choiceCount.value++;

  // 添加选择结果到时间线
  timeline.push({
    id: `choice_${Date.now()}`,
    type: 'choice-result',
    speaker: currentNode.value.speaker,
    text: choice.text,
    isChoice: true,
    timestamp: Date.now()
  });

  // 推进到下一个节点
  const nextNodeId = choice.next;
  if (nextNodeId && nodeMap[nextNodeId]) {
    setTimeout(() => {
      advanceToNode(nextNodeId);
    }, 800);
  } else {
    console.error(`选择的下一个节点不存在: ${nextNodeId}`);
    isProcessing.value = false;
  }
}

// -----------------------------
// 辅助函数
// -----------------------------
function scrollToBottom() {
  nextTick(() => {
    if (dialoguesRef.value) {
      dialoguesRef.value.scrollTo({
        top: dialoguesRef.value.scrollHeight,
        behavior: 'smooth'
      });
    }
  });
}

function getReadingDelay(text) {
  if (!text) return 1000;
  const delay = Math.min(5000, Math.max(1500, text.length * 80));
  return delay;
}

function loadVoices() {
  if ('speechSynthesis' in window) {
    const loadVoicesHandler = () => {
      const voices = window.speechSynthesis.getVoices();
      voicesLoaded.value = voices.length > 0;
    };
    
    loadVoicesHandler();
    window.speechSynthesis.onvoiceschanged = loadVoicesHandler;
  }
}

function speakText(text, speaker) {
  if (!ttsEnabled.value || !('speechSynthesis' in window)) return;

  window.speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'zh-CN';
  utterance.rate = 0.85;
  utterance.pitch = speaker === '旁白' ? 0.9 : 1.0;
  
  const voices = window.speechSynthesis.getVoices();
  const chineseVoices = voices.filter(v => v.lang.includes('zh'));
  if (chineseVoices.length > 0) {
    utterance.voice = chineseVoices[0];
  }

  window.speechSynthesis.speak(utterance);
}

function hasAvatar(speaker) {
  // 检查是否有对应的头像文件
  return ['梁山伯', '祝英台', '董永', '七仙女', '冯素贞', '李兆廷'].includes(speaker);
}

function formatText(text) {
  if (!text) return '';
  // 处理括号内的动作描述
  return text.replace(/（([^）]+)）/g, '<span class="action">（$1）</span>');
}

// -----------------------------
// 操作按钮
// -----------------------------
function restart() {
  if (props.drama?.id) {
    initScene(props.drama.id);
  }
  emit('restart');
}

// 回到场景列表
const goToSceneList = () => {
  emit('return');
};

</script>

<style scoped>
.stages-container {
  max-width: 100%;
  margin: 0 auto;
  font-family: "Microsoft YaHei", sans-serif;
  color: #222;
  position: relative;
  background: black;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06);
  z-index: 1;
}

#three {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1; 
  pointer-events: none; 
}


.header {
  padding: 12px 16px;
  /* background: url('../assets/backgrounds/wood.png'); */
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  border-radius: 10px;
  margin-bottom: 16px;
}

.header h1 {
  font-size: 20px;
  margin-bottom: 6px;
}

.header p {
  margin: 0;
  font-size: 14px;
  color: #555;
}

.meta {
  font-size: 12px;
  color: #333;
}

/* Hide the default checkbox */
.toggleInput {
  display: none;
}

/* Toggle switch styling */
.toggleSwitch {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 90px;
  height: 30px;
  background-color: rgb(206, 206, 206);
  border-radius: 40px;
  cursor: pointer;
  transition-duration: .3s;
}

/* The circle inside the toggle */
.toggleSwitch::after {
  content: "";
  position: absolute;
  height: 30px;
  width: 50%;
  left: 0;
  background: conic-gradient(rgba(26, 26, 26, 0.555), white, rgba(26, 26, 26, 0.555), white, rgba(26, 26, 26, 0.555));
  border-radius: 40px;
  transition-duration: .3s;
  box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.281);
}

/* When the toggle is checked, move the circle to the right */
.toggleInput:checked + .toggleSwitch::after {
  transform: translateX(100%);
  transition-duration: .3s;
}

/* Change background color of the toggle switch when checked */
.toggleInput:checked + .toggleSwitch {
  background-color: rgb(124, 173, 206);
  transition-duration: .3s;
}

/* Button Styling */
.audio-controls .btn {
  font-size: 14px;
  padding: 10px 20px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.audio-controls .btn:hover {
  background-color: #c97c17;
}



.role-name {
  color: #ffd700;
  font-weight: bold;
}

.mode-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.opponent-status {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  background: #666;
}

.opponent-status.online {
  background: #4caf50;
}

/* Controls */
.controls {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}

.audio-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toggleInput {
  display: none;
}

.toggleSwitch {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 60px;
  height: 28px;
  background-color: #ccc;
  border-radius: 30px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.toggleSwitch::after {
  content: "";
  position: absolute;
  height: 22px;
  width: 22px;
  left: 3px;
  background: white;
  border-radius: 50%;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toggleInput:checked + .toggleSwitch {
  background-color: #4caf50;
}

.toggleInput:checked + .toggleSwitch::after {
  transform: translateX(32px);
}

.toggle-label {
  font-size: 14px;
  color: #666;
}

/* Frame */
.play-container{
  display: flex;
  flex-direction: row;
}
.frame {
  /* background: url('../assets/backgrounds/talk-back.png') no-repeat; */
  /* background-size:cover; */
  opacity: 0.8;
  border-radius: 12px;
  padding: 20px;
  min-height: 500px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}
.chatting-role {
  width:20%;
  background: url('https://cdn.jsdelivr.net/gh/lujiuj/hm-cdn-assents/assets/performers/lsb.png') no-repeat;
  background-size: cover;
  /* align-items: left; */
  margin-left: 20px;
  height: 500px;
}

.self-role {
  width:25%;
  background: url('https://cdn.jsdelivr.net/gh/lujiuj/hm-cdn-assents/assets/performers/zyt.png') no-repeat;
  background-size: cover;
  /* margin-right:  */
  height: 500px;
}

/* Stage Info */
.stage-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #eee;
}

.progress {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.progress-bar {
  width: 150px;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #eaa166 0%, #a25b4b 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 13px;
  color: rgb(255, 255, 255);
}

.waiting-indicator {
  color: #e67e22;
  font-size: 14px;
}

.loading-dots::after {
  content: '';
  animation: dots 1.5s infinite;
}

@keyframes dots {
  0%, 20% { content: ''; }
  40% { content: '.'; }
  60% { content: '..'; }
  80%, 100% { content: '...'; }
}

/* Dialogues */
.dialogues {
  max-height: 450px;
  width:100%;
  overflow-y: auto;
  margin-bottom: 20px;
  /* padding-right: 8px; */
  scroll-behavior: smooth;
}

.dialogues::-webkit-scrollbar {
  width: 6px;
}

.dialogues::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.dialogues::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

/* Dialogue Card */
.dialogue-card {
  position: relative;
  max-width: 80%;
  padding: 16px 20px;
  margin-bottom: 18px;
  border-radius: 20px;
  transition: all 0.4s ease;
  word-wrap: break-word;
  border: 2px solid #d4af37;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  background: rgba(255, 255, 255, 0.95);
  background-image: 
    linear-gradient(45deg, rgba(212, 175, 55, 0.1) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(212, 175, 55, 0.1) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(212, 175, 55, 0.1) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(212, 175, 55, 0.1) 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
}

.dialogue-card.my-turn {
  background: linear-gradient(135deg, #f9f2d6 0%, #f5e8b0 100%);
  margin-left: auto;
  border-bottom-right-radius: 4px;
  border-color: #c8a332;
}

.dialogue-card.opponent-turn {
  background: linear-gradient(135deg, #e8f4f8 0%, #d1e7f0 100%);
  margin-right: auto;
  border-bottom-left-radius: 4px;
  border-color: #3a7ca5;
}

.dialogue-card.narration,
.dialogue-card.aside {
  background: linear-gradient(135deg, #f8f0d9 0%, #f0e6c5 100%);
  font-style: italic;
  margin: 0 auto;
  max-width: 90%;
  border-radius: 20px;
  border-color: #b8860b;
}

.dialogue-card.is-choice {
  background: linear-gradient(135deg, #f5e6f0 0%, #e8d0e0 100%);
  margin: 0 auto;
  max-width: 90%;
  border-radius: 20px;
  border-color: #a67c9b;
}

.dialogue-card.choice-result {
  background: #f0e6d2;
  padding: 12px 18px;
  font-size: 14px;
  margin: 0 auto;
  max-width: 90%;
  border-radius: 20px;
  border-color: #d4af37;
}

/* Dialogue Tail */
.dialogue-card.my-turn::after {
  content: '';
  position: absolute;
  bottom: 0;
  right: -10px;
  width: 0;
  height: 0;
  border-left: 10px solid #f5e8b0;
  border-top: 10px solid transparent;
  border-bottom: 10px solid transparent;
}

.dialogue-card.opponent-turn::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: -10px;
  width: 0;
  height: 0;
  border-right: 10px solid #d1e7f0;
  border-top: 10px solid transparent;
  border-bottom: 10px solid transparent;
}

/* Text */
.text {
  width: 100%;
}

.who {
  font-weight: bold;
  color: #8b4513;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: "STKaiti", "KaiTi", serif;
  font-size: 16px;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
}

.you-tag {
  font-size: 12px;
  padding: 2px 8px;
  background: linear-gradient(135deg, #d4af37 0%, #b8860b 100%);
  color: white;
  border-radius: 12px;
  font-weight: normal;
  font-family: "STKaiti", "KaiTi", serif;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.line {
  color: #5d4037;
  line-height: 1.8;
  word-wrap: break-word;
  font-family: "STSong", "SimSun", serif;
  font-size: 15px;
}

.line :deep(.action) {
  color: #8b4513;
  font-style: italic;
  font-size: 14px;
}

.note {
  margin-top: 10px;
  font-size: 13px;
  color: #8b4513;
  font-style: italic;
  font-family: "STKaiti", "KaiTi", serif;
}

/* Transition */
.dialogue-enter-active {
  transition: all 0.6s ease-out;
}

.dialogue-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

.dialogue-leave-active {
  transition: all 0.3s ease-in;
}

.dialogue-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.9);
}

/* Interaction */
.interaction {
  margin-top: 20px;
}

.choices-header {
  font-size: 16px;
  color: #f5e8b0;
  margin-bottom: 16px;
  font-weight: 600;
  font-family: "STKaiti", "KaiTi", serif;
  text-align: center;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.choices ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.choice-btn {
  width: 100%;
  padding: 16px 24px;
  background: linear-gradient(135deg, #d4af37 0%, #b8860b 100%);
  color: #fff;
  border: 2px solid #996515;
  border-radius: 20px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 14px;
  text-align: left;
  font-family: "STSong", "SimSun", serif;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.choice-btn:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(212, 175, 55, 0.4);
  background: linear-gradient(135deg, #e6c74b 0%, #d4af37 100%);
}

.choice-btn:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 4px 8px rgba(212, 175, 55, 0.3);
}

.choice.disabled .choice-btn,
.choice-btn:disabled {
  background: #c4c4c4;
  border-color: #999;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.choice-number {
  width: 30px;
  height: 30px;
  background: rgba(255, 255, 255, 0.3);
  border: 2px solid rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  font-family: "STKaiti", "KaiTi", serif;
}

.choice-text {
  flex: 1;
  font-family: "STSong", "SimSun", serif;
  line-height: 1.6;
}

/* Waiting */
.waiting-choices {
  text-align: center;
  padding: 30px 20px;
  color: #f5e8b0;
  font-family: "STKaiti", "KaiTi", serif;
}

.waiting-animation {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 16px;
}

.waiting-animation .dot {
  width: 12px;
  height: 12px;
  background: linear-gradient(135deg, #d4af37 0%, #b8860b 100%);
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.waiting-animation .dot:nth-child(1) {
  animation-delay: -0.32s;
}

.waiting-animation .dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

.auto-playing {
  text-align: center;
  padding: 20px;
  color: #f5e8b0;
  font-style: italic;
  font-family: "STKaiti", "KaiTi", serif;
}

/* End Screen */
.end-screen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
}

.end-content {
  position: relative;

  padding: 60px 80px;
  text-align: center;
  max-width: 600px;
  width: 100%;
  border: 10px solid #8b4513;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  position: relative;
  overflow: hidden;
}

.end-content::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.85);
  z-index: 1;
}

.end-content > * {
  position: relative;
  z-index: 2;
}

.end-content::after {
  content: '古事';
  position: absolute;
  top: 20px;
  right: 30px;
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #8b0000 0%, #a0522d 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "STKaiti", "KaiTi", serif;
  font-size: 18px;
  font-weight: bold;
  z-index: 3;
}

.end-content h2 {
  font-size: 48px;
  color: #8b4513;
  margin-bottom: 30px;
  font-family: "STKaiti", "KaiTi", serif;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  letter-spacing: 10px;
}

.end-message {
  color: #5d4037;
  line-height: 1.8;
  margin-bottom: 40px;
  font-size: 18px;
  font-family: "STSong", "SimSun", serif;
  text-align: center;
}

.end-stats {
  display: flex;
  justify-content: center;
  gap: 60px;
  margin-bottom: 40px;
  position: relative;
}

.end-stats::after {
  content: '• • •';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #8b4513;
  font-size: 20px;
  font-family: "STKaiti", "KaiTi", serif;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 20px 30px;
  background: rgba(255, 255, 255, 0.9);
  border: 3px solid #8b4513;
  border-radius: 10px;
  position: relative;
  min-width: 120px;
}

.stat::before {
  content: '';
  position: absolute;
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 80%;
  height: 16px;
  background: #f0e6c5;
  border: 2px solid #8b4513;
  border-radius: 4px;
}

.stat-label {
  font-size: 16px;
  color: #8b4513;
  font-family: "STKaiti", "KaiTi", serif;
  font-weight: bold;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #8b4513;
  font-family: "STSong", "SimSun", serif;
}

.ending-actions {
  display: flex;
  gap: 40px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  padding: 16px 40px;
  border: 3px solid #8b4513;
  border-radius: 0;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: bold;
  font-family: "STKaiti", "KaiTi", serif;
  position: relative;
  min-width: 180px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.btn-primary {
  background: linear-gradient(135deg, #4b0082 0%, #8a2be2 100%);
  color: white;
  border-color: #4b0082;
}

.btn-primary:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(75, 0, 130, 0.5);
  background: linear-gradient(135deg, #6a0dad 0%, #9932cc 100%);
}

.btn-secondary {
  background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%);
  color: #8b4513;
  border-color: #8b4513;
}

.btn-secondary:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(139, 69, 19, 0.4);
  background: linear-gradient(135deg, #e0e0e0 0%, #d0d0d0 100%);
}

/* Peach Blossom Decoration */
.peach-blossom {
  position: absolute;
  width: 20px;
  height: 20px;
  background: pink;
  border-radius: 50% 0 50% 0;
  opacity: 0.7;
  animation: fall 10s linear infinite;
  z-index: 1;
}

@keyframes fall {
  0% {
    transform: translateY(-100%) rotate(0deg);
    opacity: 0;
  }
  10% {
    opacity: 0.7;
  }
  90% {
    opacity: 0.7;
  }
  100% {
    transform: translateY(100vh) rotate(360deg);
    opacity: 0;
  }
}

/* Fade Transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Mobile Responsive */
@media (max-width: 600px) {
  .stages-container {
    padding: 12px;
  }
  
  .header h1 {
    font-size: 18px;
  }
  
  .frame {
    padding: 14px;
  }
  
  .progress-bar {
    width: 100px;
  }
  
  .dialogue-card {
    padding: 10px 12px;
  }
  
  .avatar {
    width: 40px;
    height: 40px;
  }
  
  .choice-btn {
    padding: 12px 16px;
    font-size: 14px;
  }
  
  .end-content {
    padding: 30px 25px;
  }
  
  .ending-actions {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
  }
}
</style>