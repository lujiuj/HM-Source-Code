import { getMasterVisuals, getSongVisuals } from './learnVisuals.js'

const songMasterMap = {
  'tianxianpei-fuqishuangshuang': 'hanzaifen',
  'nvfuma-weijiulilang': 'hanzaifen',
  'liangzhu-wocongci': 'wuqiong',
  'mengjiangnu-shieryuediao': 'yanfengying',
  'liangzhu-loutaihui': 'wuqiong',
  'bangdaboqinglang-mingchang': 'hanzaifen',
  'taqing-youchun': 'hanzaifen'
}

const rawMasters = [
  {
    id: 'hanzaifen',
    name: '韩再芬',
    title: '黄梅戏表演艺术家',
    shortTitle: '再芬老师',
    intro: '嗓音明亮而不浮，行腔圆润，善于把生活气息揉进传统唱法。她的表演强调人物关系与情绪递进，既稳又有温度。',
    focus: ['气口连绵', '字头清楚', '人物温度'],
    signatureStyle: '清新自然、真诚质朴、生活气息足',
    vocalStyle: '气口绵长，字头圆润，情绪推进讲究由浅入深。',
    teachingStyle: '先把人物关系唱懂，再把气口、字头和情绪层次慢慢立稳。',
    representativeWorks: ['《天仙配》', '《女驸马》', '《徽州女人》'],
    sourceNote: '本地名师头像与剧照已本地化存放'
  },
  {
    id: 'wuqiong',
    name: '吴琼',
    title: '黄梅戏表演艺术家',
    shortTitle: '吴琼老师',
    intro: '抒情线条细腻，舞台控制力强，常把柔和的情绪推进成更有层次的戏剧张力。她的声音干净，收放很有分寸。',
    focus: ['抒情线条', '细节表情', '舞台控制'],
    signatureStyle: '音色甜美，唱腔饱满有力，善于把传统唱段唱出层次张力',
    vocalStyle: '慢板抒情细，人物对答有劲，长线推进时层次分明。',
    teachingStyle: '先稳住旋律线，再补人物语气和对唱张力，兼顾传统与创新表达。',
    representativeWorks: ['《孟姜女》', '《梁祝》', '《女驸马》'],
    sourceNote: '本地名师头像与剧照已本地化存放'
  },
  {
    id: 'yanfengying',
    name: '严凤英',
    title: '黄梅戏经典宗师',
    shortTitle: '严派宗师',
    intro: '严派的代表人物，唱念做表演自然真切，唱腔里有分寸，也有骨力。她把黄梅戏的质朴、灵动和清亮都稳稳立住了。',
    focus: ['严派韵味', '情感真切', '起落分明'],
    signatureStyle: '清亮灵动，质朴自然，唱做并重',
    vocalStyle: '句法干净，起落鲜明，叙事里带情，抒情里有骨力。',
    teachingStyle: '先把句法和人物真情唱对，再追严派的清亮韵味与分寸感。',
    representativeWorks: ['《天仙配》', '《女驸马》', '《打猪草》'],
    sourceNote: '本地名师头像与剧照已本地化存放'
  }
]

