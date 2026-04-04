<template>
  <div :class="['learn-shell bg-pattern text-slate-900',{'learn-shell--immersive':isImmersiveMode}]" :style="shellStyle">
    <div v-if="shellPanelsOpen&&!isImmersiveMode" class="shell-backdrop" @click="closePanels"></div>
    <div class="flex h-screen w-full flex-col lg:flex-row lg:overflow-hidden">
      <aside v-if="showShellNav" class="learn-shell__sidebar hidden h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-antique-gold/10 bg-white/80 backdrop-blur-sm lg:flex">
        <div class="p-6">
          <button class="group mb-10 flex items-center gap-3" @click="router.push('/')">
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#a34135] to-[#8b3232] text-white shadow-[0_4px_16px_rgba(163,65,53,0.35)] transition group-hover:scale-110 group-hover:shadow-[0_6px_24px_rgba(163,65,53,0.45)]"><span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1">theater_comedy</span></div>
            <h2 class="text-xl font-bold tracking-tight text-[#a34135]" style="font-family:'LXGW WenKai','STKaiti',cursive">黄梅研习</h2>
          </button>
          <nav class="space-y-2">
            <button v-for="item in navItems" :key="item.key" class="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition" :class="activeTabKey===item.key?'active-nav bg-[#a34135]/10 text-[#a34135]':'text-stone hover:bg-[#a34135]/5'" @click="router.push(item.path)">
              <span class="material-symbols-outlined" :class="activeTabKey!==item.key?'text-stone':''" :style="activeTabKey===item.key?'font-variation-settings: \u0027FILL\u0027 1':''">{{ item.icon||'radio_button_unchecked' }}</span>
              <span class="text-sm font-medium">{{ item.label }}</span>
            </button>
          </nav>
        </div>
        <div class="mt-auto p-6 pt-4">
          <div class="sidebar-progress-card">
            <p class="sidebar-progress-card__eyebrow">当前进度</p>
            <h3>{{ levelBadgeText }}</h3>
            <p class="sidebar-progress-card__copy">{{ studySummary?.nextLevelHint||'完成一段练唱后，等级与喝彩权益会同步刷新。' }}</p>
            <div class="sidebar-progress-card__meta"><span>经验 {{ studySummary?.totalExp||0 }}</span><span>喝彩 {{ giftProfile.giftBalance||0 }}</span></div>
          </div>
        </div>
      </aside>
      <main class="flex h-screen min-w-0 flex-1 flex-col overflow-y-auto">
        <header v-if="showShellNav" class="learn-shell__header sticky top-0 z-50 flex items-center justify-between border-b border-antique-gold/10 px-5 py-4 md:px-7 lg:px-8 backdrop-blur-md">
          <div class="flex items-center gap-4">
            <button class="flex h-9 w-9 items-center justify-center rounded-full border border-antique-gold/20 bg-white/80 text-cinnabar transition hover:bg-cinnabar/10 lg:hidden" @click="router.push('/')"><span class="material-symbols-outlined text-[20px]">arrow_back</span></button>
            <div><p class="header-kicker">{{ pageKicker }}</p><h1 class="shufa text-[clamp(1.05rem,1.55vw,1.34rem)] font-bold tracking-tight text-slate-800">{{ pageTitle }}</h1><p class="header-copy hidden md:block">{{ pageSubtitle }}</p></div>
          </div>
          <div class="relative z-[60] flex items-center gap-2">
            <button class="relative rounded-full p-2 transition-colors hover:bg-[#a34135]/10" @click="toggleNotifications"><span class="material-symbols-outlined text-stone">notifications</span><span v-if="unreadCount" class="absolute right-0 top-0 flex min-w-[16px] items-center justify-center rounded-full bg-[#a34135] px-1 text-[9px] font-bold text-white">{{ unreadCount>99?'99+':unreadCount }}</span></button>
            <button class="profile-hub ml-1" @click="toggleProfileMenu">
              <div class="profile-hub__avatar avatar-shell avatar-shell-sm"><div v-if="isImageAvatar(profileDraft.avatar)" class="avatar-photo" :style="{ backgroundImage:`url(${profileDraft.avatar})` }"></div><LearnAvatarPreset v-else :value="profileDraft.avatar" :name="profileDraft.displayName" :size="34" framed /></div>
              <div class="profile-hub__body hidden sm:block"><strong>{{ profileDraft.displayName||'戏友' }}</strong><span>{{ levelBadgeText }}</span></div>
              <div class="profile-hub__chips hidden lg:flex"><span class="profile-hub__chip">经验 {{ studySummary?.totalExp||0 }}</span><span class="profile-hub__chip">喝彩 {{ giftProfile.giftBalance||0 }}</span></div>
            </button>
            <div v-if="showNotifications" class="panel-pop absolute right-4 top-[52px] z-50 w-[360px] rounded-xl border border-primary/12 bg-white/95 p-5 shadow-[0_20px_60px_rgba(61,42,28,0.14)] backdrop-blur" @click.stop>
              <div class="mb-4 flex items-center justify-between"><div><p class="text-[10px] tracking-[0.28em] text-primary/60">消息提醒</p><h3 class="text-base font-bold">作品互动</h3></div><button class="text-xs font-bold text-primary" @click="markNotificationsRead">全部已读</button></div>
              <div v-if="notificationsLoading" class="space-y-3"><div v-for="n in 3" :key="n" class="h-16 animate-pulse rounded-xl bg-primary/8"></div></div>
              <div v-else-if="notificationItems.length" class="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                <button v-for="item in notificationItems" :key="item.id" class="w-full rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:border-primary/25" :class="item.readAt?'border-primary/8 bg-learn-surface-2':'border-primary/20 bg-learn-surface-3 shadow-[0_8px_20px_rgba(212,175,55,0.08)]'" @click="openNotification(item)">
                  <div class="flex items-start gap-3">
                    <div class="avatar-shell avatar-shell-sm shrink-0"><div v-if="isImageAvatar(item.actorAvatar)" class="avatar-photo" :style="{ backgroundImage:`url(${item.actorAvatar})` }"></div><LearnAvatarPreset v-else :value="item.actorAvatar||profileDraft.avatar" :name="item.actorName" :size="36" framed /></div>
                    <div class="min-w-0 flex-1"><div class="mb-0.5 flex items-center justify-between gap-2"><p class="truncate text-sm font-bold text-slate-800">{{ item.actorName }}</p><span class="shrink-0 text-[10px] text-slate-400">{{ item.timeText }}</span></div><p class="text-[13px] leading-5 text-slate-600">{{ item.summary }}</p><p class="mt-1 text-[11px] font-medium text-primary/70">{{ item.songName||'黄梅选段' }}</p></div>
                  </div>
                  <div v-if="!item.readAt" class="mt-2 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">未读</div>
                </button>
              </div>
              <div v-else class="rounded-xl border border-dashed border-primary/15 bg-primary/4 px-4 py-8 text-center text-sm text-slate-400">还没有新的评论或送礼提醒。</div>
            </div>
            <div v-if="showProfileMenu" class="panel-pop absolute right-0 top-[52px] z-50 max-h-[min(80vh,720px)] w-[min(92vw,420px)] overflow-y-auto rounded-xl border border-primary/12 bg-white/95 p-5 shadow-[0_20px_60px_rgba(61,42,28,0.14)] backdrop-blur" @click.stop>
              <div class="mb-4 flex items-center justify-between"><div><p class="text-[10px] tracking-[0.28em] text-primary/60">研习名片</p><h3 class="text-base font-bold">头像、等级与喝彩</h3></div><button class="text-xs font-bold text-primary" @click="saveProfileEdits">保存</button></div>
              <div class="mb-5 flex items-center gap-4">
                <div class="avatar-shell avatar-shell-lg"><div v-if="isImageAvatar(profileDraft.avatar)" class="avatar-photo" :style="{ backgroundImage:`url(${profileDraft.avatar})` }"></div><LearnAvatarPreset v-else :value="profileDraft.avatar" :name="profileDraft.displayName" :size="72" framed /></div>
                <div class="flex-1"><label class="mb-1 block text-[11px] font-bold tracking-[0.2em] text-slate-400">昵称</label><input v-model.trim="profileDraft.displayName" maxlength="12" class="w-full rounded-xl border border-primary/12 bg-learn-surface-1 px-4 py-2.5 text-sm font-medium outline-none transition focus:border-primary" placeholder="请输入你的戏名" /></div>
              </div>
              <div class="profile-summary-grid">
                <article class="profile-summary-card" :class="profileDetailOpen.progress ? 'is-expanded' : ''">
                  <button class="profile-summary-card__toggle" @click="toggleProfileDetail('progress')">
                    <div>
                      <p class="profile-summary-card__eyebrow">等级进度</p>
                      <div class="profile-summary-card__headline"><strong>{{ levelBadgeText }}</strong><span>{{ studySummary?.title||'初入戏门' }}</span></div>
                    </div>
                    <span class="material-symbols-outlined text-[18px] text-[#8b3232]">{{ profileDetailOpen.progress ? 'expand_less' : 'expand_more' }}</span>
                  </button>
                  <div class="profile-summary-card__bar"><i :style="{ width:`${studySummary?.progressPercent||0}%` }"></i></div>
                  <div class="profile-summary-card__details">
                    <p class="profile-summary-card__copy">{{ studySummary?.nextLevelHint||'完成练唱、闯关与发布会继续累计经验。' }}</p>
                    <div class="profile-summary-card__list"><div v-for="item in (studySummary?.expBreakdown||[]).slice(0,4)" :key="item.id" class="profile-summary-card__row"><span>{{ item.label }}</span><strong>+{{ item.value }}</strong></div></div>
                  </div>
                </article>
                <article class="profile-summary-card profile-summary-card--gold" :class="profileDetailOpen.gifts ? 'is-expanded' : ''">
                  <button class="profile-summary-card__toggle" @click="toggleProfileDetail('gifts')">
                    <div>
                      <p class="profile-summary-card__eyebrow">喝彩值</p>
                      <div class="profile-summary-card__headline"><strong>{{ giftProfile.giftBalance||0 }}</strong><span>当前可送余额</span></div>
                    </div>
                    <span class="material-symbols-outlined text-[18px] text-[#8b3232]">{{ profileDetailOpen.gifts ? 'expand_less' : 'expand_more' }}</span>
                  </button>
                  <div class="profile-summary-card__meta-line"><span>单次上限 {{ giftProfile.perSendCap||0 }}</span><span>今日上限 {{ giftProfile.dailyGiftCap||0 }}</span></div>
                  <div class="profile-summary-card__details">
                    <p class="profile-summary-card__copy">喝彩值来自等级成长、闯关进度、曲目完成与公开发布，不是固定送出的虚值。</p>
                    <div class="profile-summary-card__list"><div v-for="item in giftSourceItems" :key="item.id" class="profile-summary-card__row"><span>{{ item.label }}</span><strong>+{{ item.value }}</strong></div></div>
                  </div>
                </article>
              </div>
              <div class="mb-4"><div class="mb-2 flex items-center justify-between"><label class="text-[11px] font-bold tracking-[0.2em] text-slate-400">预设头像</label><button class="text-xs font-bold text-primary" @click="triggerAvatarUpload">上传头像</button></div>
                <div class="grid grid-cols-4 gap-2"><button v-for="preset in avatarPresets" :key="preset.id" class="rounded-xl border px-2 py-2.5 transition" :class="profileDraft.avatar===`preset:${preset.id}`?'border-primary bg-primary/8':'border-primary/8 bg-learn-surface-1 hover:border-primary/25'" @click="pickAvatarPreset(preset.id)"><div class="mx-auto mb-1.5 flex items-center justify-center"><LearnAvatarPreset :value="`preset:${preset.id}`" :name="profileDraft.displayName" :size="48" framed /></div><span class="block text-[10px] font-bold text-slate-600">{{ preset.label }}</span></button></div>
              </div>
              <input ref="avatarInputRef" class="hidden" type="file" accept="image/png,image/jpeg,image/webp" @change="onAvatarFileChange" />
              <p class="rounded-xl bg-primary/5 px-4 py-2.5 text-[11px] leading-5 text-slate-400">支持 JPG、PNG、WebP。上传后会自动裁成方形头像，并直接保存在你的研习资料里。</p>
            </div>
          </div>
        </header>
        <div :class="['flex flex-1 flex-col',isImmersiveMode?'w-full':'mx-auto w-full max-w-[1520px] px-4 pb-16 md:px-6 lg:px-8 lg:pb-0']"><router-view v-slot="{ Component }"><transition name="page-fade" mode="out-in"><component :is="Component" :key="route.fullPath" /></transition></router-view></div>
      </main>
      <nav v-if="showShellNav" class="learn-shell__mobile-nav fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-antique-gold/10 bg-white/95 backdrop-blur-md lg:hidden">
        <button v-for="item in navItems" :key="item.key" class="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-bold transition" :class="activeTabKey===item.key?'text-[#a34135]':'text-stone/60'" @click="router.push(item.path)"><span class="material-symbols-outlined text-[20px]">{{ item.icon||'radio_button_unchecked' }}</span>{{ item.label }}</button>
      </nav>
    </div>
  </div>
