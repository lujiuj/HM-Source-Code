/**
 * Firebase Realtime Database Schema Design
 * 黄梅戏大擂台 + 大师唱段分析
 * 
 * @version 1.0.0
 */

// ============================================
// 1. 擂台赛模块 (Arena)
// ============================================

const arenaSchema = {
  // 比赛房间数据
  arenaRooms: {
    [roomId]: {
      id: String,                    // 房间ID
      name: String,                  // 房间名称 (如 "黄梅戏大擂台 - 第1场")
      status: String,                // waiting | active | ended
      createdAt: Number,             // 创建时间戳
      startedAt: Number,             // 开始时间戳
      endedAt: Number,               // 结束时间戳
      currentPerformer: String,      // 当前表演者userId
      participants: {                // 参与者列表
        [userId]: {
          userId: String,
          username: String,
          avatar: String,
          joinedAt: Number,
          score: Number,             // 当前得分
          likes: Number,             // 获得点赞数
          claps: Number,             // 获得鼓掌数
          isOnline: Boolean
        }
      },
      performance: {
        songId: String,              // 表演曲目ID
        songName: String,            // 曲目名称
        startTime: Number,           // 开始时间
        duration: Number,            // 表演时长(秒)
        scores: {
          [userId]: {
            pitch: Number,
            rhythm: Number,
            articulation: Number,
            style: Number,
            breath: Number,
            emotion: Number,
            overall: Number
          }
        }
      }
    }
  },

  // 实时排行榜数据
  arenaLeaderboard: {
    [roomId]: {
      lastUpdated: Number,
      rankings: [
        {
          rank: Number,
          userId: String,
          username: String,
          score: Number,
          likes: Number,
          claps: Number,
          timestamp: Number
        }
      ]
    }
  },

  // 点赞记录
  arenaLikes: {
    [roomId]: {
      [likeId]: {
        fromUserId: String,          // 点赞者
        toUserId: String,            // 被点赞者
        timestamp: Number,
        type: String                 // 'like' | 'superLike'
      }
    }
  },

  // 鼓掌记录
  arenaClaps: {
    [roomId]: {
      [clapId]: {
        fromUserId: String,
        toUserId: String,
        timestamp: Number,
        intensity: Number            // 强度 1-5
      }
    }
  },

  // 弹幕消息队列
  arenaDanmaku: {
    [roomId]: {
      [messageId]: {
        userId: String,
        username: String,
        content: String,
        timestamp: Number,
        type: String,                // text | emoji | gift
        color: String,               // 弹幕颜色
        position: String             // top | bottom | scroll
      }
    }
  },

  // 用户在线状态
  arenaPresence: {
    [roomId]: {
      [userId]: {
        isOnline: Boolean,
        lastSeen: Number,
        isPerforming: Boolean
      }
    }
  }
};

// ============================================
// 2. 大师唱段分析模块 (Master Library)
// ============================================

