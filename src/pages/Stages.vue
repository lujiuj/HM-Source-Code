// Stages.vue
<template>
  <div class="stage-container">
    <!-- 添加对手操作提示 -->
    <div v-if="showOpponentAction && !isSoloPlay" class="opponent-action-toast">
      <div class="toast-content">
        <div class="toast-text">{{ opponentActionText }}</div>
        <div class="toast-time">{{ opponentActionTime }}</div>
      </div>
    </div>
    
    <!-- 选择剧目弹窗 -->
    <div v-if="showDramaSelection" class="modal-overlay">
      <div class="modal-content">
        <h2>选择黄梅戏剧目</h2>
        
        <!-- 显示对手状态 -->
        <div v-if="!isSoloPlay && matchedUser" class="opponent-status">
          <div class="status-row">
            <span>对手: {{ matchedUser.name }}</span>
            <span v-if="opponentSelection.ready" class="status-indicator ready">✓ 已确认</span>
            <span v-else-if="opponentSelection.drama" class="status-indicator choosing">选择中...</span>
            <span v-else class="status-indicator waiting">等待选择...</span>
          </div>
        </div>
        
        <!-- 选择剧目 -->
        <div class="selection-status">
          <p v-if="selectedDrama">已选择剧目: 《{{ selectedDrama.name }}》</p>
          <p v-else>请选择剧目</p>
        </div>
        
        <!-- 剧目列表 -->
        <div class="drama-grid">
          <div 
            v-for="drama in availableDramas" 
            :key="drama.id"
            class="drama-card"
            :class="{
              selected: selectedDrama?.id === drama.id,
              'opponent-selected': !isSoloPlay && opponentSelection.drama === drama.id
            }"
            @click="selectDrama(drama)"
          >
            <h3>{{ drama.name }}</h3>
            <!-- 标记对手选择 -->
            <div v-if="!isSoloPlay && opponentSelection.drama === drama.id" 
                 class="opponent-selection-mark">
              对手已选
            </div>
          </div>
        </div>
        
        <!-- 确认按钮 -->
        <div class="selection-actions">
          <button 
            @click="confirmDramaSelection" 
            :disabled="!selectedDrama"
          >
            确认剧目选择
          </button>
        </div>
      </div>
    </div>

    <!-- 选择角色弹窗 -->
    <div v-if="showCharacterSelection" class="modal-overlay">
      <div class="modal-content">
        <h2>选择角色 - {{ selectedDrama?.name }}</h2>
        
        <!-- 显示对手状态 -->
        <div v-if="!isSoloPlay && matchedUser" class="opponent-status">
          <div class="status-row">
            <span>对手: {{ matchedUser.name }}</span>
            <span v-if="opponentSelection.character" class="status-indicator">已选择角色</span>
            <span v-else class="status-indicator waiting">选择中...</span>
          </div>
          <div v-if="opponentSelection.character" class="opponent-choice">
          </div>
        </div>
        
        <!-- 角色选择 -->
        <div class="character-grid">
          <div 
            v-for="character in selectedDrama?.characters" 
            :key="character.id"
            class="character-card"
            :class="{
              selected: selectedCharacter?.id === character.id,
              'opponent-selected': !isSoloPlay && opponentSelection.character === character.id
            }"
            @click="selectCharacter(character)"
            :disabled="!isSoloPlay && opponentSelection.character === character.id"
          >
            <h4>{{ character.name }}</h4>
            <!-- 标记对手选择 -->
            <div v-if="!isSoloPlay && opponentSelection.character === character.id" 
                 class="opponent-selection-mark">
              对手已选
            </div>
          </div>
        </div>
        
        <!-- 确认按钮 -->
        <div class="selection-actions">
          <button 
            @click="startPerformance" 
            :disabled="!selectedCharacter"
          >
            开始演绎
          </button>
        </div>
      </div>
    </div>

    <!-- 进入演绎场景 -->
    <div class="into-scene">
      <button id="return" @click="gotoHome"></button>
      <div class="intro">

      </div>
      <!-- 对话式窗口显示对唱内容 -->
      <div v-if="showChild" class="frame">
        <StagesHuangmeiAI v-if="showChild"
        @return="go_back"
        :mode="isSoloPlay"
        :drama="selectedDrama"
        :role="selectedCharacter"
        :roomId="matchId"
        :matchData="currentMatchData"
        />
      </div>
      <div v-if="showAnimation" class="ren">
          <img :src="`/animate/${imageName}.gif`">
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted,onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useBgm } from '../config/useBgmStore'  // 导入useBgm
import StagesHuangmeiAI from "../components/Stages_HuangmeiAI.vue";
import { databaseIn } from '../config/firebaseIn';
import { ref as dbRef, push, set, onValue, update, remove, get } from 'firebase/database';

