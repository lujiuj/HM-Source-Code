<template>
  <div class="app-container">
    <!-- 动态梅花背景画布 -->
    <canvas ref="plumCanvas" class="plum-background"></canvas>
    
    <!-- 主内容区域 -->
    <main class="main-content">
      <header class="page-header">
        <div class="nav-container">
          <div class="logo">
            黄梅图谱
          </div>
          <nav class="main-nav">
            <router-link to="/" class="nav-item">首页</router-link>
            <a 
              href="#" 
              class="nav-item" 
              :class="{ active: currentContent === 'huangmeixiang' }"
              @click.prevent="switchContent('huangmeixiang')"
            >
              黄梅之乡
            </a>
            <a 
              href="#" 
              class="nav-item"
              :class="{ active: currentContent === 'luomeiyinji' }"
              @click.prevent="switchContent('luomeiyinji')"
            >
              落梅印记
            </a>
          </nav>
        </div>
      </header>

      <!-- 内容展示区域 -->
      <div class="content-wrapper">
        <!-- 左侧图谱面板 -->
        <div class="knowledge-panel">
          <!-- 黄梅之乡图谱 -->
          <div v-show="currentContent === 'huangmeixiang'" class="graph-content huangmei-bg">
            <div ref="g6Container" class="g6-wrapper"></div>
          </div>
          
          <!-- 时间轴 -->
          <div v-show="currentContent === 'luomeiyinji'" class="graph-content timeline-bg">
            <div ref="timelineContainer" class="timeline-wrapper graph2">
            </div>
          </div>
        </div>

        <!-- 右侧视频模块 -->
          <div class="video-container">
            <video 
              :src="currentVideo" 
              :key="currentVideo"
              controls 
              autoplay 
              muted 
              loop 
              class="digital-human-video"
            >
              您的浏览器不支持视频播放
            </video>
          </div>
      </div>
    </main>
    
    <!-- 节点详情弹窗 -->
    <Transition name="modal">
      <div v-if="showNodeModal" class="node-modal-overlay" @click="closeModal">
        <div class="node-modal" @click.stop>
          <button class="modal-close" @click="closeModal">×</button>
          <div class="modal-body">
            <h2>{{ selectedNode?.title }}</h2>
            <p class="modal-description">{{ selectedNode?.description }}</p>
            <div class="modal-details">
              <h4>详细说明</h4>
              <p>{{ selectedNode?.details }}</p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import G6 from '@antv/g6'

// 图片导入
const dzc = 'https://cdn.jsdelivr.net/gh/lujiuj/hm-cdn-assents/assets/section/dzc.png'
const fqgd = 'https://cdn.jsdelivr.net/gh/lujiuj/hm-cdn-assents/assets/section/fqgd.png'
const lpj = 'https://cdn.jsdelivr.net/gh/lujiuj/hm-cdn-assents/assets/section/lpj.png'
const lz = 'https://cdn.jsdelivr.net/gh/lujiuj/hm-cdn-assents/assets/section/lz.png'
const nfm = 'https://cdn.jsdelivr.net/gh/lujiuj/hm-cdn-assents/assets/section/nfm.png'
const nlzn = 'https://cdn.jsdelivr.net/gh/lujiuj/hm-cdn-assents/assets/section/nlzn.jpg'
const ths = 'https://cdn.jsdelivr.net/gh/lujiuj/hm-cdn-assents/assets/section/ths.png'
const txp = 'https://cdn.jsdelivr.net/gh/lujiuj/hm-cdn-assents/assets/section/txp.png'
const mh = 'https://cdn.jsdelivr.net/gh/lujiuj/hm-cdn-assents/assets/icon/mh.png'

// ============ 梅花粒子动画 ============
const plumCanvas = ref(null)
let canvasCtx = null
let plumPetals = []
let mouseX = 0
let mouseY = 0
let animationId = null

// 梅花花瓣类
class PlumPetal {
  constructor(x, y, canvas) {
    this.x = x
    this.y = y
    this.canvas = canvas
    this.size = Math.random() * 25 + 10
    this.speedX = (Math.random() - 0.5) * 2
    this.speedY = Math.random() * 2 + 1
    this.rotation = Math.random() * 360
    this.rotationSpeed = (Math.random() - 0.5) * 5
    this.opacity = Math.random() * 0.5 + 0.5
    this.color = this.getRandomColor()
    this.life = 1
    this.decay = Math.random() * 0.005 + 0.002
  }