const masterLibrarySchema = {
  // 大师信息
  masters: {
    [masterId]: {
      id: String,
      name: String,                  // 如 "韩再芬"
      title: String,                 // 称号，如 "黄梅戏皇后"
      avatar: String,                // 头像URL
      bio: String,                   // 简介
      achievements: [String],        // 成就列表
      style: String,                 // 演唱风格
      totalSongs: Number,            // 曲目数量
      fans: Number,                  // 粉丝数
      songs: {                       // 曲目列表
        [songId]: {
          songId: String,
          title: String,
          operaName: String,         // 剧目名称
          difficulty: Number,        // 1-5
          duration: Number,          // 秒
          thumbnail: String,
          audioUrl: String,
          videoUrl: String,
          lrcUrl: String,
          tags: [String]
        }
      }
    }
  },

  // 唱段预分析数据(由AudioAnalyzer生成)
  songAnalysis: {
    [songId]: {
      songId: String,
      masterId: String,
      title: String,
      
      // 基础信息
      duration: Number,              // 总时长(秒)
      bpm: Number,                   // 节拍数
      key: String,                   // 调性
      
      // 音高分析数据
      pitchData: {
        sampleRate: Number,          // 采样率(如 10ms一个点)
        data: [
          {
            time: Number,            // 时间点(秒)
            frequency: Number,       // 频率(Hz)
            note: String,            // 音符名 (如 "C4")
            cents: Number,           // 音分偏差
            midi: Number,            // MIDI音符号
            isStable: Boolean        // 是否稳定音
          }
        ],
        statistics: {
          avgFrequency: Number,
          minFrequency: Number,
          maxFrequency: Number,
          pitchRange: Number,        // 音域(半音数)
          vibratoCount: Number,      // 颤音次数
          vibratoRate: Number,       // 颤音频率(Hz)
          avgVibratoDepth: Number    // 平均颤音深度(音分)
        }
      },
      
      // 节奏分析数据
      rhythmData: {
        beats: [
          {
            time: Number,
            strength: Number,        // 强度 0-1
            isDownbeat: Boolean      // 是否重拍
          }
        ],
        tempoChanges: [
          {
            time: Number,
            bpm: Number
          }
        ],
        statistics: {
          avgBpm: Number,
          bpmStability: Number,      // BPM稳定性
          rhythmComplexity: Number   // 节奏复杂度
        }
      },
      
      // 音量/力度分析
      volumeData: {
        sampleRate: Number,
        data: [
          {
            time: Number,
            rms: Number,             // RMS能量
            db: Number,              // 分贝值
            dynamics: String         // pp/p/mp/mf/f/ff
          }
        ],
        statistics: {
          avgDb: Number,
          dynamicRange: Number,      // 动态范围(dB)
          crescendos: [              // 渐强段
            { startTime: Number, endTime: Number }
          ],
          diminuendos: [             // 渐弱段
            { startTime: Number, endTime: Number }
          ]
        }
      },
      
      // 气息分析
      breathData: {
        breathPoints: [              // 换气点
          {
            time: Number,
            duration: Number,        // 停顿时长
            type: String,            // 'breath' | 'phrase_end' | 'rest'
            isOptional: Boolean      // 是否可选换气
          }
        ],
        longPhrases: [               // 长句(展示气息控制)
          {
            startTime: Number,
            endTime: Number,
            duration: Number,
            note: String             // 主要音高
          }
        ],
        statistics: {
          avgPhraseLength: Number,   // 平均句长(秒)
          maxPhraseLength: Number,   // 最长句
          breathCount: Number        // 换气次数
        }
      },
      
      // 演唱技巧标记
      techniqueMarks: [
    {
          time: Number,
          type: String,              // 'vibrato' | 'glide' | 'ornament' | 'breath' | 'staccato' | 'legato'
          description: String,       // 描述
          severity: Number           // 明显程度 1-5
        }
      ],
      
      // 歌词同步标记
      lyricMarks: [
        {
          time: Number,
          text: String,
          duration: Number,
          emphasisWords: [String]    // 重音词
        }
      ],
      
      // 教学要点
      teachingPoints: [
        {
          time: Number,
          type: String,              // 'pitch' | 'rhythm' | 'breath' | 'emotion' | 'technique'
          title: String,
          description: String,
          difficulty: Number         // 难度 1-5
        }
      ],
      
      // 对比基准(用于用户对比)
      comparisonTemplate: {
        pitchTolerance: Number,      // 音准容差(音分)
        rhythmTolerance: Number,     // 节奏容差(毫秒)
        emphasisWords: [String]      // 需要强调的字
      }
    }
  },

  // 用户练习记录
  userPractice: {
    [userId]: {
      [songId]: {
        practiceId: String,
        userId: String,
        songId: String,
        songTitle: String,
        masterId: String,
        
        // 练习时间
        startedAt: Number,
        completedAt: Number,
        duration: Number,            // 练习时长(秒)
        
        // 用户录音分析结果
        userAnalysis: {
          pitchData: { /* 同songAnalysis.pitchData */ },
          rhythmData: { /* 同songAnalysis.rhythmData */ },
          volumeData: { /* 同songAnalysis.volumeData */ },
          breathData: { /* 同songAnalysis.breathData */ }
        },
        
        // 对比结果
        comparisonResult: {
          overallSimilarity: Number, // 整体相似度 0-100
          pitchSimilarity: Number,
          rhythmSimilarity: Number,
          dynamicsSimilarity: Number,
          breathSimilarity: Number,
          
          // 详细对比
          pitchDeviations: [         // 音高偏差
            {
              time: Number,
              expectedNote: String,
              actualNote: String,
              deviation: Number,       // 偏差(音分)
              severity: String         // 'minor' | 'moderate' | 'major'
            }
          ],
          
          rhythmDeviations: [        // 节奏偏差
            {
              time: Number,
              expectedBeat: Number,
              actualBeat: Number,
              deviation: Number        // 偏差(ms)
            }
          ],
          
          missedTechniques: [        // 遗漏的技巧
            {
              time: Number,
              technique: String,
              description: String
            }
          ]
        },
        
        // 评分
        scores: {
          pitch: Number,
          rhythm: Number,
          articulation: Number,
          style: Number,
          breath: Number,
          emotion: Number,
          overall: Number
        },
        
        // AI教学建议
        teachingSuggestions: [
          {
            type: String,            // 'pitch' | 'rhythm' | 'breath' | 'technique' | 'emotion'
            priority: Number,        // 优先级 1-5
            title: String,
            description: String,
            exampleTime: Number,     // 参考时间点
            exerciseSuggestion: String // 练习建议
          }
        ],
        
        // 进步追踪
        attempts: Number,            // 尝试次数
        bestScore: Number,
        improvement: Number,         // 进步幅度
        
        // 分享数据
        isShared: Boolean,
        shareId: String,
        likes: Number,
        comments: Number
      }
    }
  },

  // 唱段知识点库
  teachingKnowledge: {
    [knowledgeId]: {
      id: String,
      type: String,                // 'pitch' | 'rhythm' | 'breath' | 'technique' | 'emotion' | 'style'
      title: String,
      content: String,
      relatedSongs: [String],      // 相关曲目ID
      relatedMasters: [String],    // 相关大师ID
      difficulty: Number,          // 1-5
      videoUrl: String,            // 讲解视频
      examples: [                  // 示例片段
        {
          songId: String,
          startTime: Number,
          endTime: Number,
          description: String
        }
      ]
    }
  }
};