// 接收路由参数
const router = useRouter();
const route = useRoute();
const isSoloPlay = ref(true);
const matchedUser = ref(null)
const currentUser = ref(null)
const matchType = ref(null)
const matchId = ref(null)
const currentMatchData = ref(null);
// 解析路由参数
const parseRouteParams = () => {
  try {
    console.log('路由参数:', route.query);
    // 解析当前用户
    if (route.query.currentUser) {
      currentUser.value = JSON.parse(route.query.currentUser);
      console.log('当前用户:', currentUser.value);
    } else {
      console.error('缺少当前用户信息');
    }
    
    // 解析匹配用户
    if (route.query.matchedUser && route.query.matchedUser !== 'null') {
      matchedUser.value = JSON.parse(route.query.matchedUser);
      console.log('匹配用户:', matchedUser.value);
    } else {
      console.log('无匹配用户，单人模式');
    }
    
    // 解析其他参数
    isSoloPlay.value = route.query.isSolo === 'true';
    matchType.value = route.query.matchType || 'solo';
    matchId.value = route.query.matchId || null;
    
    console.log('解析结果:', {
      isSoloPlay: isSoloPlay.value,
      matchType: matchType.value,
      matchId: matchId.value
    });
    
  } catch (error) {
    console.error('解析路由参数失败:', error);
    
    // 设置默认值
    currentUser.value = { 
      id: `user_${Date.now()}`, 
      name: '黄梅戏爱好者' 
    };
    matchedUser.value = null;
    isSoloPlay.value = true;
    matchType.value = 'solo';
  }
};
const { initBgm, playBgm, pauseBgm, isPlaying, setVolume } = useBgm()

// 状态控制
const connectionStatus = ref('disconnected'); // connected, connecting, disconnected
// 对手同步相关状态
const opponentSelection = ref({  // 存储对手的选择状态
  drama: null,      // 剧目ID
  character: null,  // 角色ID
  ready: false,     // 是否确认
  lastUpdate: null  // 最后更新时间
});

const showOpponentAction = ref(false);  // 是否显示对手操作提示
const opponentActionText = ref('');     // 对手操作文本
const opponentActionTime = ref('');     // 对手操作时间

const showDramaSelection = ref(true);
const showCharacterSelection = ref(false);
const showChild = ref(false);
const showAnimation = ref(false);
const imageName = ref('孟姜女'); // 用于gif的动态选择
const rythm = ref('孟姜女-十二月调') // 用于背景music动态选择

// 剧目和角色数据
const selectedDrama = ref(null);
const selectedCharacter = ref(null);

onMounted(() => {
  // 解析路由参数
  parseRouteParams();

  setTimeout(async () => {
    if (!isSoloPlay.value && matchedUser.value) {
      console.log('双人模式，初始化同步系统');
      await initMultiplayerSync();
    } else {
      console.log('单人模式，直接开始');
      showDramaSelection.value = true;
      connectionStatus.value = 'connected';
    }
    
    // 初始化并播放背景音乐
    initBgm(`/music/${rythm.value}.mp3`)
    setTimeout(() => {
      playBgm()
    }, 1000)
    setVolume(0.7)
  }, 100);
})

// 初始化双人同步
const initMultiplayerSync = async () => {
  console.log('开始初始化双人同步...');
  
  try {
    // 尝试获取匹配ID
    if (matchId.value) {
      console.log('从路由参数获取匹配ID:', matchId.value);
    } else {
      // 从matches中查找匹配
      console.log('查找匹配记录...');
      const matchesSnapshot = await get(dbRef(databaseIn, 'matches'));
      const matches = matchesSnapshot.val() || {};
      
      for (const [id, match] of Object.entries(matches)) {
        if (match.players && 
            match.players.includes(currentUser.value.id) && 
            match.players.includes(matchedUser.value.id) &&
            match.status === 'selecting') {
          matchId.value = id;
          console.log('找到匹配:', id);
          break;
        }
      }
      
      if (!matchId.value) {
        console.log('创建新的匹配...');
        await createNewMatch();
      }
    }
    
    if (matchId.value) {
      console.log('使用匹配ID:', matchId.value);
      // 开始监听匹配数据
      startListeningMatch();
      connectionStatus.value = 'connected';
    } else {
      console.error('无法获取匹配ID，切换到单人模式');
      isSoloPlay.value = true;
      connectionStatus.value = 'connected';
    }
  } catch (error) {
    console.error('初始化同步失败:', error);
    isSoloPlay.value = true;
    connectionStatus.value = 'connected';
  }
};