  getRandomColor() {
    const colors = [
      '#ffb6c1', // 浅粉色
      '#ffc0cb', // 粉色
      '#ffb7c5', // 樱花粉
      '#f8b4b4', // 珊瑚粉
      '#ffa07a', // 浅鲑鱼色
      '#ff8c69', // 鲑鱼色
    ]
    return colors[Math.floor(Math.random() * colors.length)]
  }

  update() {
    this.x += this.speedX
    this.y += this.speedY
    this.rotation += this.rotationSpeed
    this.life -= this.decay
    this.opacity = this.life * 0.8

    // 摇摆效果
    this.speedX += (Math.random() - 0.5) * 0.1
    this.speedX = Math.max(-2, Math.min(2, this.speedX))
  }

  draw(ctx) {
    if (this.life <= 0) return

    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.rotate((this.rotation * Math.PI) / 180)
    ctx.globalAlpha = this.opacity

    // 绘制梅花花瓣形状
    this.drawPlumPetal(ctx)

    ctx.restore()
  }

  drawPlumPetal(ctx) {
    const size = this.size
    ctx.fillStyle = this.color
    ctx.strokeStyle = this.adjustColor(this.color, -20)
    ctx.lineWidth = 1

    // 五瓣梅花
    for (let i = 0; i < 5; i++) {
      ctx.beginPath()
      const angle = (i * 72 * Math.PI) / 180
      const petalX = Math.cos(angle) * size * 0.4
      const petalY = Math.sin(angle) * size * 0.4

      ctx.ellipse(petalX, petalY, size * 0.35, size * 0.2, angle, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }

    // 花蕊
    ctx.beginPath()
    ctx.fillStyle = '#ffeb3b'
    ctx.arc(0, 0, size * 0.15, 0, Math.PI * 2)
    ctx.fill()

    // 花蕊细节
    ctx.fillStyle = '#ff9800'
    for (let i = 0; i < 6; i++) {
      const angle = (i * 60 * Math.PI) / 180
      const dotX = Math.cos(angle) * size * 0.08
      const dotY = Math.sin(angle) * size * 0.08
      ctx.beginPath()
      ctx.arc(dotX, dotY, size * 0.03, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  adjustColor(color, amount) {
    const hex = color.replace('#', '')
    const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount))
    const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount))
    const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount))
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  }

  isDead() {
    return this.life <= 0 || this.y > this.canvas.height + 50
  }
}

// 初始化梅花背景
const initPlumBackground = () => {
  if (!plumCanvas.value) return
  
  const canvas = plumCanvas.value
  canvasCtx = canvas.getContext('2d')
  
  const resizeCanvas = () => {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  }
  
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)

  // 鼠标移动事件 - 产生梅花
  const handleMouseMove = (e) => {
    mouseX = e.clientX
    mouseY = e.clientY
    
    // 鼠标移动时产生梅花
    if (Math.random() > 0.7) {
      for (let i = 0; i < 2; i++) {
        plumPetals.push(new PlumPetal(
          mouseX + (Math.random() - 0.5) * 30,
          mouseY + (Math.random() - 0.5) * 30,
          canvas
        ))
      }
    }
  }

  document.addEventListener('mousemove', handleMouseMove)

  // 动画循环
  const animate = () => {
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height)

    // 随机自然飘落的梅花
    if (Math.random() > 0.97) {
      plumPetals.push(new PlumPetal(
        Math.random() * canvas.width,
        -20,
        canvas
      ))
    }

    // 更新和绘制花瓣
    plumPetals = plumPetals.filter(petal => {
      petal.update()
      petal.draw(canvasCtx)
      return !petal.isDead()
    })

    // 限制花瓣数量
    if (plumPetals.length > 100) {
      plumPetals = plumPetals.slice(-100)
    }

    animationId = requestAnimationFrame(animate)
  }

  animate()
}

// ============ 路由 ============
const router = useRouter()

// ============ 状态管理 ============
const currentContent = ref('huangmeixiang')
const showNodeModal = ref(false)
const selectedNode = ref(null)
const activeTimeline = ref(-1)