</template>

<script setup>
import { computed,onBeforeUnmount,onMounted,ref,watch } from 'vue'
import { useRoute,useRouter } from 'vue-router'
import LearnAvatarPreset from '../components/common/LearnAvatarPreset.vue'
import { LEARN_AVATAR_PRESETS } from '../../shared/infra/profileUtils.js'
import { getInfra } from '../../shared/infra/index.js'
import { formatRelativeTime } from '../utils/learnCatalog.js'
import { syncJourneyProgress,touchStudyVisit } from '../utils/studyProgress.js'
const route=useRoute(),router=useRouter(),infra=getInfra(),uid=infra.identity.getUid()
const navItems=[{key:'practice',label:'练唱试戏',path:'/learn/practice',icon:'mic'},{key:'journey',label:'学习演练',path:'/learn/journey',icon:'map'},{key:'works',label:'作品展演',path:'/learn/works',icon:'library_music'},{key:'master',label:'名师解构',path:'/learn/master',icon:'school'}]
const pageMetaMap={practice:{title:'练唱试戏',subtitle:'选曲、开唱、上传分析都在这里完成。'},journey:{title:'学习演练',subtitle:'沿着关卡一路推进，当前重点和下一步会清楚展开。'},works:{title:'作品展演',subtitle:'把你的作品、互动回应和舞台反馈集中放在这里。'},master:{title:'名师解构',subtitle:'先看懂名师怎么唱，再带着方法回去练。'}}
const avatarPresets=LEARN_AVATAR_PRESETS,showNotifications=ref(false),showProfileMenu=ref(false),notificationsLoading=ref(false),notificationItems=ref([]),avatarInputRef=ref(null),profileDraft=ref({ ...infra.identity.getProfile() }),studySummary=ref(null),profileDetailOpen=ref({progress:false,gifts:false})
const showShellNav=computed(()=>!route.meta?.hideLearnShellNav)
const isImmersiveMode=computed(()=>{const path=route.path||'';return route.name==='LearnKaraoke'||path.includes('karaoke')})
const activeTabKey=computed(()=>{const path=route.path||'';if(path.startsWith('/learn/practice'))return'practice';if(path.startsWith('/learn/works'))return'works';if(path.startsWith('/learn/master')||path.startsWith('/learn/analysis'))return'master';if(path.startsWith('/learn/journey'))return'journey';return'practice'})
const pageMeta=computed(()=>pageMetaMap[activeTabKey.value]||pageMetaMap.practice)
const pageKicker=computed(()=>'黄梅研习'),pageTitle=computed(()=>pageMeta.value.title),pageSubtitle=computed(()=>pageMeta.value.subtitle)
const shellStyle=computed(()=>({'--ls-content-height':showShellNav.value?'calc(100vh - var(--ls-header-height))':'100vh'}))
const unreadCount=computed(()=>notificationItems.value.filter(item=>!item.readAt).length),shellPanelsOpen=computed(()=>showNotifications.value||showProfileMenu.value)
const giftProfile=computed(()=>studySummary.value?.giftProfile||infra.identity.getProfile()||{}),levelBadgeText=computed(()=>`Lv.${studySummary.value?.level||1}`)
const giftSourceItems=computed(()=>{const ledger=giftProfile.value?.giftLedgerSummary||{};return[{id:'journey',label:'闯关进度',value:Number(ledger.journey||0)},{id:'quiz',label:'答题通关',value:Number(ledger.quiz||0)},{id:'repertoire',label:'曲目完成',value:Number(ledger.repertoire||0)},{id:'level',label:'等级成长',value:Number(ledger.level||0)},{id:'publish',label:'公开发布',value:Number(ledger.publish||0)}].filter(item=>item.value>0)})
function refreshProfileDraft(){profileDraft.value={ ...infra.identity.getProfile() }}
function handleProfileUpdated(event){const nextProfile=event?.detail&&typeof event.detail==='object'?event.detail:infra.identity.getProfile();profileDraft.value={ ...profileDraft.value,...nextProfile }}
function handleProfileStorage(event){if(event?.key&&event.key!=='hmx_learn_profile_v2'&&event.key!=='karaoke_display_name')return;handleProfileUpdated({detail:infra.identity.getProfile()})}
function isImageAvatar(value){return String(value||'').startsWith('data:image/')}
function closePanels(){showNotifications.value=false;showProfileMenu.value=false;profileDetailOpen.value={progress:false,gifts:false}}
async function refreshStudySummary(){studySummary.value=await syncJourneyProgress(infra.identity,infra);refreshProfileDraft()}
async function readFileAsAvatar(file){const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>reject(reader.error||new Error('avatar-read-failed'));reader.readAsDataURL(file)});const image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('avatar-load-failed'));img.src=dataUrl});const canvas=document.createElement('canvas');canvas.width=192;canvas.height=192;const ctx=canvas.getContext('2d');if(!ctx)return dataUrl;const width=image.width||192,height=image.height||192,side=Math.min(width,height),sx=Math.max(0,Math.floor((width-side)/2)),sy=Math.max(0,Math.floor((height-side)/2));ctx.drawImage(image,sx,sy,side,side,0,0,192,192);return canvas.toDataURL('image/jpeg',0.88)}
async function saveProfileEdits(){const nextName=String(profileDraft.value.displayName||'').trim()||'戏友';const saved=await infra.identity.saveProfile({displayName:nextName,avatar:profileDraft.value.avatar});profileDraft.value={ ...saved };showProfileMenu.value=false;profileDetailOpen.value={progress:false,gifts:false}}
function pickAvatarPreset(id){profileDraft.value={ ...profileDraft.value,avatar:`preset:${id}` }}
function triggerAvatarUpload(){avatarInputRef.value?.click()}
async function onAvatarFileChange(event){const file=event.target?.files?.[0];if(!file)return;const isSupported=['image/png','image/jpeg','image/webp'].includes(file.type);if(!isSupported||file.size>2*1024*1024){window.alert('头像仅支持 2MB 以内的 JPG、PNG、WebP 图片。');event.target.value='';return}const avatar=await readFileAsAvatar(file);profileDraft.value={ ...profileDraft.value,avatar };event.target.value=''}
function toggleProfileDetail(key){profileDetailOpen.value={...profileDetailOpen.value,[key]:!profileDetailOpen.value[key]}}
function giftLabel(type){if(type==='flower')return'鲜花';if(type==='tea')return'敬茶';if(type==='trophy')return'奖杯';return'喝彩值'}
function notificationSummaryFromEvent(item){if(item.type==='gift_sent')return`送出 ${giftLabel(item.giftType)} × ${item.giftCount||1}`;const text=String(item.commentText||'').trim();if(!text)return'评论了你的作品';return`评论：${text.slice(0,30)}${text.length>30?'…':''}`}
async function loadNotifications(){notificationsLoading.value=true;try{const events=await infra.interaction.listInteractionEvents(uid,80);const uniqueWorkIds=[...new Set(events.map(item=>item.workId).filter(Boolean))];const works=await Promise.all(uniqueWorkIds.map(async workId=>[workId,await infra.works.getWork(workId)]));const workMap=new Map(works.filter(([,work])=>work).map(([workId,work])=>[workId,work]));notificationItems.value=events.map(item=>({id:item.id,type:item.type,workId:item.workId,songName:workMap.get(item.workId)?.songName||'黄梅选段',actorName:item.actorSnapshot?.username||'戏友',actorAvatar:item.actorSnapshot?.avatar||'',timestamp:item.timestamp||0,readAt:item.readAt||null,giftType:item.giftType,giftCount:item.giftCount,commentText:item.commentText,timeText:formatRelativeTime(item.timestamp),summary:notificationSummaryFromEvent(item)}));const unread=notificationItems.value.filter(item=>!item.readAt).length;await infra.identity.saveProfile({unreadInteractionCount:unread});refreshProfileDraft()}finally{notificationsLoading.value=false}}
async function markNotificationsRead(eventIds=[]){const readAt=Date.now();await infra.interaction.markInteractionEventsRead(uid,eventIds,readAt);const targetSet=Array.isArray(eventIds)&&eventIds.length?new Set(eventIds):null;notificationItems.value=notificationItems.value.map(item=>{if(item.readAt)return item;if(targetSet&&!targetSet.has(item.id))return item;return{ ...item,readAt }});const unread=notificationItems.value.filter(item=>!item.readAt).length;await infra.identity.saveProfile({notifications:{...(infra.identity.getProfile()?.notifications||{}),lastReadAt:readAt},unreadInteractionCount:unread});refreshProfileDraft()}
async function toggleNotifications(){showNotifications.value=!showNotifications.value;showProfileMenu.value=false;if(showNotifications.value)await loadNotifications()}
function toggleProfileMenu(){showProfileMenu.value=!showProfileMenu.value;showNotifications.value=false;if(!showProfileMenu.value)profileDetailOpen.value={progress:false,gifts:false}}
function handleGlobalKeydown(event){if(event.key!=='Escape')return;closePanels()}
async function openNotification(item){showNotifications.value=false;if(item?.id&&!item.readAt)await markNotificationsRead([item.id]);if(!item?.workId)return;router.push({path:`/learn/works/${item.workId}`,query:{focus:'interactions'}})}
onMounted(async()=>{window.addEventListener('keydown',handleGlobalKeydown);window.addEventListener('learn-profile-updated',handleProfileUpdated);window.addEventListener('storage',handleProfileStorage);await touchStudyVisit(infra.identity);refreshProfileDraft();await refreshStudySummary();void loadNotifications()})
onBeforeUnmount(()=>{window.removeEventListener('keydown',handleGlobalKeydown);window.removeEventListener('learn-profile-updated',handleProfileUpdated);window.removeEventListener('storage',handleProfileStorage)})
watch(()=>route.fullPath,async()=>{showNotifications.value=false;showProfileMenu.value=false;await refreshStudySummary()})
</script>

