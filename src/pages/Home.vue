<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const typeRef = ref('line')
const placementRef = ref('top')
const directionRef = ref('horizontal')
const showArrow = ref(true)
const type = typeRef
const placement = placementRef
const direction = directionRef

function gotoWatch() {
  router.push('/watch')
}
function gotoPlay() {
  router.push('/play')
}
function gotoTip() {
  router.push('/tip')
}
function gotoLearn() {
  router.push('/learn')
}
function gotoCreate() {
  router.push('/create')
}
</script>

<template>
  <div class="home-container">
   <PlumParticleAnimation />
    <!-- 头部 -->
    <div class="nav">
      <div class="header">
        <!-- <img src="../assets/icon/icon1.png" alt="Logo" class="logo"> -->
        <h1 class="title">梅韵新声</h1>
      </div>
    </div>
  
    <!-- 轮播图 -->
    <div class="carousel-container">
      <div class="carousel-wrapper">
        <n-carousel autoplay interval="3000"
          :direction="direction"
          :show-arrow="showArrow"
          :dot-type="type"
          :dot-placement="placement"
          style="height: 50vh; width: 100%"
        >
          <div class="slides slide0" @click="gotoWatch">
            <div class="slide-content">
                <div class="slide-title">观戏</div>
               
            </div>
          </div>
          <div class="slides slide1" @click="gotoPlay">
            <div class="slide-content">
              <div class="slide-title">入戏</div>
              
            </div>
          </div>
          <div class="slides slide2" @click="gotoLearn">    
            <div class="slide-content">
              <div class="slide-title">学戏</div>
          
            </div>
          </div>
          <div class="slides slide3" @click="gotoCreate">
            <div class="slide-content">
              <div class="slide-title">创戏</div>
              
            </div>
          </div>
        </n-carousel>
      </div>

      <div class="tip-button" @click="gotoTip">
        黄梅图谱
      </div>
    </div>

    <div class="font">
        <div class="txt">戏说黄梅</div>
    </div>

  </div>
</template>

<style scoped>

.home-container {
  width: 100vw;
  height: 100vh;
  background:url('https://cdn.jsdelivr.net/gh/lujiuj/hm-cdn-assents/assets/backgrounds/home-back.png') no-repeat;
  background-size: cover;
  /* display: flex;
  flex-direction: column; */
  align-items: center;
  position: relative;
  overflow: hidden;
  z-index:0;
}

/* 头部 */
.header {
  display: flex;
  align-items: left;
  margin-top: 10px;
  margin-left:250px;
  margin-bottom: -35px;
}

/* .logo {
  width: 100px;
  height: 100px;
  margin-right: 15px;
} */

.title {
  font-size: 48px;
  font-weight: bold;
  color: #333;
  font-family: MyCustomFont2, sans-serif;
}

/* 轮播图 */
.carousel-container {
  background:url('https://cdn.jsdelivr.net/gh/lujiuj/hm-cdn-assents/assets/icon/frame01.png') no-repeat;
  background-size: contain;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  
  /* height: ; */
}

.carousel-wrapper {

  padding-top:90px;
  padding-bottom: 20px;
  height: 50vh;
  width: 100%;
  max-width: 1000px;

}

.slides {
  background: #f5f5f5;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  opacity: 0.9;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20px;
}

.slides:hover {
  cursor: pointer;
}

@font-face {
            font-family: 'MyCustomFont2'; /* 定义字体名称 */
            src:url('https://cdn.jsdelivr.net/gh/lujiuj/hm-cdn-assents/fonts/YouSheBiaoTiHei.ttf') format('truetype'); /* 指定CDN字体文件路径 */
        }
@font-face {
            font-family: 'MyCustomFont'; /* 定义字体名称 */
            src:url('https://cdn.jsdelivr.net/gh/lujiuj/hm-cdn-assents/fonts/微软雅黑.ttc') format('truetype'); /* 指定CDN字体文件路径 */
        }
@font-face {
            font-family: 'MyCustomFont3'; /* 定义字体名称 */
            src:url('https://cdn.jsdelivr.net/gh/lujiuj/hm-cdn-assents/fonts/演示流云楷.ttf') format('truetype'); /* 指定CDN字体文件路径 */
        }
.slide-title {
  font-size: 170px;
  font-weight: bold;
  letter-spacing: 70px;
  color: #625e5e;
  font-family: MyCustomFont3, sans-serif;
}
.slide-title:hover {
  color: #000000;
  font-size: 200px;
}

.slide0{
  background-image: url('https://cdn.jsdelivr.net/gh/lujiuj/hm-cdn-assents/assets/backgrounds/slide2.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}
.slide1{
  background-image: url('https://cdn.jsdelivr.net/gh/lujiuj/hm-cdn-assents/assets/backgrounds/slide3.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}
.slide2{
  background-image: url('https://cdn.jsdelivr.net/gh/lujiuj/hm-cdn-assents/assets/backgrounds/slide4.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}
.slide3{
  background-image: url('https://cdn.jsdelivr.net/gh/lujiuj/hm-cdn-assents/assets/backgrounds/slide1.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}
/* 黄梅图谱 */
.tip-button {
  background:url('https://cdn.jsdelivr.net/gh/lujiuj/hm-cdn-assents/assets/icon/frame02.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  width:500px;
  height:200px;
  font-size: 60px;
  font-family: MyCustomFont3, sans-serif;
  font-weight: bold;
  color: #8a4d07;
  cursor: pointer;
  margin-top:90px;
  padding-bottom: 20px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index:100;
}

.tip-button:hover {
  transform: translateY(-2px);
  /* box-shadow: 0 4px 8px rgba(0,0,0,0.3); */
}

/* 响应式调整 */
@media (max-width: 768px) {
  .film-container {
    flex-direction: column;
    gap: 20px;
  }
  
  .flower-decoration {
    display: none;
  }
  
  .button-text {
    font-size: 20px;
    letter-spacing: 8px;
  }
  
  .film-frame {
    width: 120px;
    height: 160px;
  }
}
.font{
    width:100%;
    /*height:400px;*/
    text-align: center;
    background: white;
    margin-top: 100px;
}

.txt{
            font-family: MyCustomFont3, sans-serif;
            font-size: 150px;
            /* cursor: pointer; */
            color: #100606;
            text-shadow: 2px 2px 4px rgba(88,99,66,0.5);
            margin-top: 20px;
            user-select:none;
        }
</style>