// ============ 视频数据 ============
const videoData = {
  huangmeixiang: {
    title: '黄梅戏起源讲解',
    src: 'https://cdn.jsdelivr.net/gh/lujiuj/hm-cdn-assents/video/黄梅起源.mp4',
    description: '黄梅戏是中国传统戏曲剧种之一，起源于湖北黄梅县的采茶歌，后传入安徽安庆地区，与当地民间艺术结合，逐渐发展成为独特的戏曲剧种。'
  },
  luomeiyinji: {
    title: '黄梅戏文化传承',
    src: 'https://cdn.jsdelivr.net/gh/lujiuj/hm-cdn-assents/video/黄梅历史.mp4',
    description: '黄梅戏作为中国非物质文化遗产，承载着深厚的历史文化底蕴。通过数字人讲解，深入了解黄梅戏的艺术特色、表演形式和文化价值。'
  }
}

// 计算属性
const currentVideo = computed(() => videoData[currentContent.value].src)
const videoTitle = computed(() => videoData[currentContent.value].title)
const videoDescription = computed(() => videoData[currentContent.value].description)

// ============ 时间轴 ============
const timelineContainer = ref(null);
const graph2 = ref(null);
const data2 = {
  nodes: [
    {
      id: '1',
      label: '18世纪中叶 (清乾隆年间)\n黄梅戏雏形形成',
      img: mh,
      x: 200,
      y: 200,
    },
    {
      id: '2',
      label: '20世纪初\n演出形式发展',
      img: mh,
      x: 400,
      y: 100,
    },
    {
      id: '3',
      label: '1926年\n正式进入城市舞台',
      img: mh,
      x: 600,
      y: 200,
    },
    {
      id: '4',
      label: '20世纪30-40年代\n艺术趋于成熟',
      img: mh,
      x: 800,
      y: 100,
    },
    {
      id: '5',
      label: '1952年\n"黄梅调"开始被全国熟知',
      img: mh,
      x: 300,
      y: 350,
    },
    {
      id: '6',
      label: '1953年\n安徽省黄梅戏剧团成立',
      img: mh,
      x: 500,
      y: 250,
    },
    {
      id: '7',
      label: '1959年\n《女驸马》电影上映',
      img: mh,
      x: 700,
      y: 350,
    },
    {
      id: '8',
      label: '2006年5月20日\n列入非遗名录',
      img: mh,
      x: 900,
      y: 250,
    }
  ],
  edges: [
    { source: '1', target: '2' },
    { source: '2', target: '3' },
    { source: '3', target: '4' },
    { source: '4', target: '8' },
    { source: '8', target: '7' },
    { source: '7', target: '6' },
    { source: '6', target: '5' },
    { source: '6', target: '5' }    
  ],
};
// 注册自定义图片节点
G6.registerNode('image-node', {
  draw(cfg, group) {
    const width = 60;
    const height = 60;

    // 图片
    group.addShape('image', {
      attrs: {
        x: -width / 2,
        y: -height / 2,
        width,
        height,
        img: cfg.img,
      },
    });

    // 文字
    group.addShape('text', {
      attrs: {
        text: cfg.label,
        x: 0,
        y: 50,
        textAlign: 'center',
        textBaseline: 'top',
        fill: '#5c3a21',
        fontSize: 13,
        fontWeight: 'bold',
        fontFamily: 'MyCustomFont2, sans-serif',
      },
    });

    return group;
  },
});

function initGraph2() {
  // 销毁旧实例
  if (graph2.value) {
    try {
      graph2.value.destroy();
    } catch (error) {
      console.warn('Graph2 destroy error:', error);
    }
    graph2.value = null;
  }
  
  // 初始化新实例
  graph2.value = new G6.Graph({
    container: timelineContainer.value,

    width: timelineContainer.value.clientWidth || 800,
    height: timelineContainer.value.clientHeight || 500,
    autoFit: true,
    fitView: true,

    modes: {
      default: ['drag-canvas', 'zoom-canvas'],
    },

    defaultNode: {
      type: 'image-node',
    },

    defaultEdge: {
      style: {
        stroke: '#e67e22', 
        lineWidth: 3,  
        strokeOpacity: 0.9, 
        lineDash: [5, 5],
        endArrow: {
          path: G6.Arrow.triangle(8, 10, 0),
          fill: '#e67e22',
          stroke: '#e67e22',
        },
      },
    },
    // behaviors: ['hover-activate']
  });

  graph2.value.data(data2);

  graph2.value.render();
}