// 开始监听匹配
let matchListener = null;
const startListeningMatch = () => {
  if (!matchId.value) {
    console.error('无匹配ID，无法监听');
    return;
  }
  
  console.log('开始监听匹配数据，ID:', matchId.value);
  const matchRef = dbRef(databaseIn, `matches/${matchId.value}`);
  
  matchListener = onValue(matchRef, (snapshot) => {
    const matchData = snapshot.val();
    
    if (!matchData) {
      console.error('匹配数据不存在');
      return;
    }
    
    console.log('匹配数据更新:', matchData);
    // 更新当前匹配数据
    currentMatchData.value = {
      ...matchData,
      id: matchId.value
    };
    
    // 更新对手选择
    if (matchData.selections && matchedUser.value) {
      const opponentId = matchedUser.value.id;
      const opponentData = matchData.selections[opponentId];
      
      if (opponentData) {
        console.log('对手选择更新:', opponentData);
        
        // 保存旧值用于比较
        const oldDrama = opponentSelection.value.drama;
        const oldCharacter = opponentSelection.value.character;
        
        // 更新对手选择
        opponentSelection.value = opponentData;
        
        // 检测变化并显示提示
        if (opponentData.drama && opponentData.drama !== oldDrama) {
          const drama = availableDramas.value.find(d => d.id === opponentData.drama);
          if (drama) {
            showOpponentActionToast(`${matchedUser.value.name} 选择了剧目《${drama.name}》`);
          }
        }
        
        if (opponentData.character && opponentData.character !== oldCharacter) {
          if (selectedDrama.value) {
            const character = selectedDrama.value.characters.find(c => c.id === opponentData.character);
            if (character) {
              showOpponentActionToast(`${matchedUser.value.name} 选择了角色【${character.name}】`);
            }
          }
        }
      }
    }
    
  });
};

// 显示对手操作提示
const showOpponentActionToast = (text) => {
  opponentActionText.value = text;
  opponentActionTime.value = '刚刚';
  showOpponentAction.value = true;
  
  // 5秒后自动隐藏
  setTimeout(() => {
    showOpponentAction.value = false;
  }, 5000);
};


onUnmounted(() => {
  pauseBgm()
})

const gotoHome = () => {
  router.push('/play');
};

const go_back = () => {
  router.push('/play')
}

// 剧目数据
const availableDramas = ref([
  {
    id: 'tianxianpei',
    name: '天仙配',
    characters: [
      { id: 'qiniu', name: '七仙女' },
      { id: 'dongyong', name: '董永' }
    ]
  },
  {
    id: 'nvfuma',
    name: '女驸马',
    characters: [
      { id: 'fengsuqing', name: '冯素珍' },
      { id: 'gongzhu', name: '公主' }
    ]
  },
  {
    id: 'liangzhu',
    name: '梁祝·楼台会',
    characters: [
      { id: 'liangshanbo', name: '梁山伯' },
      { id: 'zhuyingtai', name: '祝英台' }
    ]
  }
]);

// 选择剧目
const selectDrama = async (drama) => {
  selectedDrama.value = drama;
  
  if (!isSoloPlay.value && matchedUser.value && matchId.value) {
    try {
      // 更新到数据库
      await update(dbRef(databaseIn, `matches/${matchId.value}/selections/${currentUser.value.id}`), {
        drama: drama.id,
        lastUpdate: Date.now()
      });
      
      console.log(`已选择剧目《${drama.name}》并同步到数据库`);
      
      // 可选：显示自己操作的提示
      showOpponentActionToast(`你选择了剧目《${drama.name}》`);
    } catch (error) {
      console.error('同步剧目选择失败:', error);
    }
  }
};

// 确认剧目选择
const confirmDramaSelection = async () => {
  if (!selectedDrama.value) {
    alert('请先选择剧目');
    return;
  }
  
  if (!isSoloPlay.value && matchedUser.value) {
    // 双人模式：同步确认状态
    if (matchId.value) {
      try {
        await update(dbRef(databaseIn, `matches/${matchId.value}/selections/${currentUser.value.id}`), {
          drama: selectedDrama.value.id,
          ready: true,
          lastUpdate: Date.now()
        });
        
        // 检查双方是否都确认了剧目
        await checkDramaSelectionReady();
        
      } catch (error) {
        console.error('同步剧目确认失败:', error);
      }
    }
  } else {
    // 单人模式：直接进入角色选择
    showDramaSelection.value = false;
    showCharacterSelection.value = true;
  }
};

const checkDramaSelectionReady = async () => {
  if(opponentSelection.value.drama && selectedDrama.value)
  {
    showDramaSelection.value = false;
    showCharacterSelection.value = true;
  }
}

