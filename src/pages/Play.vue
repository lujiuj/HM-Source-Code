// Play.vue
<template>
  <div class="r-body">
    <button id="return" @click="gotoHome"></button>
    <div class="game">
      <p>欢迎进入黄梅戏体验，点击下方按钮进入戏曲奇妙之旅</p>
      <button 
        id="startButton" 
        @click="startAutoMatch" 
        :disabled="matchStatus === 'waiting' || matchStatus === 'matched'"
      >
        {{ matchStatus === 'waiting' ? '正在匹配...' : '开始匹配' }}
      </button>
      <button 
        id="matchAlone" 
        @click="initiateSoloPlay" 
        :disabled="matchStatus === 'waiting' || matchStatus === 'matched'"
      >
        单人模式
      </button>
    </div>

    <!-- 匹配等待弹窗 -->
    <div v-if="showWaitingModal" class="waiting-modal-overlay">
      <div class="waiting-modal-content">
        <h2 v-if="matchStatus === 'waiting'">正在寻找队友...</h2>
        <h2 v-else-if="matchStatus === 'matched'">匹配成功！</h2>
        <p v-if="matchStatus === 'waiting'">已等待：{{ countdown }} 秒</p>
        <p v-else-if="matchStatus === 'matched'">即将进入{{ isSoloPlay ? '单人剧目' : '双人剧目' }}。</p>
        <button v-if="matchStatus === 'waiting'" @click="cancelMatch">
          取消匹配
        </button>
        <button v-else-if="matchStatus === 'matched'" @click="proceedToGame" :disabled="isRedirecting"
        >
          {{ isRedirecting ? '跳转中...' : '立即进入' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { databaseIn } from '../config/firebaseIn';
import { ref as dbRef, push, set, onValue, update, remove, get } from 'firebase/database';

const router = useRouter();

// 路由导航函数
const gotoHome = () => {
  router.push('/');
};

// ===== 核心状态管理 =====

const currentUser = ref({
  id: `user_${Math.floor(Math.random() * 100000)}`,
  name: `戏痴${Math.floor(Math.random() * 100)}`
});

// 匹配状态
const matchStatus = ref('idle');
const countdown = ref(0);
const matchedUser = ref(null);
const showWaitingModal = ref(false);
const isRedirecting = ref(false);
const isSoloPlay = ref(false);

// Firebase 监听器句柄
let poolListener = null;
let matchListener = null;
let countdownTimer = null;

// ===== 初始化 =====
onMounted(async () => {
  console.log(`当前用户ID: ${currentUser.value.id}, 昵称: ${currentUser.value.name}`);
  
  const userRef = dbRef(databaseIn, `users/${currentUser.value.id}`);
  const userSnapshot = await get(userRef); 
  // 不存在当前用户，则创建
  if (!userSnapshot.exists()) {
    await set(userRef, {
      id: currentUser.value.id,
      name: currentUser.value.name,
      online: true
    });
  } else {
    await update(userRef, { online: true }); //否则更新
  }

  startListeningMatchPool();
  startListeningMatches();
});

onUnmounted(async () => {
  stopListeningMatchPool();
  stopListeningMatches();
  clearCountdownTimer();
  
  if (currentUser.value.id) {
    try {
      await update(dbRef(databaseIn, `users/${currentUser.value.id}`), { 
        online: false,
        lastActivity: Date.now()
      });
    } catch (error) {
      console.error('更新用户状态失败:', error);
    }
  }
});

// 清除计时器
const clearCountdownTimer = () => {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
};

// ===== 自动匹配逻辑 =====
const startAutoMatch = async () => {
  if (matchStatus.value !== 'idle') return;  // 只有空闲状态参与匹配

  matchStatus.value = 'waiting';
  showWaitingModal.value = true;
  countdown.value = 0;
  isSoloPlay.value = false;

  const poolRef = dbRef(databaseIn, `matchPool/${currentUser.value.id}`);
  await set(poolRef, {
    userId: currentUser.value.id,
    timestamp: Date.now(),
    status: 'waiting'
  });

  // 60秒后自动匹配单人剧目
  countdownTimer = setInterval(() => {
    countdown.value++;
    console.log(`等待时间: ${countdown.value}秒`);
    
    if (countdown.value >= 60) {
      console.log('超时，自动匹配单人剧目');
      clearCountdownTimer();
      matchTimeoutSolo();
    }
  }, 1000);
};

// 超时匹配单人剧目
const matchTimeoutSolo = async () => {
  if (matchStatus.value !== 'waiting') return;
  
  console.log('执行超时匹配单人剧目逻辑');
  await remove(dbRef(databaseIn, `matchPool/${currentUser.value.id}`));  // 删除匹配池中信息
  
  // 设置单人剧目状态
  matchStatus.value = 'matched';
  isSoloPlay.value = true;
  matchedUser.value = null;
  
  console.log('已为您匹配单人剧目');
};

// 监听匹配池
const startListeningMatchPool = () => {
  const poolRef = dbRef(databaseIn, 'matchPool');
  poolListener = onValue(poolRef, async (snapshot) => {
    if (matchStatus.value !== 'waiting') return;
    
    const poolData = snapshot.val() || {};
    const poolList = Object.values(poolData);
    
    // 过滤出等待的其余用户
    const waitingUsers = poolList.filter(item => 
      item.userId !== currentUser.value.id && 
      item.status === 'waiting'
    );
    
    if (waitingUsers.length > 0) {
      // 选择第一个等待的用户进行匹配
      const otherUser = waitingUsers[0];
      console.log(`发现队友 ${otherUser.userId}, 尝试创建匹配...`);
      await createMatch(currentUser.value.id, otherUser.userId, 'auto');
    }
  });
};

const stopListeningMatchPool = () => {
  if (poolListener) poolListener();
  poolListener = null;
};

// 手动匹配单人剧目
const initiateSoloPlay = async () => {
  if (matchStatus.value === 'matched') return;
  
  if (matchStatus.value === 'waiting') {
    await cancelMatch();
  }

  console.log('手动选择单人剧目');
  matchStatus.value = 'matched';
  isSoloPlay.value = true;
  matchedUser.value = null;
  showWaitingModal.value = true;
  
  console.log('已为您匹配单人剧目');
};


// // 取消匹配
const cancelMatch = async () => {
  if (matchStatus.value === 'waiting') {
    clearCountdownTimer();
    try {
      await remove(dbRef(databaseIn, `matchPool/${currentUser.value.id}`));
      
      // 如果已经有匹配ID，清理匹配记录
      if (currentUser.value.currentMatch) {
        const matchRef = dbRef(databaseIn, `matches/${currentUser.value.currentMatch}`);
        const matchSnapshot = await get(matchRef);
        
        if (matchSnapshot.exists()) {
          const matchData = matchSnapshot.val();
          
          // 如果匹配中只有一个玩家，删除匹配记录
          if (matchData.players && matchData.players.length === 1) {
            await remove(matchRef);
          } else {
            // 从玩家列表中移除当前用户
            const otherPlayers = matchData.players.filter(id => id !== currentUser.value.id);
            await update(matchRef, {
              players: otherPlayers,
              updatedAt: Date.now()
            });
          }
        }
      }
      
      // 清理用户currentMatch字段
      await update(dbRef(databaseIn, `users/${currentUser.value.id}`), {
        currentMatch: null
      });
      
    } catch (error) {
      console.error('取消匹配时出错:', error);
    }
    
    resetMatchState();
    console.log('匹配已取消');
  }
};

// 重置匹配状态
const resetMatchState = () => {
  matchStatus.value = 'idle';
  showWaitingModal.value = false;
  countdown.value = 0;
  matchedUser.value = null;
  isRedirecting.value = false;
  isSoloPlay.value = false;
};

// 创建匹配记录（双人匹配）
const createMatch = async (userId1, userId2, type) => {
  console.log(`创建匹配: ${userId1} 和 ${userId2}`);
  
  try {
    // 检查匹配是否已存在
    const existingMatchesSnapshot = await get(dbRef(databaseIn, 'matches'));
    const existingMatches = existingMatchesSnapshot.val();
    
    if (existingMatches) {
      const foundMatch = Object.values(existingMatches).find(match =>
        match.status === 'selecting' && // 修改：匹配选择中的状态
        match.players && 
        match.players.includes(userId1) && 
        match.players.includes(userId2)
      );
      if (foundMatch) {
        console.log('匹配已存在，不再重复创建。匹配ID:', foundMatch.id);
        return foundMatch.id; // 返回现有的匹配ID
      }
    }

    // 匹配成功后删除匹配池中两个用户
    try {
      await remove(dbRef(databaseIn, `matchPool/${userId1}`));
      await remove(dbRef(databaseIn, `matchPool/${userId2}`));
      console.log('已从匹配池移除用户');
    } catch (poolError) {
      console.warn('从匹配池移除用户时出错:', poolError);
    }

    // 获取用户信息
    const user1Ref = dbRef(databaseIn, `users/${userId1}`);
    const user1Snapshot = await get(user1Ref);
    let user1Data = user1Snapshot.val();
    const user2Ref = dbRef(databaseIn, `users/${userId2}`);
    const user2Snapshot = await get(user2Ref);
    let user2Data = user2Snapshot.val();

    if (!user1Data || !user2Data) {
      console.error('未能获取到匹配双方的用户信息。');
      
      // 创建临时用户信息
      const tempUser1 = {
        id: userId1,
        name: `用户${userId1.substring(userId1.indexOf('_') + 1) || 'A'}`,
        online: true,
        temp: true
      };
      
      const tempUser2 = {
        id: userId2,
        name: `用户${userId2.substring(userId2.indexOf('_') + 1) || 'B'}`,
        online: true,
        temp: true
      };
      
      // 保存临时用户
      if (!user1Data) {
        await set(user1Ref, tempUser1);
        user1Data = tempUser1;
      }
      if (!user2Data) {
        await set(user2Ref, tempUser2);
        user2Data = tempUser2;
      }
      
      console.log('已创建临时用户信息');
    }

    // 创建匹配记录
    const matchesRef = dbRef(databaseIn, 'matches');
    const newMatchRef = push(matchesRef);
    const matchId = newMatchRef.key;
    
    const matchData = {
      id: matchId,
      type: type,
      players: [user1Data.id, user2Data.id],
      playerNames: { 
        [user1Data.id]: user1Data.name, 
        [user2Data.id]: user2Data.name 
      },
      status: 'selecting',  // 修改：初始状态为 selecting
      stage: 'drama',       // 新增：当前阶段
      selectedDrama: null,  // 新增：选择的剧目
      selections: {         // 新增：选择状态
        [user1Data.id]: {
          drama: null,
          character: null,
          ready: false,
          lastUpdate: null
        },
        [user2Data.id]: {
          drama: null,
          character: null,
          ready: false,
          lastUpdate: null
        }
      },
      currentTurn: user1Data.id,  // 新增：当前回合
      performance: {        // 新增：演绎数据
        currentLine: 0,
        scores: {
          [user1Data.id]: 0,
          [user2Data.id]: 0
        }
      },
      startTime: Date.now(),
      updatedAt: Date.now(),  // 新增：最后更新时间
      isSolo: false
    };
    
    await set(newMatchRef, matchData);
    
    // 更新用户的currentMatch字段
    await update(user1Ref, { 
      currentMatch: matchId,
      lastActivity: Date.now()
    });
    
    await update(user2Ref, { 
      currentMatch: matchId,
      lastActivity: Date.now()
    });
    
    console.log(`双人匹配记录创建成功，ID: ${matchId}`);
    console.log('匹配数据:', matchData);
    
    return matchId;
    
  } catch (error) {
    console.error('创建匹配失败:', error);
    throw error;
  }
};
// 监听匹配结果
// const startListeningMatches = () => {
//   const matchesRef = dbRef(databaseIn, 'matches');
//   matchListener = onValue(matchesRef, async (snapshot) => {
//     const matchesData = snapshot.val() || {};
//     const allMatches = Object.values(matchesData);

//     const myActiveMatch = allMatches.find(match => 
//       match.status === 'active' && 
//       match.players.includes(currentUser.value.id)
//     );

//     if (myActiveMatch && matchStatus.value !== 'matched') {
//       clearCountdownTimer();
//       matchStatus.value = 'matched';
//       isSoloPlay.value = false;
      
//       const teammateId = myActiveMatch.players.find(id => id !== currentUser.value.id);
//       const teammateName = myActiveMatch.playerNames ? myActiveMatch.playerNames[teammateId] : '未知队友';
      
//       matchedUser.value = { id: teammateId, name: teammateName };
      
//       console.log('双人匹配成功，队友:', matchedUser.value.name);
//     }
//   });
// };
// 监听匹配结果
const startListeningMatches = () => {
  const matchesRef = dbRef(databaseIn, 'matches');
  matchListener = onValue(matchesRef, async (snapshot) => {
    const matchesData = snapshot.val() || {};
    const allMatches = Object.values(matchesData);

    // 查找用户相关的活跃匹配
    const myActiveMatch = allMatches.find(match => 
      match.players && 
      match.players.includes(currentUser.value.id) && 
      (match.status === 'selecting' || match.status === 'active')  // 修改：包含 selecting 状态
    );

    if (myActiveMatch && matchStatus.value !== 'matched') {
      clearCountdownTimer();
      matchStatus.value = 'matched';
      isSoloPlay.value = false;
      
      // 记录匹配ID
      const matchId = myActiveMatch.id;
      console.log('匹配成功，匹配ID:', matchId);
      
      // 获取队友信息
      const teammateId = myActiveMatch.players.find(id => id !== currentUser.value.id);
      const teammateName = myActiveMatch.playerNames ? myActiveMatch.playerNames[teammateId] : '未知队友';
      
      matchedUser.value = { 
        id: teammateId, 
        name: teammateName,
        matchId: matchId
      };
      
      console.log('双人匹配成功，队友:', matchedUser.value.name);
      console.log('匹配详情:', myActiveMatch);
      
      // 更新当前用户的匹配ID
      await update(dbRef(databaseIn, `users/${currentUser.value.id}`), {
        currentMatch: matchId
      });
    }
  });
};

const stopListeningMatches = () => {
  if (matchListener) matchListener();
  matchListener = null;
};

// 立即进入游戏，跳转Stages页面
// const proceedToGame = async () => {
//   if (isRedirecting.value) return;
  
//   isRedirecting.value = true;
  
//   try {
//     await router.push({
//       name: 'Stages',
//       query: {
//         currentUser: JSON.stringify(currentUser.value),
//         matchedUser: isSoloPlay.value ? null : JSON.stringify(matchedUser.value),
//         isSolo: isSoloPlay.value,
//         matchType: isSoloPlay.value ? 'solo' : 'multi'
//       }
//     });
//   } catch (error) {
//     console.error('跳转失败:', error);
//     isRedirecting.value = false;
//   }
// };
// 立即进入游戏，跳转Stages页面
const proceedToGame = async () => {
  if (isRedirecting.value) return;
  
  isRedirecting.value = true;
  
  try {
    // 如果是双人模式，获取匹配ID
    let matchId = null;
    if (!isSoloPlay.value && matchedUser.value) {
      // 查找匹配记录
      const matchesRef = dbRef(databaseIn, 'matches');
      const snapshot = await get(matchesRef);
      const matches = snapshot.val() || {};
      
      for (const [id, match] of Object.entries(matches)) {
        if (match.players && 
            match.players.includes(currentUser.value.id) && 
            match.players.includes(matchedUser.value.id) &&
            (match.status === 'selecting' || match.status === 'active')) {
          matchId = id;
          break;
        }
      }
      
      if (matchId) {
        console.log('找到匹配ID:', matchId);
        // 确保匹配状态为 selecting
        await update(dbRef(databaseIn, `matches/${matchId}`), {
          status: 'selecting',
          stage: 'drama',
          updatedAt: Date.now()
        });
      }
    }
    
    // 准备路由参数
    const query = {
      currentUser: JSON.stringify(currentUser.value),
      matchedUser: isSoloPlay.value ? null : JSON.stringify(matchedUser.value),
      isSolo: isSoloPlay.value,
      matchType: isSoloPlay.value ? 'solo' : 'multi'
    };
    
    // 如果是双人模式，添加匹配ID
    if (matchId) {
      query.matchId = matchId;
    }
    
    await router.push({
      name: 'Stages',
      query: query
    });
    
  } catch (error) {
    console.error('跳转失败:', error);
    isRedirecting.value = false;
  }
};

// 监听状态变化
watch(matchStatus, (newStatus) => {
  if (newStatus === 'waiting') {
    showWaitingModal.value = true;
  } else if (newStatus === 'idle') {
    showWaitingModal.value = false;
  }
});

</script>

<style>
.r-body {
  background: yellow;
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

#return {
  position: fixed;
  left: 10px;
  top: 10px;
  width: 100px;
  height:100px;
  background: url('https://cdn.jsdelivr.net/gh/lujiuj/hm-cdn-assents/assets/icon/return_icon.png') no-repeat center;
  background-size: contain;

  border: none;
  cursor: pointer;
  z-index: 100;
}

.game {
  width: 100vw;
  height: 100vh;
  background: url('https://cdn.jsdelivr.net/gh/lujiuj/hm-cdn-assents/assets/backgrounds/part2-1.png') no-repeat center;
  background-size: cover;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 20px;
  box-sizing: border-box;
}

.game p {
  color: white;
  font-size: 1.5em;
  margin-bottom: 30px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.7);
}

.game button {
  width: 200px;
  padding: 15px 25px;
  margin: 10px;
  font-size: 1.2em;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: background-color 0.3s ease;
  color: white;
  background: rgba(107, 102, 97, 0.8);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
}

.game button:hover:not(:disabled) {
  background: rgba(85, 81, 77, 0.9);
}

.game button:disabled {
  background: rgba(107, 102, 97, 0.4);
  cursor: not-allowed;
}

.waiting-modal-overlay {
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

.waiting-modal-content {
  position: relative;
  padding: 60px 80px;
  text-align: center;
  max-width: 400px;
  width: 50%;
  border: 10px solid #8b4513;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  position: relative;
  overflow: hidden;
}

.waiting-modal-content::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.85);
  z-index: 1;
}

.waiting-modal-content > * {
  position: relative;
  z-index: 2;
}



.waiting-modal-content h2 {
  font-size: 36px;
  color: #8b4513;
  margin-bottom: 30px;
  font-family: "STKaiti", "KaiTi", serif;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  letter-spacing: 8px;
}

.waiting-modal-content p {
  color: #8b4513;
  font-size: 18px;
  margin-bottom: 30px;
  font-family: "STSong", "SimSun", serif;
  line-height: 1.6;
}

.waiting-modal-content button {
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
  background: linear-gradient(135deg, #825d00 0%, #e2712b 100%);
  color: white;
  border-color: #820f00;
}


.waiting-modal-content button:disabled {
  background: linear-gradient(135deg, #c0c0c0 0%, #a0a0a0 100%);
  color: #666;
  border-color: #999;
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}
</style>