const switchContent = (contentId) => {
  currentContent.value = contentId
}

// ============ 弹窗控制 ============
const closeModal = () => {
  showNodeModal.value = false
  selectedNode.value = null
}

// ============ 知识图谱 ============
const g6Container = ref(null)
let graph = null
let isNodeRegistered = false

// 节点信息数据
const nodeInfo = {
  dzc: {
    id: 'dzc',
    title: '打猪草',
    img: dzc,
    description: '《打猪草》是黄梅戏经典小戏，以质朴欢快的曲调、充满乡土气息的表演，展现黄梅民间生活与劳动情趣。',
    details: '取材于黄梅农村日常，讲述村姑与牧童因打猪草发生误会又和好的小故事。唱腔源自黄梅采茶调，曲调轻快活泼、朗朗上口，语言直白风趣，充满浓郁的生活气息与童真趣味，是黄梅戏“三小戏”中最具代表性的剧目之一，也是黄梅戏走向全国的经典名片。'
  },
  fqgd: {
    id: 'fqgd',
    title: '夫妻观灯',
    img: fqgd,
    description: '《夫妻观灯》是黄梅戏最具民俗特色的经典小戏，描绘元宵佳节民间观灯的热闹景象与市井风情。',
    details: '以一对青年夫妻进城观灯为主线，通过看灯、说灯、赏灯，展现清末民初民间元宵灯会的繁华与百姓生活喜乐。唱腔流畅明快、表演生动诙谐，大量运用方言与民间小调，充满浓郁的地方风情与生活烟火气，是黄梅戏中极具观赏性的传统保留剧目。'
  },
  lpj: {
    id: 'lpj',
    title: '刘海砍樵',
    img: lpj,
    description: '黄梅戏经典民间小戏，以湘楚民间传说为蓝本，通过樵夫刘海与狐仙胡秀英的爱情故事，展现底层劳动人民的淳朴与勇敢。',
    details: '该剧目是黄梅戏"三小戏"的典范之作，唱腔采用黄梅采茶调的核心板式，节奏明快活泼，唱词通俗易懂且充满乡土趣味，如"刘海哥，你是我的夫哇；胡大姐，你是我的妻哟"成为经典唱段。表演上注重生活化的肢体语言，狐仙的灵动与樵夫的憨厚形成鲜明对比，既保留民间艺术的质朴，又体现黄梅戏贴近大众的艺术特质，至今仍是黄梅戏普及演出的经典剧目。'
  },
  lz: {
    id: 'lz',
    title: '梁山伯与祝英台',
    img: lz,
    description: '黄梅戏经典悲剧剧目，改编自中国四大民间传说，以安庆方言声腔演绎梁祝的凄美爱情，成为黄梅戏抒情剧目代表。',
    details: '黄梅戏版《梁祝》区别于越剧的婉约，融入安庆地区的声腔特色，如"哭坟"选段采用黄梅戏独有的"哭腔"，旋律起伏跌宕，情感表达浓烈直白。剧目在保留"十八相送""楼台会"等经典情节的基础上，增加了皖西南民间生活细节，唱词兼具文学性与乡土气息，通过二胡、笛子等民间乐器伴奏，将梁祝的爱情悲剧与黄梅戏的声腔美学完美融合，是黄梅戏移植经典传说的典范。'
  },
  nfm: {
    id: 'nfm',
    title: '女驸马',
    img: nfm,
    description: '黄梅戏里程碑式经典剧目，以明代民间故事为背景，讲述冯素珍女扮男装考中状元、冒名成婚的传奇故事，彰显女性的智慧与反抗精神。',
    details: '该剧由黄梅戏表演艺术家严凤英首演并成为经典，核心唱段"谁料皇榜中状元"采用黄梅戏"平词"板式，旋律流畅悠扬，传唱度极高。剧目情节跌宕起伏，从救夫心切到金榜题名，再到金殿陈情，既展现冯素珍的智勇双全，又批判了封建礼教对女性的束缚，融入安庆地区的民俗文化与价值观念。表演上，旦角需在男女角色间灵活切换，唱腔兼具女性的柔美与男性的刚劲，是黄梅戏旦行表演艺术的巅峰之作，也让黄梅戏从民间小戏走向全国舞台。'
  },
  nlzn: {
    id: 'nlzn',
    title: '牛郎织女',
    img: nlzn,
    description: '黄梅戏神话经典剧目，改编自七夕民间传说，以黄梅戏独特的声腔与表演，演绎牛郎与织女跨越天堑的至纯爱情。',
    details: '该剧目由严凤英、王少舫等大师联袂演绎，唱腔融合黄梅戏"彩腔"的明快与"仙腔"的空灵，如"架上累累悬瓜果"选段，旋律如行云流水，充满田园诗意。舞台呈现上融入皖西南民间剪纸、花灯等视觉元素，将天河、鹊桥等神话场景与黄梅地区的农耕文化结合，既保留传说的浪漫主义色彩，又赋予浓郁的乡土气息，成为黄梅戏表现神话题材的代表作品，也让"七夕"文化与黄梅戏艺术深度绑定。'
  },
  ths: {
    id: 'ths',
    title: '天仙配',
    img: ths,
    description: '黄梅戏的标志性经典剧目，讲述七仙女下凡与董永结为夫妻，以"夫妻双双把家还"的经典唱段成为黄梅戏的文化符号。',
    details: '《天仙配》是黄梅戏走向全国的核心代表作，由严凤英、王少舫于1954年首演，1956年改编为电影后风靡全国。剧目取材于黄梅地区"董永卖身葬父"的民间故事，唱腔以黄梅采茶调为基础，创新融合安庆民歌元素，"树上的鸟儿成双对"唱段采用"对板"形式，一问一答、旋律优美，成为家喻户晓的经典。该剧奠定了黄梅戏"清新自然、淳朴流畅"的艺术风格，也让安庆成为黄梅戏的核心传承地，被列入国家级非物质文化遗产代表性剧目。'
  },
  txp: {
    id: 'txp',
    title: '桃花扇',
    img: txp,
    description: '黄梅戏经典历史剧目，改编自孔尚任同名传奇，以侯方域与李香君的爱情悲剧映照南明王朝的兴衰，兼具艺术价值与历史深度。',
    details: '黄梅戏版《桃花扇》突破了民间小戏的题材局限，转向历史悲剧创作，唱腔上融合黄梅戏"悲腔"与昆曲的婉转，唱词典雅又不失黄梅戏的乡土特质。剧目以"桃花扇"为叙事线索，既展现李香君的忠贞气节，又揭露明末社会的动荡与人性百态，表演上注重人物内心刻画，旦角的细腻与生角的沉郁相得益彰。该剧是黄梅戏从民间小戏向文人大戏转型的重要作品，拓展了黄梅戏的题材边界与艺术表现力，成为黄梅戏经典保留剧目。'
  }
}