const rawSongs = [
  {
    id: 'tianxianpei-fuqishuangshuang',
    operaName: '天仙配',
    excerptName: '夫妻双双把家还',
    title: '《天仙配》·夫妻双双把家还',
    singer: '韩再芬',
    type: '经典唱段',
    role: '生旦对唱',
    tags: ['经典', '爱情', '对唱'],
    synopsis: '董永与七仙女归家路上的温柔对唱，适合练习连腔、气口和情绪递进。',
    description: '黄梅戏最具代表性的唱段之一，讲究甜润、连绵和人物温度。',
    duration: '1:21',
    durationSeconds: 81,
    difficulty: 2,
    videoSrc: '/video/《天仙配》选段_夫妻双双把家还_韩再芬.mp4',
    audioSrc: '/music/《天仙配》选段_夫妻双双把家还_韩再芬.mp3',
    lrcPath: '/music/《天仙配》选段_夫妻双双把家还_韩再芬.lrc',
    referenceVocalSrc: '/music/《天仙配》选段_夫妻双双把家还_韩再芬_人声.wav',
    accompanimentSrc: '/music/《天仙配》选段_夫妻双双把家还_韩再芬_伴奏.wav'
  },
  {
    id: 'nvfuma-weijiulilang',
    operaName: '女驸马',
    excerptName: '为救李郎离家园',
    title: '《女驸马》·为救李郎离家园',
    singer: '韩再芬',
    type: '经典唱段',
    role: '花旦独唱',
    tags: ['经典', '叙事', '独唱'],
    synopsis: '冯素珍女扮男装赶考赴试，情节推进明快，适合练字头和叙事张力。',
    description: '节奏清晰，戏剧冲突集中，适合训练咬字和段落推进。',
    duration: '3:41',
    durationSeconds: 221,
    difficulty: 3,
    videoSrc: '/video/《女驸马》选段_为救李郎离家园_韩再芬.mp4',
    audioSrc: null,
    lrcPath: null,
    referenceVocalSrc: null,
    accompanimentSrc: null
  },
  {
    id: 'liangzhu-wocongci',
    operaName: '梁祝',
    excerptName: '我从此不敢看观音',
    title: '《梁祝》·我从此不敢看观音',
    singer: '吴琼',
    type: '抒情唱段',
    role: '花旦独唱',
    tags: ['抒情', '爱情', '咏叹'],
    synopsis: '梁山伯祝英台主题中的抒情段落，重点在气息控制、尾音收束和细腻转折。',
    description: '适合练习弱起、慢板和情绪的轻推轻收。',
    duration: '0:54',
    durationSeconds: 54,
    difficulty: 2,
    videoSrc: '/video/《梁祝》选段 _ 我从此不敢看观音.mp4',
    audioSrc: null,
    lrcPath: null,
    referenceVocalSrc: null,
    accompanimentSrc: null
  },
  {
    id: 'mengjiangnu-shieryuediao',
    operaName: '孟姜女',
    excerptName: '十二月调',
    title: '《孟姜女》·十二月调',
    singer: '严凤英',
    type: '叙事唱段',
    role: '青衣独唱',
    tags: ['叙事', '长线', '层次'],
    synopsis: '十二个月份层层推进，先把叙事唱清，再把单句模仿和严派韵味立住。',
    description: '适合练分句、板式推进和叙事张力。',
    duration: '2:12',
    durationSeconds: 132,
    difficulty: 3,
    videoSrc: '/video/孟姜女.mp4',
    audioSrc: '/music/孟姜女-十二月调.mp3',
    lrcPath: null,
    referenceVocalSrc: null,
    accompanimentSrc: null
  },
  {
    id: 'liangzhu-loutaihui',
    operaName: '梁祝',
    excerptName: '楼台会',
    title: '《梁祝》·楼台会',
    singer: '吴琼',
    type: '抒情唱段',
    role: '生旦对唱',
    tags: ['抒情', '对唱', '名场面'],
    synopsis: '情绪推进最完整的一段重戏，适合抓人物对答、停连和长线抒情。',
    description: '对唱中人物关系层次明显，适合练稳气口和递进。',
    duration: '2:35',
    durationSeconds: 155,
    difficulty: 4,
    videoSrc: '/video/梁祝·楼台会.mp4',
    audioSrc: null,
    lrcPath: null,
    referenceVocalSrc: null,
    accompanimentSrc: null
  },
  {
    id: 'bangdaboqinglang-mingchang',
    operaName: '棒打薄情郎',
    excerptName: '闷声对质',
    title: '《棒打薄情郎》·闷声对质',
    singer: '韩再芬',
    type: '诙谐唱段',
    role: '花旦独唱',
    tags: ['诙谐', '板眼', '叙事'],
    synopsis: '看点在字头咬劲和戏剧火候，适合先观察板眼，再拆句模仿语气。',
    description: '板眼节奏明确，适合练咬字和戏味。',
    duration: '1:58',
    durationSeconds: 118,
    difficulty: 2,
    videoSrc: '/video/棒打薄情郎.mp4',
    audioSrc: null,
    lrcPath: null,
    referenceVocalSrc: null,
    accompanimentSrc: null
  },
  {
    id: 'taqing-youchun',
    operaName: '踏青',
    excerptName: '游春',
    title: '《踏青》·游春',
    singer: '韩再芬',
    type: '轻快唱段',
    role: '游园小段',
    tags: ['轻快', '游春', '身段'],
    synopsis: '节奏轻盈，适合练身段、口风和舞台上的呼吸感。',
    description: '前半段重灵气，后半段重步伐和人物神采。',
    duration: '1:35',
    durationSeconds: 95,
    difficulty: 1,
    videoSrc: '/video/踏青.mp4',
    audioSrc: null,
    lrcPath: null,
    referenceVocalSrc: null,
    accompanimentSrc: null
  }
]

