// src/config/useBgmStore.js
import { ref } from 'vue'

export function useBgm() {
  const audio = ref(null)
  const isPlaying = ref(false)

  const initBgm = (src) => {
    // 如果已有音频实例，先清理
    if (audio.value) {
      audio.value.pause()
      audio.value = null
    }
    
    audio.value = new Audio(src)
    audio.value.loop = true
    audio.value.volume = 0.5
    console.log("背景音乐初始化完成:", src)
  }

  const playBgm = async () => {
    if (audio.value) {
      try {
        await audio.value.play()
        isPlaying.value = true
        console.log("背景音乐开始播放")
      } catch (err) {
        console.error("背景音乐播放失败:", err)
        // 处理自动播放被阻止的情况
        if (err.name === 'NotAllowedError') {
          console.log("需要用户交互后才能播放音乐")
        }
      }
    }
  }

  const pauseBgm = () => {
    if (audio.value) {
      audio.value.pause()
      isPlaying.value = false
      console.log("背景音乐已暂停")
    }
  }

  // 设置音量
  const setVolume = (volume) => {
    if (audio.value) {
      audio.value.volume = Math.max(0, Math.min(1, volume))
    }
  }

  return {
    initBgm,
    playBgm,
    pauseBgm,
    setVolume,
    isPlaying
  }
}