// 注册自定义节点
const registerCustomNode = () => {
  if (isNodeRegistered) return
  G6.registerNode('image-only-node', {
    draw(cfg, group) {

      const size = cfg.size || 100
      const r = size / 2

      // 外圈（梅花边框）
      const border = group.addShape('circle', {
        attrs: {
          x: 0,
          y: 0,
          r: r + 8,
          stroke: '#c08a3c',
          lineWidth: 4,
          fill: '#fff8ef',
          shadowBlur: 20,
          shadowColor: '#e6b980'
        }
      })

      // 图片
      if (cfg.img) {
        group.addShape('image', {
          attrs: {
            x: -r,
            y: -r,
            width: size,
            height: size,
            img: cfg.img,
            clip: {
              type: 'circle',
              attrs: {
                x: 0,
                y: 0,
                r: r
              }
            }
          }
        })
      } else {
        // 没有图片时显示默认内容
        group.addShape('circle', {
          attrs: {
            x: 0,
            y: 0,
            r: r,
            fill: '#f0f0f0'
          }
        })
        group.addShape('text', {
          attrs: {
            text: '无图片',
            x: 0,
            y: 0,
            textAlign: 'center',
            textBaseline: 'middle',
            fill: '#999',
            fontSize: 14
          }
        })
      }

      // 标题
      group.addShape('text', {
        attrs: {
          text: cfg.label,
          x: 0,
          y: r + 25,
          textAlign: 'center',
          textBaseline: 'middle',
          fill: '#5c3a21',
          fontSize: 14,
          fontWeight: 'bold'
        }
      })

      return border
    }
  })
  try {
    isNodeRegistered = true
  } catch (e) {
    console.warn('Node already be registered:', e)
    isNodeRegistered = true
  }
}

