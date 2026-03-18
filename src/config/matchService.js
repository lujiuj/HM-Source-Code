// src/services/matchService.js

import { database } from '../config/firebase';
import { 
  ref, 
  push, 
  set, 
  get, 
  update, 
  remove, 
  onValue, 
  off,
  query,
  orderByChild,
  equalTo,
  serverTimestamp
} from 'firebase/database';

class MatchService {
  constructor() {
    this.currentUserId = null;
    this.currentMatchId = null;
    this.listeners = new Map();
  }
  // 获取当前回合控制权
async acquireTurn(matchId, userId) {
    const matchRef = ref(database, `matches/${matchId}`);
    const snapshot = await get(matchRef);
    const match = snapshot.val();
    
    if (!match.performance) return false;
    
    // 检查是否已有其他玩家在操作
    if (match.performance.currentTurn && 
        match.performance.currentTurn !== userId) {
      return false; // 已被其他玩家占用
    }
    
    // 获取控制权
    await update(matchRef, {
      'performance/currentTurn': userId,
      'performance/lastAction': Date.now()
    });
    
    return true;
  }
  
  // 释放回合控制权
  async releaseTurn(matchId) {
    const matchRef = ref(database, `matches/${matchId}`);
    await update(matchRef, {
      'performance/currentTurn': null
    });
  }

  // 初始化用户
  async initUser(userId, userName) {
    this.currentUserId = userId;
    const userRef = ref(database, `users/${userId}`);
    
    await set(userRef, {
      id: userId,
      name: userName,
      online: true,
      currentMatch: null,
      lastSeen: Date.now()
    });

    // 设置离线状态
    const onDisconnectRef = ref(database, `users/${userId}/online`);
    // onDisconnect(onDisconnectRef).set(false);

    return userId;
  }

  // 加入匹配池
  async joinMatchPool(dramaPreference = null) {
    if (!this.currentUserId) {
      throw new Error('用户未初始化');
    }

    const poolRef = ref(database, `matchPool/${this.currentUserId}`);
    
    await set(poolRef, {
      oderId: this.currentUserId,
      timestamp: Date.now(),
      status: 'waiting',
      dramaPreference: dramaPreference
    });

    // 开始查找匹配
    return this.findMatch();
  }

  // 查找匹配
  async findMatch() {
    const poolRef = ref(database, 'matchPool');
    const snapshot = await get(poolRef);
    
    if (!snapshot.exists()) {
      return null;
    }

    const pool = snapshot.val();
    const waitingPlayers = Object.values(pool).filter(
      p => p.oderId !== this.currentUserId && p.status === 'waiting'
    );

    if (waitingPlayers.length > 0) {
      // 找到匹配对象，按时间排序取最早的
      waitingPlayers.sort((a, b) => a.timestamp - b.timestamp);
      const opponent = waitingPlayers[0];
      
      // 创建匹配
      const match = await this.createMatch(this.currentUserId, opponent.oderId);
      return match;
    }

    return null;
  }

  // 创建匹配房间
  async createMatch(player1Id, player2Id) {
    const matchRef = push(ref(database, 'matches'));
    const matchId = matchRef.key;

    // 获取玩家信息
    const [player1Snap, player2Snap] = await Promise.all([
      get(ref(database, `users/${player1Id}`)),
      get(ref(database, `users/${player2Id}`))
    ]);

    const player1 = player1Snap.val();
    const player2 = player2Snap.val();

    const matchData = {
      id: matchId,
      players: [player1Id, player2Id],
      playerNames: {
        [player1Id]: player1?.name || '玩家1',
        [player2Id]: player2?.name || '玩家2'
      },
      playerRoles: {},
      status: 'selecting',
      stage: 'drama',
      selectedDrama: null,
      selections: {
        [player1Id]: {
          drama: null,
          character: null,
          ready: false,
          lastUpdate: Date.now()
        },
        [player2Id]: {
          drama: null,
          character: null,
          ready: false,
          lastUpdate: Date.now()
        }
      },
      performance: {
        currentNodeId: null,
        timeline: [],
        lastChoice: null,
        status: 'waiting',
        waitingFor: null
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await set(matchRef, matchData);

    // 更新玩家状态
    await Promise.all([
      update(ref(database, `users/${player1Id}`), { currentMatch: matchId }),
      update(ref(database, `users/${player2Id}`), { currentMatch: matchId }),
      remove(ref(database, `matchPool/${player1Id}`)),
      remove(ref(database, `matchPool/${player2Id}`))
    ]);

    this.currentMatchId = matchId;
    return matchData;
  }

  // 监听匹配池变化（用于自动匹配）
  listenToMatchPool(callback) {
    const poolRef = ref(database, 'matchPool');
    
    const unsubscribe = onValue(poolRef, async (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      const pool = snapshot.val();
      const myEntry = pool[this.currentUserId];
      
      // 如果我还在等待中，尝试匹配
      if (myEntry && myEntry.status === 'waiting') {
        const match = await this.findMatch();
        if (match) {
          callback(match);
        }
      }
    });

    this.listeners.set('matchPool', unsubscribe);
    return () => {
      off(poolRef);
      this.listeners.delete('matchPool');
    };
  }

  // 监听匹配房间
  listenToMatch(matchId, callback) {
    const matchRef = ref(database, `matches/${matchId}`);
    
    const unsubscribe = onValue(matchRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val());
      }
    });