// 选择角色
const selectCharacter = async (character) => {
  if (!isSoloPlay.value && opponentSelection.value.character === character.id) {
    alert('这个角色已被对手选择，请选择其他角色');
    return;
  }
  
  selectedCharacter.value = character;
  
  if (!isSoloPlay.value && matchedUser.value && matchId.value) {
    try {
      // 更新到数据库
      await update(dbRef(databaseIn, `matches/${matchId.value}/selections/${currentUser.value.id}`), {
        character: character.id,
        lastUpdate: Date.now()
      });
      
      console.log(`已选择角色【${character.name}】并同步到数据库`);
      
      // 显示操作提示
      showOpponentActionToast(`你选择了角色【${character.name}】`);
    } catch (error) {
      console.error('同步角色选择失败:', error);
    }
  }
};

// 开始演绎
const startPerformance = async () => {
  if (!selectedDrama.value || !selectedCharacter.value) {
    alert('请先选择剧目和角色');
    return;
  }
  
  console.log('开始演绎:', selectedDrama.value.name, selectedCharacter.value.name);
  showDramaSelection.value = false;
  showCharacterSelection.value = false;
  showChild.value = true;
  imageName.value = selectedCharacter.value.name;
  
  if (!isSoloPlay.value && matchedUser.value && matchId.value) {
    try {
      // 更新匹配状态为演绎中
      await update(dbRef(databaseIn, `matches/${matchId.value}`), {
        status: 'performing',
        stage: 'performing',
        updatedAt: Date.now()
      });
      
      console.log('已同步演绎开始状态');
    } catch (error) {
      console.error('同步演绎状态失败:', error);
    }
  }
};

// 播放角色动画
const playAnimation = () => {
  showAnimation.value = true;
  

}
const playAnimation2 = () => {
  showAnimation.value = true;
  

}
const playAnimation3 = () => {
  showAnimation.value = true;
  

}
</script>

<style scoped>
#return {
  position: fixed;
  right: 10px;
  top: 10px;
  width: 50px;
  height: 50px;
  background: url('https://cdn.jsdelivr.net/gh/lujiuj/hm-cdn-assents/assets/icon/退出.png') no-repeat center;
  background-size: contain;
  border: none;
  cursor: pointer;
  z-index: 100;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}



.drama-grid,
.character-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.drama-card,
.character-card {
  position: relative;
  overflow: hidden;
  padding: 24px 20px;
  border: 3px solid #8b4513;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  text-align: center;
  transition: all 0.3s ease;
  z-index: 1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}



.drama-card h3,
.character-card h4 {
  margin: 0;
  font-size: 18px;
  color: #8b4513;
  transition: color 0.3s ease;
  font-family: "STKaiti", "KaiTi", serif;
  font-weight: bold;
}

.drama-card:hover,
.character-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(139, 69, 19, 0.4);
  background: rgba(255, 255, 255, 0.95);
}

.drama-card.selected,
.character-card.selected {
  border-color: #f5880b;
  box-shadow: 0 4px 12px rgba(130, 0, 0, 0.4);
  transform: translateY(-4px);
  background: rgba(255, 255, 255, 0.95);
}



.drama-card.opponent-selected,
.character-card.opponent-selected {
  border-color: #8b0000;
  background: rgba(255, 200, 200, 0.9);
  box-shadow: 0 4px 12px rgba(139, 0, 0, 0.3);
}

.drama-card.opponent-selected h3,
.character-card.opponent-selected h4 {
  color: #8b0000;
}

.opponent-status,
.selection-status {
  text-align: center;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.9);
  border: 3px solid #8b4513;
  border-radius: 10px;
  margin-bottom: 24px;
  position: relative;
  color: #8b4513;
  font-family: "STKaiti", "KaiTi", serif;
}

.opponent-status::before,
.selection-status::before {
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

.status-indicator.ready {
  color: #823600;
  font-weight: bold;
}

.status-indicator.choosing {
  color: #8b4513;
  font-weight: bold;
}

.status-indicator.waiting {
  color: #8b0000;
  font-weight: bold;
}

.opponent-selection-mark {
  position: absolute;
  top: 5px;
  right: 5px;
  background: linear-gradient(135deg, #8b0000 0%, #a0522d 100%);
  color: white;
  padding: 4px 8px;
  font-size: 12px;
  border-radius: 4px;
  font-weight: bold;
  font-family: "STKaiti", "KaiTi", serif;
  z-index: 3;
}

.selection-actions {
  text-align: center;
  margin-top: 40px;
}

.selection-actions button {
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
  background: linear-gradient(135deg, #508200 0%, #e2712b 100%);
  color: white;
  border-color: #820000;
}


.selection-actions button:disabled {
  background: linear-gradient(135deg, #c0c0c0 0%, #a0a0a0 100%);
  color: #666;
  border-color: #999;
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}


.into-scene {
  width:100vw;
  height: 100vh;
  background: url('https://cdn.jsdelivr.net/gh/lujiuj/hm-cdn-assents/assets/backgrounds/scene2.png');
  background-size: cover;
}
.ren {

  margin:30px;
}

</style>