<style scoped lang="less">
.learn-shell {
  --ls-header-height: 64px;
  --ls-sidebar-width: 248px;
  --ls-content-height: calc(100vh - var(--ls-header-height));
  position: relative;
  min-height: 100vh;
  overflow-x: hidden;
  background:
    radial-gradient(circle at top left, rgba(163, 65, 53, 0.16), transparent 28%),
    radial-gradient(circle at 85% 14%, rgba(212, 175, 55, 0.18), transparent 22%),
    linear-gradient(180deg, rgba(253, 248, 240, 0.94) 0%, rgba(242, 230, 212, 0.84) 54%, rgba(233, 212, 188, 0.88) 100%),
    url('/images/learn/bg/bg1.webp');
  background-size: auto, auto, auto, cover;
  background-position: top left, top right, center, center top;
  background-attachment: fixed;
}

.learn-shell::before,
.learn-shell::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
}

.learn-shell::before {
  background:
    linear-gradient(90deg, rgba(104, 55, 32, 0.06), transparent 18% 82%, rgba(104, 55, 32, 0.08)),
    linear-gradient(180deg, rgba(255, 255, 255, 0.22), transparent 18%, rgba(68, 34, 16, 0.06));
  opacity: 0.88;
}

.learn-shell::after {
  background:
    radial-gradient(circle at 12% 20%, rgba(255, 255, 255, 0.48), transparent 14%),
    radial-gradient(circle at 82% 78%, rgba(255, 239, 216, 0.32), transparent 16%);
  mix-blend-mode: screen;
}

