import { createApp } from 'vue'
import './style.css'
import './learn/styles/learn-theme.less'
import './learn/styles/learn-layout.less'
import App from './App.vue'
import router from './router'
import { initInfra } from './shared/infra/index.js'
import {
  // create naive ui
  create,
  // component
  NButton,
  NSpace,
  NRadioGroup,
  NRadioButton,
  NSwitch,
  NCarousel
} from 'naive-ui'

const naive = create({
  components: [NButton, NSpace, NRadioGroup, NRadioButton, NSwitch, NCarousel]
})

async function bootstrap() {
  const app = createApp(App).use(router).use(naive)
  if ((import.meta.env.VITE_INFRA_MODE || 'local') === 'supabase') {
    await initInfra('supabase')
  }
  app.mount('#app')
}

bootstrap()