const songGuideLines = {
  'tianxianpei-fuqishuangshuang': [
    '树上的鸟儿成双对，绿水青山带笑颜。',
    '夫妻双双把家还，轻声对唱更要稳气。',
    '前半句先唱温柔，后半句再慢慢收住。',
    '把甜味落在人物关系里，不要浮在表面。'
  ],
  'nvfuma-weijiulilang': [
    '为救李郎离家园，一句一句先把字讲明。',
    '叙事唱段最怕糊字，要把转折唱得清楚。',
    '长句往前推时别着急，句尾要留一点余韵。',
    '人物又急又稳，情绪要一层一层递上去。'
  ],
  'liangzhu-wocongci': [
    '我从此不敢看观音，慢板要先把气息放稳。',
    '弱起别飘，尾音收束时更要轻。',
    '情绪不是一下推满，而是轻轻提再慢慢落。',
    '一句一停都要有回味，抒情线条才会细。'
  ],
  'mengjiangnu-shieryuediao': [
    '一月思夫到岁深，叙事唱段先把层次唱清。',
    '每个月份都有不同重量，呼吸不要平均分配。',
    '字头干净，句尾略带叹意，故事才会立住。',
    '从平讲到悲叹，情绪要逐层递进，不能直接冲顶。'
  ],
  'liangzhu-loutaihui': [
    '楼台重逢先压住情绪，再一点一点打开。',
    '两个人物的对答要分清主次，停连不能唱平。',
    '每一句都像把话说给对方听，关系感才会出来。',
    '尾句收在惋惜里，不要直接把力气顶满。'
  ],
  'bangdaboqinglang-mingchang': [
    '板眼先站稳，再把字头的劲道送出来。',
    '这段不怕利落，怕的是只快不稳。',
    '人物火气在前，句尾却要收住，才显戏味。',
    '先拆句模仿语气，再连起来唱完整段。'
  ],
  'taqing-youchun': [
    '游春一段要轻快，声线先放亮再走身段感。',
    '节奏不能抢拍，步子和气口要一起往前走。',
    '前半段唱灵气，后半段唱人物神采。',
    '每一句都留一点笑意，整段才会轻盈。'
  ]
}