.shell-backdrop {
  position: fixed;
  inset: 0;
  z-index: 45;
  background: rgba(33, 20, 12, 0.24);
  backdrop-filter: blur(4px);
}

.learn-shell__sidebar {
  width: var(--ls-sidebar-width) !important;
  position: relative;
  background:
    linear-gradient(180deg, rgba(255, 251, 244, 0.92), rgba(247, 237, 222, 0.84)),
    linear-gradient(180deg, rgba(163, 65, 53, 0.04), transparent 28%);
  backdrop-filter: blur(28px);
  box-shadow:
    inset -1px 0 0 rgba(168, 134, 98, 0.2),
    18px 0 36px rgba(88, 58, 37, 0.08);
}

.learn-shell__sidebar::before {
  content: '';
  position: absolute;
  inset: 20px 18px auto;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(163, 65, 53, 0.2), transparent);
}

.learn-shell__header {
  background:
    linear-gradient(180deg, rgba(255, 250, 242, 0.82), rgba(255, 250, 242, 0.58)),
    linear-gradient(90deg, rgba(163, 65, 53, 0.02), transparent 30%, rgba(212, 175, 55, 0.04));
  box-shadow:
    0 1px 0 rgba(168, 134, 98, 0.12),
    0 18px 34px rgba(107, 67, 41, 0.05);
}