// ============================================
// 2.5 学戏模块 (Learn / Works) - Firebase RTDB/Storage Contract
// ============================================
//
// Phase 1 product decisions (2026-02-05):
// - Auth: Firebase Anonymous (silent) -> stable uid
// - Publish = public
// - One public work slot per user per song: works/{songId}/{uid}
// - Overwrite anyway: replacing the public work is allowed even if score is lower
// - Overwrite must clear interactions and delete previous Storage object
// - Leaderboard: Top50 + my best, per song
// - Official pinned entry is excluded from Top50
//
// Scoring (2026-02-08):
// - Per line: 0-100
// - totalScore = sum(per-line)
// - averageScore = totalScore / lineCount (0-100)
// - grade derived from averageScore: SSS/SS/S/A/B/C
// - NOTE: legacy field `score` is treated as averageScore
//
// NOTE:
// - Current runtime adapters in this repo are still local-only (IndexedDB + localStorage).
// - This schema is the contract to implement a Firebase-backed adapter without changing UI/Domain.

const learnSchema = {
  // Stable profile for display name
  profiles: {
    [uid]: {
      uid: String,
      displayName: String,
      avatar: String,
      studyDays: Number,
      lastStudyVisitOn: String,
      notifications: {
        lastReadAt: Number
      },
      preferences: {
        viewMode: String
      },
      journey: {
        clearedStageIds: [String],
        quizPassStageIds: [String],
        quizPassLog: [String],
        lastStageId: String,
        viewedAnalysisSongIds: [String],
        analysisVisitLog: [String]
      },
      createdAt: Number,
      updatedAt: Number
    }
  },

  // Public works (single slot per {songId, uid})
  works: {
    [songId]: {
      [uid]: {
        songId: String,
        uid: String,

        displayName: String,

        // Scoring
        // NOTE: `score` is legacy and treated as averageScore
        score: Number,                 // averageScore (0-100)
        totalScore: Number,            // sum of per-line scores
        averageScore: Number,          // 0-100
        lineCount: Number,             // number of lyric lines scored
        grade: String,                 // SSS/SS/S/A/B/C
        stars: Number,
        breakdown: Object,

        // Storage path for public audio
        media: {
          storagePath: String, // works/{songId}/{uid}/current.webm
          contentType: String, // audio/webm;codecs=opus
          bytes: Number
        },

        // timestamps
        createdAt: Number,
        updatedAt: Number
      }
    }
  },

  // Official pinned area (not ranked)
  official: {
    [songId]: {
      songId: String,
      title: String,
      displayName: String,

      // Scoring (same semantics as works)
      score: Number,                 // averageScore (0-100)
      totalScore: Number,
      averageScore: Number,
      lineCount: Number,
      grade: String,
      media: {
        storagePath: String,
        contentType: String,
        bytes: Number
      },
      updatedAt: Number
    }
  },

  // Leaderboard per song (mirrors current public work score)
  // Query: orderByChild('score') + limitToLast(50)
  // NOTE: UI may rank by totalScore derived from works; this node is for fast queries.
  leaderboard: {
    [songId]: {
      [uid]: {
        songId: String,
        uid: String,
        displayName: String,

        // Scoring
        score: Number,                 // averageScore (0-100)
        totalScore: Number,
        averageScore: Number,
        lineCount: Number,
        grade: String,
        stars: Number,
        updatedAt: Number
      }
    }
  },

  // Interactions under each work (public read, auth write)
  // Key: workId = {songId}__{uid}
  // Path: learn/interactions/{workId}
  interactions: {
    [workId]: {
      likes: {
        [likeUid]: {
          uid: String,
          createdAt: Number
        }
      },
      comments: {
        [commentId]: {
          id: String,
          uid: String,
          displayName: String,
          text: String,
          replyTo: String, // parent comment id (empty if top-level)
          likes: Number,
          createdAt: Number
        }
      },
      danmaku: {
        [danmakuId]: {
          id: String,
          uid: String,
          displayName: String,
          text: String,
          timeMs: Number,
          createdAt: Number
        }
      },
      gifts: {
        [giftId]: {
          id: String,
          uid: String,
          displayName: String,
          type: String,
          count: Number,
          createdAt: Number
        }
      }
    }
  },

  // Storage paths
  storage: {
    worksCurrent: 'works/{songId}/{uid}/current.webm (public)',
    officialWorks: 'official/{songId}/current.webm (public)'
  }
}