const masterAnalysisContent = {
  'tianxianpei-fuqishuangshuang': {
    masterSummary: '这一段最难的不是甜，而是甜里有分寸。字头要像抛绣球一样轻，气口要留得住，夫妻对唱的依恋感才会自然出来。',
    referenceDimensions: {
      pitch: 96,
      rhythm: 95,
      articulation: 97,
      style: 98,
      breath: 95,
      emotion: 98
    },
    cards: [
      { title: '字头', icon: 'music_note', description: '口腔先打开，再把“树、绿、双、甜”这些主字抛圆，不能一上来就压扁。' },
      { title: '气口', icon: 'air', description: '整段要像并肩走路一样一气相连，换气要藏在语气里，不能让句尾塌掉。' },
      { title: '情绪', icon: 'theater_comedy', description: '不是大喜大甜，而是新婚归家的安稳喜悦，笑意要放在字里，不要放在嗓子表面。' }
    ],
    teachingPoints: [
      { title: '先唱关系，再唱旋律', description: '先把“我和你”之间的对望感唱出来，旋律自然就会顺。', tags: ['人物关系', '对唱'] },
      { title: '句尾不散', description: '“笑颜、发间、家还”这些句尾都要轻轻兜住，不能提前泄气。', tags: ['句尾', '收束'] },
      { title: '轻字重情', description: '字可以轻，但情不能虚，越轻越要有落点。', tags: ['轻声', '温度'] }
    ],
    practiceSteps: [
      '先按四句一组轻声读词，把夫妻对话的口吻读顺。',
      '再把“成双对、带笑颜、把家还、苦也甜”四个句尾单独拿出来吊气。',
      '第三遍开始连成整段，要求换气不抢、句尾不断。',
      '最后再完整唱一遍，确认甜味来自人物关系，而不是表情化处理。'
    ],
    lineCoaching: [
      { text: '树上的鸟儿成双对', wordHead: '“树上”的起字轻轻抬起，“双对”要收圆。', breath: '整句不用抢气，前半句保持悬着的气息。', emotion: '像先看见景，再回头跟对方说。', masterPoint: '第一句先把画面打开，不要急着唱甜。' },
      { text: '绿水青山带笑颜', wordHead: '“绿水青山”四字要清亮，不能糊成一片。', breath: '在“带笑颜”前微提一口小气即可。', emotion: '笑意在眼里，不在嘴上。', masterPoint: '景色在笑，人也被景色带得柔下来。' },
      { text: '随手摘下花一朵', wordHead: '“摘下花”三个动作字要有轻巧的节奏。', breath: '一句唱完再换气，不要把动作切碎。', emotion: '像顺手做给对方看，带一点俏皮。', masterPoint: '动作感比音量更重要。' },
      { text: '我与娘子戴发间', wordHead: '“娘子”要唱得亲，不要唱得硬。', breath: '“戴发间”要顺着带出去，尾音别掉。', emotion: '这一句是亲昵，不是炫耀。', masterPoint: '把重心放在“我与娘子”的关系上。' },
      { text: '从今再不受那奴役苦', wordHead: '“从今再不”四字要比前面更稳，字头略实。', breath: '长句要留足气，不能唱到“奴役苦”时发虚。', emotion: '苦是回望，不是抱怨。', masterPoint: '这句要把“苦尽”的底色唱出来。' },
      { text: '夫妻双双把家还', wordHead: '“夫妻双双”四字要成串，不能断开。', breath: '“把家还”是句尾核心，收气时往里含。', emotion: '回家的安定感要比热闹感更强。', masterPoint: '这是整段的主题句，要唱得稳稳落地。' },
      { text: '你耕田来我织布', wordHead: '“耕田、织布”两组动词要对称。', breath: '语流要平稳，像一口气铺开生活图景。', emotion: '有商量、有默契，不要唱成叙述句。', masterPoint: '把夫妻分工的和气唱出来。' },
      { text: '我挑水来你浇园', wordHead: '“挑水”“浇园”口型要利索，收尾要圆。', breath: '在“来”字带一下过门，后半句自然衔接。', emotion: '生活气息要浓，像真在说家常。', masterPoint: '这一句要更生活化，别端着唱。' },
      { text: '寒窑虽破能避风雨', wordHead: '“寒窑虽破”要稍沉一点，显示境况。', breath: '句中别换大气，保持一条线带到“风雨”。', emotion: '破屋虽苦，但心是安的。', masterPoint: '不是诉苦，而是苦中有依靠。' },
      { text: '夫妻恩爱苦也甜', wordHead: '“恩爱”两字要柔，“苦也甜”要带对比。', breath: '在“苦也甜”前留一点回旋，句尾再收。', emotion: '甜里有经过苦后的笃定。', masterPoint: '“甜”要从“苦”里生出来才真。' },
      { text: '你我好比鸳鸯鸟', wordHead: '“鸳鸯鸟”要唱得轻巧灵动。', breath: '整句要像往上托，气息别压低。', emotion: '画面感比力量感更重要。', masterPoint: '比喻句要带一点飞起来的轻盈。' },
      { text: '比翼双飞在人间', wordHead: '“比翼双飞”要连而不粘，“人间”收住。', breath: '最后一句要留足尾气，把结句拖稳。', emotion: '收在温暖和圆满里，不要过分抒情。', masterPoint: '结尾要稳、亮、轻，把整段气韵封住。' }
    ]
  },
  'nvfuma-weijiulilang': {
    masterSummary: '《为救李郎》重在叙事推进。先把字交代清楚，再往人物身上加急与稳，句子才会有戏。',
    referenceDimensions: { pitch: 94, rhythm: 96, articulation: 97, style: 95, breath: 93, emotion: 94 },
    cards: [
      { title: '字头', icon: 'music_note', description: '叙事段落先求字清，地名、人名和转折词一定要立住。' },
      { title: '板眼', icon: 'graphics_eq', description: '这段怕乱不怕快，板眼一稳，人物的急切感才有根。' },
      { title: '情绪', icon: 'theater_comedy', description: '急中带稳，不能一味冲，越是着急越要稳住句法。' }
    ],
    teachingPoints: [
      { title: '讲故事要有停顿', description: '每次转折前稍微一顿，听众才能跟上剧情。', tags: ['叙事', '停连'] },
      { title: '重字别抢拍', description: '“救、离、赶、试”等动作字先交代清，再往前推。', tags: ['板眼', '动作字'] },
      { title: '情绪层层上提', description: '越唱到后面越见决心，不是从第一句就满。', tags: ['层次', '推进'] }
    ],
    practiceSteps: [
      '先用说白把整段故事讲顺，再上旋律。',
      '把每个转折句单拎出来，练“说得清又唱得稳”。',
      '连成整段后，只检查板眼和字头，不急着加太多情绪。',
      '最后一遍再补人物的决心感。'
    ],
    lineCoaching: [
      { text: '为救李郎离家园', wordHead: '“救李郎”三字必须清。', breath: '一句唱完再换。', emotion: '急中有定。', masterPoint: '先把动机唱明白。' },
      { text: '谁料皇榜中状元', wordHead: '“皇榜”“状元”要咬准。', breath: '后半句别塌。', emotion: '带一点意外。', masterPoint: '转折句要有戏眼。' },
      { text: '中状元着红袍帽插宫花好新鲜', wordHead: '连字多，但每个名物都要清。', breath: '长句分小口偷气。', emotion: '外在热闹，内里克制。', masterPoint: '不能唱成流水账。' },
      { text: '我也曾赴过琼林宴', wordHead: '“也曾”稍带回忆色。', breath: '句尾轻收。', emotion: '忆旧里带不甘。', masterPoint: '人物心事要浮出来。' }
    ]
  },
  'liangzhu-wocongci': {
    masterSummary: '《我从此不敢看观音》要用慢板把情绪一层层压出来，不能先哭腔后人物。',
    referenceDimensions: { pitch: 95, rhythm: 92, articulation: 93, style: 97, breath: 96, emotion: 98 },
    cards: [
      { title: '慢板', icon: 'music_note', description: '慢板不是拖，而是每一拍都有情绪支点。' },
      { title: '气息', icon: 'air', description: '弱起最考验气息，句头轻，句尾更要稳。' },
      { title: '抒情', icon: 'theater_comedy', description: '情绪要压着走，层层上提，不能一开始就放满。' }
    ],
    teachingPoints: [
      { title: '先稳住弱起', description: '弱起稳住了，后面情绪才有空间。', tags: ['弱起', '气息'] },
      { title: '留白比哭腔重要', description: '停顿里的空白，比直接哭出来更动人。', tags: ['留白', '层次'] },
      { title: '句尾轻轻收', description: '越到句尾越要往里含，不要往外甩。', tags: ['收尾', '内敛'] }
    ],
    practiceSteps: [
      '先读词，找到每一句真正想说的话。',
      '再按半速练弱起和句尾。',
      '第三遍开始只管情绪递进，不管音量大小。',
      '最后合成整段，看有没有一上来就太满。'
    ],
    lineCoaching: [
      { text: '我从此不敢看观音', wordHead: '“不敢”要轻而准。', breath: '一条气带完整句。', emotion: '先压住心事。', masterPoint: '第一句就要留出隐痛。' },
      { text: '但见观音泪满襟', wordHead: '“泪满襟”咬字要清。', breath: '后半句别抢气。', emotion: '悲意逐渐显出。', masterPoint: '情绪从心里往外渗。' },
      { text: '观音大士成全我', wordHead: '“成全”两字放柔。', breath: '句中稳住，尾音含住。', emotion: '有感激也有遗憾。', masterPoint: '不是直哭，是复杂情感。' },
      { text: '为何不能成全英台婚姻', wordHead: '重字落在“为何”“婚姻”。', breath: '长句要先留气。', emotion: '控诉里带委屈。', masterPoint: '结尾要有问天意味。' }
    ]
  },
  'mengjiangnu-shieryuediao': {
    masterSummary: '《十二月调》是典型的长线叙事，难点在层次分明，每个月份都要唱出不同重量。',
    referenceDimensions: { pitch: 94, rhythm: 95, articulation: 96, style: 96, breath: 94, emotion: 97 },
    cards: [
      { title: '叙事', icon: 'menu_book', description: '月份多、层次多，先把每层意思分清，再谈情绪推进。' },
      { title: '分句', icon: 'air', description: '每一月都是一层呼吸，不可平均分配气力。' },
      { title: '递进', icon: 'trending_up', description: '从平叙走到哀叹，要一月深过一月。' }
    ],
    teachingPoints: [
      { title: '每月都要换颜色', description: '不能十二个月唱成同一个腔调。', tags: ['层次', '色彩'] },
      { title: '句头清，句尾沉', description: '起字要明，结尾要把心事压下去。', tags: ['字头', '收尾'] },
      { title: '叙事里带抒情', description: '不是干讲故事，要让情绪慢慢渗出来。', tags: ['叙事', '抒情'] }
    ],
    practiceSteps: [
      '先把每月的关键词标出来。',
      '再按月份分段练，避免一口气唱平。',
      '连唱时只检查层次变化是否够明显。',
      '最后补统一气韵，保持严派清正。'
    ],
    lineCoaching: [
      { text: '一月思夫到岁深', wordHead: '“一月思夫”字头要清。', breath: '一句不要断碎。', emotion: '平叙起笔。', masterPoint: '第一月先立住叙事基调。' },
      { text: '二月北风冷侵人', wordHead: '“北风”“冷侵”要有寒意。', breath: '中间可偷小气。', emotion: '由叙事转入体感。', masterPoint: '气口要带出寒冷。' },
      { text: '三月桃花开又谢', wordHead: '“开又谢”要有对比。', breath: '尾音略收。', emotion: '景中带叹。', masterPoint: '让时间流逝被听见。' },
      { text: '十二月里雪满门', wordHead: '“雪满门”三字收实。', breath: '最后一句留够尾气。', emotion: '悲意沉到底。', masterPoint: '结句要有压轴重量。' }
    ]
  },
  'liangzhu-loutaihui': {
    masterSummary: '《楼台会》讲究对唱里的推拉。两个人都在说心事，但谁都不能把话先说满。',
    referenceDimensions: { pitch: 95, rhythm: 94, articulation: 94, style: 97, breath: 95, emotion: 98 },
    cards: [
      { title: '对答', icon: 'question_answer', description: '每句都像对着人说，不能唱成对空抒情。' },
      { title: '停连', icon: 'air', description: '停顿是含义，不是空白；连接是情绪，不是赶拍。' },
      { title: '张力', icon: 'theater_comedy', description: '越压住越有张力，见面时先忍，再慢慢打开。' }
    ],
    teachingPoints: [
      { title: '对唱先分主次', description: '每一句都要知道此刻是谁在追、谁在躲。', tags: ['人物关系', '对唱'] },
      { title: '句内有回旋', description: '一句话里也要有欲言又止。', tags: ['停连', '回旋'] },
      { title: '结句别喊', description: '情越重越要往里收。', tags: ['收束', '张力'] }
    ],
    practiceSteps: [
      '先用对白方式把对答关系读出来。',
      '再把每一句的停顿位置标记清楚。',
      '半速练习“压住不放满”的力度。',
      '最后整段连唱，检查人物关系是否一直在线。'
    ],
    lineCoaching: [
      { text: '楼台相会情难平', wordHead: '“相会”要轻，“难平”稍沉。', breath: '句中不换大气。', emotion: '见面时先压住。', masterPoint: '第一句先收，不先炸开。' },
      { text: '你言我语泪盈盈', wordHead: '“你言我语”要有对答感。', breath: '“泪盈盈”尾气往里兜。', emotion: '情绪渐起。', masterPoint: '不是哭腔，是忍泪。' },
      { text: '欲说真情难出口', wordHead: '“难出口”要唱出卡住。', breath: '前松后紧。', emotion: '欲言又止。', masterPoint: '停顿就是戏。' },
      { text: '回身一步更伤情', wordHead: '“回身一步”动作字要有画面。', breath: '句尾延长回旋。', emotion: '悲意落下。', masterPoint: '结句要像身子转过去，心没转开。' }
    ]
  },
  'bangdaboqinglang-mingchang': {
    masterSummary: '《棒打薄情郎》看的是火候。板眼、字劲、人物火气三样都要在，但不能乱。',
    referenceDimensions: { pitch: 92, rhythm: 97, articulation: 97, style: 95, breath: 92, emotion: 94 },
    cards: [
      { title: '板眼', icon: 'music_note', description: '节奏先站稳，唱腔的劲儿才出得来。' },
      { title: '咬字', icon: 'record_voice_over', description: '利落不等于发硬，要有刀口也要有圆度。' },
      { title: '火候', icon: 'local_fire_department', description: '火气在前，分寸在后，越利索越要稳。' }
    ],
    teachingPoints: [
      { title: '先说后唱', description: '先把人物语气念顺，再上板眼。', tags: ['语气', '人物'] },
      { title: '重点字立住', description: '动作字和质问字要干净有力。', tags: ['咬字', '板眼'] },
      { title: '怒而不乱', description: '火气可以有，但不能把节奏唱散。', tags: ['节奏', '火候'] }
    ],
    practiceSteps: [
      '先用说白练角色语气。',
      '再踩板眼练重点字。',
      '连起来时只管稳和准，不急着放大火气。',
      '最后一遍再把人物锋芒加上去。'
    ],
    lineCoaching: [
      { text: '一开口先问来人', wordHead: '“问”字要有劲。', breath: '不要抢第一拍。', emotion: '质问感先立住。', masterPoint: '开口就要见人物。' },
      { text: '再落板眼点薄情', wordHead: '“薄情”要咬清。', breath: '句尾不能散。', emotion: '带锋芒。', masterPoint: '板眼稳了，火气才不乱。' },
      { text: '三分恼火七分稳', wordHead: '“恼火”有劲，“稳”要收住。', breath: '中间留短气。', emotion: '怒而有度。', masterPoint: '火候的关键是稳。' },
      { text: '句句打在要害中', wordHead: '“要害”落重。', breath: '结尾往里扣。', emotion: '像一锤定音。', masterPoint: '最后一句要有收官的利落。' }
    ]
  },
  'taqing-youchun': {
    masterSummary: '《游春》贵在轻灵。人先动，气再走，最后让唱腔带着身段往前飘。',
    referenceDimensions: { pitch: 93, rhythm: 96, articulation: 94, style: 95, breath: 93, emotion: 94 },
    cards: [
      { title: '轻盈', icon: 'self_improvement', description: '声音轻，不是气弱，而是重心高。' },
      { title: '节奏', icon: 'pace', description: '步子、呼吸、旋律要在同一条线上。' },
      { title: '神采', icon: 'theater_comedy', description: '唱的是游春心境，脸上和声音里都要带亮。' }
    ],
    teachingPoints: [
      { title: '先提气再走句', description: '轻快段落先把气提起来。', tags: ['提气', '轻快'] },
      { title: '笑意藏在字里', description: '不要笑着唱，要唱出笑意。', tags: ['神采', '分寸'] },
      { title: '步态感要稳', description: '再轻也不能漂，脚下得有稳点。', tags: ['身段', '节奏'] }
    ],
    practiceSteps: [
      '先找行走的节奏感。',
      '再练句头的提气和句尾的轻收。',
      '第三遍把身段感觉带进声音。',
      '最后整段只检查轻灵和神采。'
    ],
    lineCoaching: [
      { text: '春风一拂花枝动', wordHead: '“春风”开口要亮。', breath: '轻轻提一口气。', emotion: '像风先吹来。', masterPoint: '第一句先有春天气息。' },
      { text: '游园脚步莫匆匆', wordHead: '“脚步”两字要轻巧。', breath: '整句不要抢拍。', emotion: '轻松悠然。', masterPoint: '轻快不等于快。' },
      { text: '笑看满园颜色好', wordHead: '“颜色好”咬字要明。', breath: '尾音往上提。', emotion: '笑意带出来。', masterPoint: '把神采唱在声音里。' },
      { text: '一身春意入帘栊', wordHead: '“春意”要柔亮。', breath: '句尾轻轻收拢。', emotion: '收在明媚里。', masterPoint: '结尾要像身影轻轻掠过。' }
    ]
  }
}