.learn-shell__mobile-nav {
  background: rgba(255, 249, 240, 0.88);
  box-shadow:
    0 -1px 0 rgba(168, 134, 98, 0.12),
    0 -10px 26px rgba(92, 59, 35, 0.08);
}

.learn-shell--immersive {
  height: 100vh;
  overflow: hidden;
}

.learn-shell--immersive .flex-col {
  height: 100vh;
}

.learn-shell :deep(*::-webkit-scrollbar) {
  width: 5px;
  height: 5px;
}

.learn-shell :deep(*::-webkit-scrollbar-track) {
  background: transparent;
}

.learn-shell :deep(*::-webkit-scrollbar-thumb) {
  background: rgba(166, 91, 56, 0.18);
  border-radius: 4px;
}

.learn-shell :deep(*::-webkit-scrollbar-thumb:hover) {
  background: rgba(166, 91, 56, 0.35);
}

.header-kicker {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.28em;
  color: rgba(115, 109, 97, 0.74);
}

.header-copy {
  margin-top: 0.24rem;
  max-width: 32rem;
  font-size: 12px;
  line-height: 1.7;
  color: rgba(94, 86, 77, 0.84);
}

.avatar-shell {
  display: flex;
  height: 42px;
  width: 42px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 999px;
  flex-shrink: 0;
}