// 初始化图谱
const initGraph = async () => {
  await nextTick()
  
  if (!g6Container.value) {
    console.warn('g6Container is not available')
    setTimeout(initGraph, 100)
    return
  }

  // 确保容器有尺寸
  await new Promise(resolve => setTimeout(resolve, 100))
  
  const containerWidth = g6Container.value.clientWidth
  const containerHeight = g6Container.value.clientHeight
  
  if (containerWidth === 0 || containerHeight === 0) {
    console.warn('Container has zero dimensions')
    setTimeout(initGraph, 200)
    return
  }

  // 销毁旧图
  if (graph) {
    try {
      graph.destroy()
    } catch (error) {
      console.warn('Graph destroy error:', error)
    }
    graph = null
  }

  // 使用G6内置image节点类型
  const nodeSizes = [120, 115, 110, 110, 110, 115, 115, 114]
  const nodeKeys = Object.keys(nodeInfo)
  
  // 创建节点数据
  const nodes = nodeKeys.map((key, index) => ({
    id: key,
    type: 'image',
    size: nodeSizes[index] || 100,
    img: nodeInfo[key].img,
    label: nodeInfo[key].title,
    labelCfg: {
      position: 'bottom',
      offset: 10,
      style: {
        fill: '#5c3a21',
        fontSize: 14,
        fontWeight: 'bold'
      }
    }
  }))

  const centerX = containerWidth / 2
  const centerY = containerHeight / 2

  nodes.forEach((node, index) => {

    if (node.id === 'dzc') {
      node.x = centerX
      node.y = centerY
    }

    else if (node.id === 'fqgd') {
      node.x = centerX
      node.y = centerY + 150
    }

    else {
      // 使用节点在数组中的索引来计算角度，确保均匀分布
      const angle = (index - 2) * Math.PI / 3
      
      // 调整半径，确保节点在容器内
      const radius = Math.min(containerWidth, containerHeight) / 3

      node.x = centerX + Math.cos(angle) * radius
      node.y = centerY + Math.sin(angle) * radius

    }
  })

  // 创建图实例
  graph = new G6.Graph({
    container: g6Container.value,
    width: containerWidth,
    height: containerHeight,
    fitView: true,
    fitViewPadding: [50, 50, 50, 50],
    animate: true,
    
    modes: {
      default: [
        {
          type: 'drag-canvas',
          enableOptimize: true
        },
        {
          type: 'zoom-canvas',
          minZoom: 0.5,
          maxZoom: 2
        },
        'drag-node'
      ]
    },
    
    defaultNode: {
      type: 'image-only-node'
    },
    
    layout: {
      type: 'force',
      preventOverlap: true,
      nodeSpacing: 80,
      nodeStrength: -200,
      edgeStrength: 0,
      collideStrength: 0.8,
      alpha: 0.3,
      alphaDecay: 0.02,
      alphaMin: 0.001
    }
  })

  // 设置数据
  graph.data({ nodes, edges: [] })

  // 监听事件
  graph.on('node:mouseenter', (e) => {
    graph.setItemState(e.item, 'hover', true)
    g6Container.value.style.cursor = 'pointer'
  })

  graph.on('node:mouseleave', (e) => {
    graph.setItemState(e.item, 'hover', false)
    g6Container.value.style.cursor = 'default'
  })

  graph.on('node:click', (e) => {
    const nodeId = e.item.getModel().id
    const info = nodeInfo[nodeId]
    if (info) {
      selectedNode.value = info
      showNodeModal.value = true
    }
  })

  // 渲染
  graph.render()
  
  // 调整视图
  setTimeout(() => {
    if (graph) {
      graph.fitView([50, 50])
    }
  }, 500)
}

// 监听内容切换
watch(
  currentContent,
  async (val) => {
    if (val === 'huangmeixiang') {
      await nextTick()
      setTimeout(initGraph, 200)
      
    } else if (val === 'luomeiyinji') {
      // 等待DOM更新后再初始化
      await nextTick()
      // 确保容器有尺寸
      setTimeout(() => {
        initGraph2()
      }, 200)
    }
    else{
      // 销毁实例
      if (graph) {
        try {
          graph.destroy()
        } catch (error) {
          console.warn('Graph destroy error:', error)
        }
        graph = null
      }
      if (graph2.value) {
        try {
          graph2.value.destroy()
        } catch (error) {
          console.warn('Graph2 destroy error:', error)
        }
        graph2.value = null
      }
    }
    
  }
)