function createDefaultMasterAnalysis(songId) {
  const guideLines = getSongGuideLines(songId)
  return {
    masterSummary: '先把字头、气口和人物关系唱明白，再去追求更细的韵味变化。',
    referenceDimensions: {
      pitch: 93,
      rhythm: 92,
      articulation: 94,
      style: 93,
      breath: 92,
      emotion: 94
    },
    cards: [
      { title: '字头', icon: 'music_note', description: '先把关键字抛清，句子才站得住。' },
      { title: '气口', icon: 'air', description: '换气藏在语意里，不要把句子切断。' },
      { title: '情绪', icon: 'theater_comedy', description: '情绪先收住，再慢慢放开。' }
    ],
    teachingPoints: [
      { title: '先听后唱', description: '先把名师示范的句法听懂，再自己开口。', tags: ['听辨', '模仿'] },
      { title: '拆句复练', description: '难句单独拆开，比整段反复更有效。', tags: ['拆句', '复练'] },
      { title: '句尾收紧', description: '句尾收住，人物气质就会更稳。', tags: ['句尾', '人物'] }
    ],
    practiceSteps: [
      '先读词，找出句子的重字。',
      '再慢速练换气和句尾。',
      '第三遍检查人物情绪是否在线。'
    ],
    lineCoaching: guideLines.map((text) => ({
      text,
      wordHead: '先把重字抛清，不要糊字。',
      breath: '气息别断，尽量一口气带完整句。',
      emotion: '先唱人物语气，再唱腔调。',
      masterPoint: '这一句要先稳住句法。'
    }))
  }
}