.avatar-shell-sm { height: 36px; width: 36px; }
.avatar-shell-lg { height: 72px; width: 72px; }

.avatar-photo {
  display: flex;
  height: 100%;
  width: 100%;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
  font-size: 18px;
  font-weight: 900;
}

.profile-hub {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  border-radius: 999px;
  border: 1px solid rgba(168, 134, 98, 0.18);
  background: rgba(255, 252, 247, 0.88);
  padding: 0.36rem 0.5rem;
  transition: border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
}

.profile-hub:hover {
  border-color: rgba(163, 65, 53, 0.24);
  transform: translateY(-1px);
  box-shadow: 0 14px 28px rgba(92, 59, 35, 0.08);
}

.profile-hub__avatar {
  border: 1px solid rgba(163, 65, 53, 0.16);
  background: rgba(255, 255, 255, 0.9);
}

.profile-hub__body { text-align: left; }

.profile-hub__body strong,
.profile-hub__body span {
  display: block;
}

.profile-hub__body strong {
  font-size: 13px;
  font-weight: 700;
  color: #2b2622;
}

.profile-hub__body span {
  margin-top: 0.12rem;
  font-size: 11px;
  color: #736d61;
}

.profile-hub__chips { gap: 0.4rem; }

.profile-hub__chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: rgba(163, 65, 53, 0.08);
  padding: 0.35rem 0.65rem;
  font-size: 11px;
  font-weight: 700;
  color: #8b3232;
}