// 窗口大小变化处理
const handleResize = () => {
  // 处理知识图谱
  if (graph && g6Container.value && currentContent.value === 'huangmeixiang') {
    try {
      const width = g6Container.value.clientWidth
      const height = g6Container.value.clientHeight
      if (width > 0 && height > 0) {
        graph.changeSize(width, height)
        graph.fitView([50, 50])
      }
    } catch (error) {
      console.warn('Resize error:', error)
    }
  }
  
  // 处理时间轴
  if (graph2.value && timelineContainer.value && currentContent.value === 'luomeiyinji') {
    try {
      const width = timelineContainer.value.clientWidth
      const height = timelineContainer.value.clientHeight
      if (width > 0 && height > 0) {
        graph2.value.changeSize(width, height)
      }
    } catch (error) {
      console.warn('Resize error for timeline:', error)
    }
  }
}

// 生命周期
onMounted(() => {
  // 初始化梅花背景
  initPlumBackground()
  
  // 初始化图谱
  if (currentContent.value === 'huangmeixiang') {
    setTimeout(initGraph, 300)
  }

  if (currentContent.value === 'luomeiyinji') {
    setTimeout(initGraph2,200)
  }
  
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  if (graph) {
    try {
      graph.destroy()
    } catch (error) {
      console.warn('Graph destroy error:', error)
    }
    graph = null
  }
  
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  
  window.removeEventListener('resize', handleResize)
})
</script>

<style>
/* ============ 基础布局 ============ */
.app-container {
  position: relative;
  min-height: 100vh;
  background: url('https://cdn.jsdelivr.net/gh/lujiuj/hm-cdn-assents/assets/backgrounds/knowledge1.png') no-repeat;
  background-size: cover;
}

/* 梅花背景画布 */
.plum-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.main-content {
  position: relative;
  z-index: 2;
}

/* ============ 页头样式 ============ */
.page-header {
  background: url('https://cdn.jsdelivr.net/gh/lujiuj/hm-cdn-assents/assets/backgrounds/nav.png') no-repeat;
  background-size: cover;
  /* opacity: 0.8; */
  padding: 10px 300px;
  position: relative;
}

.nav-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 1;
}

@font-face {
            font-family: 'MyCustomFont2'; /* 定义字体名称 */
            src:url("https://cdn.jsdelivr.net/gh/lujiuj/hm-cdn-assents/fonts/YouSheBiaoTiHei.ttf") format('truetype'); /* 指定本地字体文件路径 */
        }

.logo {
  display: flex;
  align-items: center;
  font-size: 40px;
  font-weight: bold;
  font-family: MyCustomFont2, sans-serif;
  color: #070706;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
}

.main-nav {
  display: flex;
  gap: 100px;
}

.nav-item {
  color: #4e4e4e;
  text-decoration: none;
  font-size: 20px;
  font-weight: 500;
  padding: 10px 24px;
  position: relative;
  overflow: hidden;
}

.nav-item:hover {
  transform: translateY(-3px);
  color:#7a5984;
}

/* ============ 内容区域 ============ */
.content-wrapper {
  display: grid;
  grid-template-columns: 2fr 1fr;
}

/* ============ 知识图谱面板 ============ */
.knowledge-panel {
  position: relative;
  background: url('https://cdn.jsdelivr.net/gh/lujiuj/hm-cdn-assents/assets/backgrounds/tip-back.png') no-repeat;
  background-size: cover;
}

.graph-content {
  width: 100%;
  height: 100%;
  min-height: 600px;
  position: relative;
  display: flex;
  flex-direction: column;
}

.g6-wrapper {
  flex: 1;
  width: 100%;
  position: relative;
}

/* ============ 时间轴样式 ============ */
.timeline-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 30px 20px;
  position: relative;
  background: url('https://cdn.jsdelivr.net/gh/lujiuj/hm-cdn-assents/assets/backgrounds/timeline-back.png') no-repeat;
  background-size: cover;
}

.timeline-content {
  position: relative;
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 20px;
  /* 流式布局，自动换行 */
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 20px

}

.timeline-content::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 20px;
  right: 20px;
  height: 8px;
  transform: translateY(-50%);
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 152, 0, 0.3),
    transparent
  );
  animation: timeline-glow 3s ease-in-out infinite;
  z-index: 1;
}

