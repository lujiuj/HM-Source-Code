// index.js 
//路由配置
import { createWebHistory, createRouter } from 'vue-router'

import Watch from '../pages/Watch.vue'
import Play from '../pages/Play.vue'
import Home from '../pages/Home.vue'
import Stages from '../pages/Stages.vue';
import Learn from '../pages/Learn.vue'
import Tip from '../pages/Tip.vue'
import Create from '../pages/Create.vue'
// 每一个跳转的页面都要导入，否则无法显示

const routes = [
  { path: '/watch', component: Watch },
  { path: '/play', component: Play },
  {path:'/',component: Home},
  { path: '/tip', component: Tip },
  { path: '/create', component: Create },
  { path: '/learn', component: Learn },
  { path:'/stages',name:"Stages", component:Stages}
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router