.sidebar-progress-card {
  position: relative;
  overflow: hidden;
  border-radius: 28px;
  border: 1px solid rgba(182, 149, 106, 0.18);
  background:
    linear-gradient(180deg, rgba(255, 249, 240, 0.96), rgba(244, 234, 218, 0.9)),
    radial-gradient(circle at top right, rgba(163, 65, 53, 0.1), transparent 38%);
  padding: 1.1rem;
  box-shadow: 0 18px 36px rgba(92, 59, 35, 0.1);
}

.sidebar-progress-card::after {
  content: '';
  position: absolute;
  inset: auto 1.1rem 0.85rem;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.42), transparent);
}

.sidebar-progress-card__eyebrow,
.profile-summary-card__eyebrow {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.24em;
  color: rgba(115, 109, 97, 0.7);
}

.sidebar-progress-card h3 {
  margin-top: 0.42rem;
  font-size: 1.5rem;
  font-weight: 800;
  color: #2b2622;
}

.sidebar-progress-card__copy,
.profile-summary-card__copy {
  font-size: 12px;
  line-height: 1.72;
  color: #736d61;
}

.sidebar-progress-card__copy {
  margin-top: 0.6rem;
}

.sidebar-progress-card__meta {
  margin-top: 0.9rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.sidebar-progress-card__meta span,
.profile-summary-card__meta-line span {
  border-radius: 999px;
  background: rgba(163, 65, 53, 0.08);
  padding: 0.3rem 0.6rem;
  font-size: 11px;
  font-weight: 700;
  color: #8b3232;
}

.panel-pop {
  animation: shell-pop 0.22s cubic-bezier(0.22, 1, 0.36, 1);
  box-shadow: 0 24px 68px rgba(61, 42, 28, 0.14), 0 0 0 1px rgba(255, 248, 238, 0.82);
  border-color: rgba(168, 134, 98, 0.18);
}

.profile-summary-grid {
  display: grid;
  gap: 0.8rem;
  margin-bottom: 1rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.profile-summary-card {
  border-radius: 22px;
  border: 1px solid rgba(182, 149, 106, 0.16);
  background: linear-gradient(180deg, rgba(255, 250, 242, 0.96), rgba(246, 238, 226, 0.92));
  padding: 0.95rem;
}

.profile-summary-card--gold {
  background: linear-gradient(180deg, rgba(255, 249, 238, 0.98), rgba(246, 236, 214, 0.94));
}

.profile-summary-card__toggle {
  display: flex;
  width: 100%;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  text-align: left;
}

.profile-summary-card__headline {
  margin-top: 0.45rem;
}

.profile-summary-card__headline strong,
.profile-summary-card__headline span {
  display: block;
}

.profile-summary-card__headline strong {
  font-size: 1.4rem;
  font-weight: 800;
  color: #2b2622;
}

.profile-summary-card__headline span {
  margin-top: 0.18rem;
  font-size: 12px;
  color: #736d61;
}

.profile-summary-card__bar {
  margin-top: 0.7rem;
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(115, 109, 97, 0.12);
}

.profile-summary-card__bar i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #a34135, #d4af37);
}

.profile-summary-card__meta-line {
  margin-top: 0.7rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.profile-summary-card__details {
  max-height: 0;
  overflow: hidden;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: max-height 0.24s ease, opacity 0.18s ease, margin-top 0.18s ease;
  will-change: max-height, opacity;
}

.profile-summary-card.is-expanded .profile-summary-card__details {
  margin-top: 0.7rem;
  max-height: 260px;
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

.profile-summary-card__copy { margin-top: 0; }

.profile-summary-card__list {
  margin-top: 0.8rem;
  display: grid;
  gap: 0.45rem;
}

.profile-summary-card__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.56);
  padding: 0.45rem 0.55rem;
  font-size: 12px;
  color: #5e564d;
}

.profile-summary-card__row strong {
  color: #8b3232;
}

.page-fade-enter-active,
.page-fade-leave-active {
  transition: all 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}

.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

@keyframes shell-pop {
  from { opacity: 0; transform: translateY(-6px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@media (hover: hover) and (pointer: fine) {
  .profile-summary-card:hover .profile-summary-card__details {
    margin-top: 0.7rem;
    max-height: 260px;
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }
}

@media (max-width: 768px) {
  .profile-summary-grid {
    grid-template-columns: 1fr;
  }

  .profile-summary-card.is-expanded .profile-summary-card__details {
    max-height: 320px;
  }
}
</style>