@keyframes timeline-glow {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.8; }
}

.timeline-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: calc(25% - 20px); /* 每行显示个数 */
  min-width: 180px;
  opacity: 0;
  animation: timeline-fade-in 0.6s ease forwards;
  animation-delay: var(--delay);
  z-index: 2;
}

@keyframes timeline-fade-in {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.timeline-node {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
}

.node-inner {
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, var(--huangmei-yellow), var(--huangmei-orange));
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 15px rgba(255, 152, 0, 0.4);
  transition: all 0.3s ease;
  cursor: pointer;
}

.node-icon {
  font-size: 24px;
}

.timeline-item.active .node-inner {
  transform: scale(1.2);
  box-shadow: 0 6px 25px rgba(255, 152, 0, 0.6);
}

.timeline-item.active .node-pulse {
  animation: pulse 1s ease-out infinite;
}

.timeline-card {
  /* background: #fff; */
  border-radius: 15px;
  /* padding: 20px; */
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 2px solid transparent;
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.card-content {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  margin-bottom: 10px;
}

.card-detail {
  font-size: 13px;
  color: #888;
  padding: 10px;
  background: rgba(255, 152, 0, 0.05);
  border-radius: 8px;
  border-left: 3px solid var(--huangmei-orange);
}

/* ============ 视频面板 ============ */
.video-container {
  position: relative;
  padding-top: 130%;
  overflow: hidden;
  background: #000;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.digital-human-video {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* ============ 节点详情弹窗 ============ */
.node-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}

.node-modal {
  background: url('https://cdn.jsdelivr.net/gh/lujiuj/hm-cdn-assents/assets/backgrounds/background1.png') no-repeat;
  background-size: cover;
  border-radius: 20px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  position: relative;
}

.modal-close {
  position: absolute;
  top: 15px;
  right: 15px;
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  z-index: 1;
}

.modal-close:hover {
  background: rgba(255, 87, 34, 0.2);
}

.modal-body {
  padding: 25px;
}

.modal-body h2 {
  color: var(--huangmei-brown);
  margin: 0 0 15px;
  font-size: 24px;
  color:#385064;
}

.modal-description {
  color: #5e4f30;
  line-height: 1.7;
  text-align: left;
  text-indent: 2em;
}

.modal-details {
  background: rgba(255, 152, 0, 0.08);
  padding: 15px;
  border-radius: 12px;
}

.modal-details h4 {
  margin: 0 0 10px;
  font-size: 14px;
  color:#7a5984;
  text-align:left;
}

.modal-details p {
  color: #1d1c1c;
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  text-align: left;
  text-indent: 2em;
}

.modal-footer {
  padding: 15px 25px 25px;
  display: flex;
  gap: 10px;
}

.tag {
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
}

.tag.huangmei {
  background: var(--huangmei-yellow);
  color: var(--huangmei-brown);
}

.tag.culture {
  background: linear-gradient(135deg, #ffecb3, #ffcc80);
  color: var(--huangmei-brown);
}

/* 弹窗动画 */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .node-modal,
.modal-leave-to .node-modal {
  transform: scale(0.9) translateY(20px);
}

/* ============ G6 Tooltip 样式 ============ */
.g6-tooltip,
.g6-component-tooltip {
  background: none !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0 !important;
}

/* ============ 响应式设计 ============ */
@media (max-width: 1200px) {
  .content-wrapper {
    grid-template-columns: 1fr;
  }
  
  .video-panel {
    order: -1;
  }
  
  .video-container {
    padding-top: 56.25%;
  }
}

@media (max-width: 768px) {
  .nav-container {
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }
  
  .main-nav {
    gap: 15px;
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .nav-item {
    font-size: 15px;
    padding: 8px 16px;
  }
  
  .page-header {
    padding: 15px 20px;
  }
  
  .content-wrapper {
    padding: 10px;
    gap: 10px;
  }
  
  .graph-content {
    min-height: 400px;
  }
  
  .timeline-item.left,
  .timeline-item.right {
    padding-left: 60px;
    padding-right: 10px;
    flex-direction: row;
  }
  
  .timeline-line {
    left: 30px;
  }
  
  .timeline-node {
    left: 30px;
  }
  
  .node-inner {
    width: 40px;
    height: 40px;
  }
  
  .node-icon {
    font-size: 18px;
  }
}
</style>