// ============================================
// 3. 安全规则 (Security Rules)
// ============================================

const securityRules = {
  rules: {
    // 擂台赛数据 - 公开读取，认证用户可写
    arenaRooms: {
      ".read": true,
      ".write": "auth != null"
    },
    arenaLeaderboard: {
      ".read": true,
      ".write": "auth != null"
    },
    arenaLikes: {
      ".read": true,
      ".write": "auth != null",
      "$likeId": {
        ".validate": "newData.hasChild('fromUserId') && newData.hasChild('toUserId')"
      }
    },
    arenaClaps: {
      ".read": true,
      ".write": "auth != null"
    },
    arenaDanmaku: {
      ".read": true,
      ".write": "auth != null",
      "$messageId": {
        ".validate": "newData.child('content').val().length <= 100"
      }
    },
    
    // 大师库数据 - 只读，管理员可写
    masters: {
      ".read": true,
      ".write": "auth != null && root.child('admins').child(auth.uid).exists()"
    },
    songAnalysis: {
      ".read": true,
      ".write": "auth != null && root.child('admins').child(auth.uid).exists()"
    },
    
    // 用户练习数据 - 用户只能读写自己的数据
    userPractice: {
      "$userId": {
        ".read": "auth != null && auth.uid == $userId",
        ".write": "auth != null && auth.uid == $userId"
      }
    },
    
    // 知识点库 - 公开只读
    teachingKnowledge: {
      ".read": true,
      ".write": "auth != null && root.child('admins').child(auth.uid).exists()"
    }
  }
};

// ============================================
// 4. 索引建议
// ============================================

const indexes = {
  arenaLeaderboard: {
    ".indexOn": ["rankings/score", "lastUpdated"]
  },
  arenaLikes: {
    ".indexOn": ["timestamp", "toUserId"]
  },
  arenaDanmaku: {
    ".indexOn": ["timestamp"]
  },
  userPractice: {
    "$userId": {
      ".indexOn": ["completedAt", "scores/overall"]
    }
  }
};

// 导出模块
export { arenaSchema, masterLibrarySchema, learnSchema, securityRules, indexes };