export const masterProfiles = rawMasters.map((master) => {
  const visuals = getMasterVisuals(master.id)
  return {
    ...master,
    ...visuals,
    visuals,
    avatar: visuals.avatar,
    heroImage: visuals.heroImage,
    bannerImage: visuals.bannerImage,
    portrait: visuals.portrait,
    timelineCover: visuals.timelineCover,
    galleryCover: visuals.galleryCover,
    avatarObjectPosition: visuals.avatarObjectPosition || 'center center',
    heroObjectPosition: visuals.heroObjectPosition || 'center center',
    bannerObjectPosition: visuals.bannerObjectPosition || 'center center',
    textureImage: visuals.textureImage,
    accentImage: visuals.accentImage
  }
})

function enrichSong(song) {
  const visuals = getSongVisuals(song.id)
  const masterId = songMasterMap[song.id] || null
  const master = masterProfiles.find((item) => item.id === masterId) || null

  return {
    ...song,
    masterId,
    masterName: master?.name || song.singer,
    guideLines: songGuideLines[song.id] || [],
    cover: visuals.cover,
    heroImage: visuals.heroImage,
    bannerImage: visuals.bannerImage,
    portrait: visuals.portrait || master?.avatar || visuals.cover,
    timelineCover: visuals.timelineCover,
    galleryCover: visuals.galleryCover,
    textureImage: visuals.textureImage,
    accentImage: visuals.accentImage,
    objectPosition: visuals.objectPosition || 'center center',
    heroObjectPosition: visuals.heroObjectPosition || 'center center',
    bannerObjectPosition: visuals.bannerObjectPosition || 'center center',
    visualNote: visuals.note,
    isScorable: Boolean(song.audioSrc && song.lrcPath),
    isFullPipeline: Boolean(song.audioSrc && song.lrcPath && song.accompanimentSrc),
    difficultyText: ['入门', '易上手', '进阶', '挑战', '舞台级'][Math.max(0, Math.min(4, (song.difficulty || 1) - 1))],
    summary: song.synopsis || song.description || '从唱腔、板式和人物气质切入，完成一段完整练习。'
  }
}

