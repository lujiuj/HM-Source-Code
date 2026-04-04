<!-- Video.vue -->
<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'

interface VideoInfo {
  bvid?: string
  start?: number //
}

interface Props {
  video: VideoInfo
  width?: string | number
  height?: string | number
}

const props = withDefaults(defineProps<Props>(), {
  video: () => ({}),
  width: 800,
  height: 450
})

const bilibiliUrl = computed(() => {
  if (!props.video?.bvid) return ''

  let url = `https://player.bilibili.com/player.html?bvid=${props.video.bvid}`

  if (props.video.start) {
    url += `&t=${props.video.start}`
  }

  // 推荐参数（可删）
  url += `&autoplay=0&danmaku=1`

  return url
})

// 缩放（保留）
const scale = ref(1)
const maxScale = 2.1
const minScale = 0.8
const baseWidth = ref<number>(0)
const baseHeight = ref<number>(0)

onMounted(() => {
  baseWidth.value =
    typeof props.width === 'number'
      ? props.width
      : parseFloat(props.width || '800')

  baseHeight.value =
    typeof props.height === 'number'
      ? props.height
      : parseFloat(props.height || '450')
})

function handleWheel(e: WheelEvent) {
  e.preventDefault()
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  const newScale = scale.value + delta
  if (newScale >= minScale && newScale <= maxScale) {
    scale.value = newScale
  }
}

const scaledWidth = computed(() => `${baseWidth.value * scale.value}px`)
const scaledHeight = computed(() => `${baseHeight.value * scale.value}px`)
</script>

<script lang="ts">
import { defineComponent } from 'vue'
export default defineComponent({
  name: 'Video'
})
</script>

<template>
  <div
    class="m-video"
    :style="`width: ${scaledWidth}; height: ${scaledHeight};`"
    @wheel.prevent="handleWheel"
  >
    <!-- B站播放器 -->
    <iframe
      v-if="bilibiliUrl"
      :src="bilibiliUrl"
      frameborder="0"
      allowfullscreen
      class="bili-iframe"
    ></iframe>

    <div v-else class="empty">暂无视频</div>
  </div>
</template>

<style scoped lang="less">
.m-video {
  border-radius: 20px;
  overflow: hidden;
  background: #000;
}

.bili-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.empty {
  color: #999;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}
</style>