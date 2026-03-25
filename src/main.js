import { createApp } from 'vue'
import './style.css'
import './learn/styles/learn-theme.less'
import './learn/styles/learn-layout.less'
import App from './App.vue'
import router from './router'
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


createApp(App).use(router).use(naive).mount('#app');
