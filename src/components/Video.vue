<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
interface Props {
  src?: string // 视频文件地址，支持网络地址 https 和相对地址
  poster?: string // 视频封面地址，支持网络地址 https 和相对地址
  second?: number // 在未设置封面时，自动截取视频第 second 秒对应帧作为视频封面
  width?: string | number // 视频播放器宽度，单位 px
  height?: string | number // 视频播放器高度，单位 px
  autoplay?: boolean // 视频就绪后是否马上播放，优先级高于 preload
  controls?: boolean // 是否向用户显示控件，比如进度条，全屏等
  loop?: boolean // 视频播放完成后，是否循环播放
  muted?: boolean // 是否静音
  preload?: 'auto' | 'metadata' | 'none' // 是否在页面加载后载入视频，如果设置了 autoplay 属性，则 preload 将被忽略
  showPlay?: boolean // 播放暂停时是否显示播放器中间的暂停图标
  fit?: 'none' | 'fill' | 'contain' | 'cover' // video 的 poster 默认图片和视频内容缩放规则
}
const props = withDefaults(defineProps<Props>(), {
  src: undefined,
  poster: undefined,
  second: 0.5,
  width: 800,
  height: 450,
  autoplay: false,
  controls: true,
  loop: false,
  muted: false,
  preload: 'metadata',
  showPlay: true,
  fit: 'contain'
})
const veoWidth = computed(() => {
  if (typeof props.width === 'number') {
    return props.width + 'px'
  }
  return props.width
})
const veoHeight = computed(() => {
  if (typeof props.height === 'number') {
    return props.height + 'px'
  }
  return props.height
})
const veoRef = ref()  // 视频DOM引用
const veoPoster = ref()  // 自动生成的封面图
const originPlay = ref(true)  // 是否初始未播放状态
const hidden = ref(false) // 是否隐藏播放器中间的播放按钮

// 滚轮缩放参数
const scale = ref(1); // 当前缩放倍数
const maxScale = 2.1; // 最大缩放
const minScale = 0.8; // 最小缩放
const baseWidth = ref<number>(0); // 原始宽度
const baseHeight = ref<number>(0); // 原始高度

onMounted(() => {
   // 初始化原始宽高
  baseWidth.value = typeof props.width === 'number' ? props.width : parseFloat(props.width || '800');
  baseHeight.value = typeof props.height === 'number' ? props.height : parseFloat(props.height || '450');
  if (props.autoplay) {
    hidden.value = true
    originPlay.value = false
  }
})

// 监听滚轮事件
function handleWheel(e: WheelEvent) {
  e.preventDefault(); // 阻止页面滚动
  const delta = e.deltaY > 0 ? -0.1 : 0.1; // 上滚放大，下滚缩小
  const newScale = scale.value + delta;
  if (newScale >= minScale && newScale <= maxScale) {
    scale.value = newScale;
  }
}

// 计算缩放后的宽高
const scaledWidth = computed(() => `${baseWidth.value * scale.value}px`);
const scaledHeight = computed(() => `${baseHeight.value * scale.value}px`);


// 根据指定的帧数生成视频封面
function getPoster() {
  // 在未设置封面时，自动截取视频0.5s对应帧作为视频封面
  // 由于不少视频第一帧为黑屏，故设置视频开始播放时间为0.5s，即取该时刻帧作为封面图
  veoRef.value.currentTime = props.second
  // 创建canvas元素
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  // canvas画图
  canvas.width = veoRef.value.videoWidth
  canvas.height = veoRef.value.videoHeight
  ctx?.drawImage(veoRef.value, 0, 0, canvas.width, canvas.height)
  // 把canvas转成base64编码格式
  veoPoster.value = canvas.toDataURL('image/png')
}

function onPlay() {
  if (originPlay.value) {
    veoRef.value.currentTime = 0
    originPlay.value = false
  }
  if (props.autoplay) {
    veoRef.value?.pause()
  } else {
    hidden.value = true
    veoRef.value?.play()
  }
}
function onPause() {
  hidden.value = false
}
function onPlaying() {
  hidden.value = true
}
</script>


<script lang="ts">
// 必须导出才能在主页面使用

import { defineComponent } from 'vue'
export default defineComponent({
  name: 'Video'
})
</script>

<template>
<!-- “：”v-bind简写，用于绑定动态变化的属性 -->
  <div class="m-video" :class="{ 'video-hover': !hidden }"
   :style="`width: ${scaledWidth}; height: ${scaledHeight};`"
   @wheel.prevent="handleWheel">

    <video
      ref="veoRef"
      class="u-video"
      :style="`object-fit: ${fit};`"
      :src="src"
      :poster="poster ? poster : veoPoster"
      :autoplay="autoplay"
      :controls="!originPlay && controls"
      :loop="loop"
      :muted="autoplay || muted"
      :preload="preload"
      crossorigin="anonymous"
      @loadedmetadata="poster ? () => false : getPoster()"
      @pause="showPlay ? onPause() : () => false"
      @playing="showPlay ? onPlaying() : () => false"
      @click.prevent.once="onPlay"
      v-bind="$attrs"
    >
      您的浏览器不支持video标签。
    </video>

    <!-- 中央可视化播放暂停图标 -->
    <span v-show="originPlay || showPlay" class="icon-play" :class="{ 'icon-hidden': hidden }">
      <svg class="play-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 34">
        <path
          d="M28.26,11.961L11.035,0.813C7.464-1.498,3,1.391,3,6.013v21.974c0,4.622,4.464,7.511,8.035,5.2L28.26,22.039
          C31.913,19.675,31.913,14.325,28.26,11.961z"
        ></path>
      </svg>
    </span>
  </div>
</template>
<style lang="less" scoped>
.m-video {
  border-radius:20px ;
  position: relative;
  background: #000;
  cursor: pointer;
  .u-video {
    display: inline-block;
    width: 100%;
    height: 100%;
    vertical-align: bottom;
    z-index:15;
  }
  .icon-play {
    display: inline-block;
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    margin: auto;
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background-color: rgba(0, 0, 0, 0.6);
    pointer-events: none;
    transition: background-color 0.3s;
    .play-svg {
      display: inline-block;
      fill: #fff;
      width: 29px;
      height: 34px;
      margin-top: 23px;
      margin-left: 27px;
    }
  }
  .icon-hidden {
    opacity: 0;
  }
}
.video-hover {
  &:hover {
    .icon-play {
      background-color: rgba(0, 0, 0, 0.7);
    }
  }
}
</style>