const featuredSongIds = [
  'tianxianpei-fuqishuangshuang',
  'nvfuma-weijiulilang',
  'liangzhu-wocongci'
]

export function getFeaturedLearnSongs() {
  return featuredSongIds
    .map((id) => rawSongs.find((item) => item.id === id))
    .filter(Boolean)
    .map(enrichSong)
}

export function getLearnSongs() {
  return rawSongs.map(enrichSong)
}

export function getLearnSongById(id) {
  const song = rawSongs.find((item) => item.id === id)
  return song ? enrichSong(song) : null
}

export function getSongGuideLines(songOrId) {
  const songId = typeof songOrId === 'string' ? songOrId : songOrId?.id
  return songGuideLines[songId] || []
}

export function buildSongGuideTimeline(songOrId, options = {}) {
  const song = typeof songOrId === 'string'
    ? getLearnSongById(songOrId)
    : songOrId
  const guideLines = getSongGuideLines(song)
  if (!guideLines.length) return []

  const rawStepSec = Number(options.stepSec || 0)
  const fallbackDurationSec = guideLines.length * 4.8
  const totalDurationSec = Math.max(
    Number(song?.durationSeconds || 0),
    Number(options.totalDurationSec || 0),
    fallbackDurationSec
  )
  const stepSec = rawStepSec > 0 ? rawStepSec : (totalDurationSec / guideLines.length)

  return guideLines.map((text, index) => {
    const startSec = Number((index * stepSec).toFixed(2))
    const endSec = index === guideLines.length - 1
      ? Number(totalDurationSec.toFixed(2))
      : Number(((index + 1) * stepSec).toFixed(2))
    return {
      text,
      time: Math.round(startSec * 1000),
      startSec,
      endSec,
      durationSec: Number((endSec - startSec).toFixed(2)),
      startMs: Math.round(startSec * 1000)
    }
  })
}