    this.listeners.set(`match_${matchId}`, unsubscribe);
    return () => {
      off(matchRef);
      this.listeners.delete(`match_${matchId}`);
    };
  }

  // 选择剧目
  async selectDrama(matchId, dramaId) {
    const matchRef = ref(database, `matches/${matchId}`);
    
    await update(matchRef, {
      [`selections/${this.currentUserId}/drama`]: dramaId,
      [`selections/${this.currentUserId}/lastUpdate`]: Date.now(),
      updatedAt: Date.now()
    });

    // 检查双方是否选择了相同剧目
    const snapshot = await get(matchRef);
    const match = snapshot.val();
    
    if (match.selections) {
      const selections = Object.values(match.selections);
      const dramas = selections.map(s => s.drama).filter(d => d);
      
      // 双方都选择了相同剧目
      if (dramas.length === 2 && dramas[0] === dramas[1]) {
        await update(matchRef, {
          selectedDrama: dramas[0],
          stage: 'character',
          updatedAt: Date.now()
        });
      }
    }
  }

  // 选择角色
  async selectCharacter(matchId, characterName) {
    const matchRef = ref(database, `matches/${matchId}`);
    
    await update(matchRef, {
      [`selections/${this.currentUserId}/character`]: characterName,
      [`selections/${this.currentUserId}/lastUpdate`]: Date.now(),
      [`playerRoles/${this.currentUserId}`]: characterName,
      updatedAt: Date.now()
    });

    // 检查双方是否都选择了角色
    const snapshot = await get(matchRef);
    const match = snapshot.val();
    
    if (match.selections) {
      const selections = Object.values(match.selections);
      const characters = selections.map(s => s.character).filter(c => c);
      
      // 双方都选择了角色且不相同
      if (characters.length === 2 && characters[0] !== characters[1]) {
        await update(matchRef, {
          stage: 'ready',
          updatedAt: Date.now()
        });
      }
    }
  }

  // 确认准备
  async confirmReady(matchId) {
    const matchRef = ref(database, `matches/${matchId}`);
    
    await update(matchRef, {
      [`selections/${this.currentUserId}/ready`]: true,
      [`selections/${this.currentUserId}/lastUpdate`]: Date.now(),
      updatedAt: Date.now()
    });

    // 检查双方是否都准备好
    const snapshot = await get(matchRef);
    const match = snapshot.val();
    
    if (match.selections) {
      const allReady = Object.values(match.selections).every(s => s.ready);
      
      if (allReady) {
        await update(matchRef, {
          status: 'performing',
          stage: 'performing',
          'performance/status': 'playing',
          'performance/currentNodeId': 'start',
          updatedAt: Date.now()
        });
      }
    }
  }

  // 同步剧情进度
  async syncProgress(matchId, nodeId, timeline) {
    const matchRef = ref(database, `matches/${matchId}`);
    
    await update(matchRef, {
      'performance/currentNodeId': nodeId,
      'performance/timeline': timeline,
      updatedAt: Date.now()
    });
  }

  

  // 提交选择
  async submitChoice(matchId, nodeId, choiceIndex) {
    const matchRef = ref(database, `matches/${matchId}`);
    
    await update(matchRef, {
      'performance/lastChoice': {
        playerId: this.currentUserId,
        nodeId: nodeId,
        choiceIndex: choiceIndex,
        timestamp: Date.now()
      },
      updatedAt: Date.now()
    });
  }

  // 更新等待状态
  async updateWaitingFor(matchId, playerId) {
    const matchRef = ref(database, `matches/${matchId}`);
    
    await update(matchRef, {
      'performance/waitingFor': playerId,
      updatedAt: Date.now()
    });
  }

  // 结束表演
  async endPerformance(matchId) {
    const matchRef = ref(database, `matches/${matchId}`);
    
    await update(matchRef, {
      status: 'ended',
      'performance/status': 'ended',
      updatedAt: Date.now()
    });
  }

  // 离开匹配
  async leaveMatch(matchId) {
    if (!matchId) return;

    const matchRef = ref(database, `matches/${matchId}`);
    const snapshot = await get(matchRef);
    
    if (snapshot.exists()) {
      const match = snapshot.val();
      
      // 更新玩家状态
      await update(ref(database, `users/${this.currentUserId}`), {
        currentMatch: null,
        online: false
      });

      // 如果双方都离开，删除房间
      const otherPlayerId = match.players.find(p => p !== this.currentUserId);
      if (otherPlayerId) {
        const otherPlayerSnap = await get(ref(database, `users/${otherPlayerId}`));
        const otherPlayer = otherPlayerSnap.val();
        
        if (!otherPlayer?.online || otherPlayer?.currentMatch !== matchId) {
          await remove(matchRef);
        }
      }
    }

    this.currentMatchId = null;
  }

  // 离开匹配池
  async leaveMatchPool() {
    if (this.currentUserId) {
      await remove(ref(database, `matchPool/${this.currentUserId}`));
    }
  }

  // 清理所有监听器
  cleanup() {
    this.listeners.forEach((unsubscribe, key) => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    this.listeners.clear();
  }
}

export const matchService = new MatchService();
export default matchService;