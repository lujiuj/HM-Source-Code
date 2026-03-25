// index.js 
// 路由配置
import { createWebHistory, createRouter } from 'vue-router'
import Watch from '../pages/Watch.vue'
import Play from '../pages/Play.vue'
import Home from '../pages/Home.vue'
import Stages from '../pages/Stages.vue'
import Tip from '../pages/Tip.vue'
import Create from '../pages/Create.vue'

// 学戏模块
const SongSelect = () => import('../learn/pages/SongSelect.vue')
const KaraokeView = () => import('../learn/pages/KaraokeView.vue')
const MasterLibrary = () => import('../learn/pages/MasterLibrary.vue')
const MasterAnalysis = () => import('../learn/pages/MasterAnalysis.vue')
const LearnWorks = () => import('../learn/pages/LearnWorks.vue')
const WorkDetail = () => import('../learn/pages/WorkDetail.vue')
const PublishFromPractice = () => import('../learn/pages/PublishFromPractice.vue')
const PracticeHistory = () => import('../learn/pages/PracticeHistory.vue')
const LearnLeaderboard = () => import('../learn/pages/LearnLeaderboard.vue')
const LearnShell = () => import('../learn/pages/LearnShell.vue')
const LearningJourney = () => import('../learn/pages/LearningJourney.vue')

const routes = [
  { path: '/', component: Home }, 
  { path: '/watch', component: Watch },
  { path: '/play', component: Play },
  { path: '/stages', name: 'Stages', component: Stages },
  { path: '/tip', component: Tip },
  { path: '/create', component: Create },
  
  // 学戏模块 - 嵌套路由
  {
    path: '/learn',
    component: LearnShell,
    redirect: '/learn/practice', // 默认进入练习页面
    children: [
      { path: 'practice', name: 'LearnPractice', component: SongSelect },
      { 
        path: 'practice/karaoke', 
        name: 'LearnKaraoke', 
        component: KaraokeView, 
        meta: { hideLearnShellNav: true, learnShellMode: 'immersive' } 
      },
      { path: 'practice/leaderboard', name: 'LearnPracticeLeaderboard', component: LearnLeaderboard },
      { path: 'practice/history', name: 'LearnPracticeHistory', component: PracticeHistory },
      {
        path: 'practice/history/:practiceId',
        name: 'LearnPracticePublish',
        component: PublishFromPractice,
        meta: { hideLearnShellNav: true, learnShellMode: 'immersive' },
        props: true // 开启props传参，解耦路由与组件
      },
      { path: 'works', name: 'LearnWorks', component: LearnWorks },
      {
        path: 'works/:workId',
        name: 'LearnWorkDetail',
        component: WorkDetail,
        meta: { hideLearnShellNav: true, learnShellMode: 'immersive' },
        props: true
      },
      { path: 'master', name: 'LearnMaster', component: MasterLibrary },
      {
        path: 'analysis/:songId?', // songId为可选参数
        name: 'MasterAnalysis',
        component: MasterAnalysis,
        props: true
      },
      { path: 'journey', name: 'LearnJourney', component: LearningJourney }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  // 返回上一页保留滚动位置,平滑滚动
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0, behavior: 'smooth' }
    }
  }
})

export default router