export function getMasterProfile(masterId) {
  return masterProfiles.find((item) => item.id === masterId) || null
}

export function getSongMaster(song) {
  return getMasterProfile(song?.masterId)
}

export function getMasterAnalysisContent(songOrId) {
  const songId = typeof songOrId === 'string' ? songOrId : songOrId?.id
  return masterAnalysisContent[songId] || createDefaultMasterAnalysis(songId)
}

export function getMasterReferenceDimensions(songOrId) {
  return getMasterAnalysisContent(songOrId).referenceDimensions || {}
}

export function formatDateTime(timestamp) {
  if (!timestamp) return '刚刚'
  try {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return '刚刚'
  }
}

export function formatRelativeTime(timestamp) {
  if (!timestamp) return '刚刚'
  const diff = Date.now() - Number(timestamp)
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < minute) return '刚刚'
  if (diff < hour) return `${Math.max(1, Math.round(diff / minute))} 分钟前`
  if (diff < day) return `${Math.max(1, Math.round(diff / hour))} 小时前`
  return `${Math.max(1, Math.round(diff / day))} 天前`
}

export function formatScore(score) {
  const value = Number(score || 0)
  return Number.isFinite(value) ? value.toFixed(value % 1 ? 1 : 0) : '0'
}

export function getScoreGrade(score) {
  const value = Number(score || 0)
  if (value >= 97) return 'SSS'
  if (value >= 93) return 'SS'
  if (value >= 88) return 'S'
  if (value >= 80) return 'A'
  if (value >= 70) return 'B'
  return 'C'
}
