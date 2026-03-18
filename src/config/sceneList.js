// src/config/sceneList.js

export const scenes = [
  {
    id: 'liangzhu',
    name: '梁山伯与祝英台',
    description: '千古传唱的爱情悲剧，楼台会的生死离别',
    cover: '/covers/liangzhu.jpg',
    characters: [
      { id: 'liang', name: '梁山伯', gender: 'male', description: '痴情书生，重情重义' },
      { id: 'zhu', name: '祝英台', gender: 'female', description: '才女佳人，敢爱敢恨' }
    ],
    nodes: [
      // ===== 开场 =====
      {
        id: 'start',
        type: 'start',
        speaker: '系统',
        text: '',
        next: 'narration_1'
      },
      {
        id: 'narration_1',
        type: 'narration',
        speaker: '旁白',
        text: '【楼台之上，月光如水。梁山伯闻得祝英台已许配马家，特来相见。二人相对而坐，往事如烟】',
        next: 'liang_1'
      },
      
      // ===== 梁山伯开场 =====
      {
        id: 'liang_1',
        type: 'dialogue',
        speaker: '梁山伯',
        text: '英台，三年同窗，我竟不知你是女儿身。如今你已许配马家，我...我该如何是好？',
        next: 'zhu_1'
      },
      {
        id: 'zhu_1',
        type: 'dialogue',
        speaker: '祝英台',
        text: '山伯哥哥，这门亲事是父母之命，非我本愿啊...',
        choices: [
          { text: '（含泪）我心中只有你一人', next: 'zhu_choice_1a' },
          { text: '（坚定）我宁死不从这门亲事', next: 'zhu_choice_1b' },
          { text: '（无奈）但女子岂能违抗父母', next: 'zhu_choice_1c' }
        ]
      },
      
      // ===== 祝英台选择分支 =====
      {
        id: 'zhu_choice_1a',
        type: 'dialogue',
        speaker: '祝英台',
        text: '（含泪）山伯哥哥，我心中只有你一人。三年同窗，早已情根深种...',
        next: 'liang_2a'
      },
      {
        id: 'liang_2a',
        type: 'dialogue',
        speaker: '梁山伯',
        text: '英台，既然你我情投意合，我愿去祝家提亲！',
        choices: [
          { text: '（激动）我这就去求见令尊', next: 'liang_propose' },
          { text: '（沉思）容我想个万全之策', next: 'liang_think' }
        ]
      },
      
      {
        id: 'zhu_choice_1b',
        type: 'dialogue',
        speaker: '祝英台',
        text: '（坚定起身）山伯哥哥，我祝英台宁死不从这门亲事！若不能与你相守，我情愿...',
        next: 'liang_2b'
      },
      {
        id: 'liang_2b',
        type: 'dialogue',
        speaker: '梁山伯',
        text: '（急忙）英台，万不可如此！你我总会有办法的...',
        choices: [
          { text: '（握住她的手）让我来想办法', next: 'liang_comfort' },
          { text: '（悲痛）若你有事，我也不独活', next: 'liang_vow' }
        ]
      },
      
      {
        id: 'zhu_choice_1c',
        type: 'dialogue',
        speaker: '祝英台',
        text: '（无奈叹息）但女子岂能违抗父母之命？我虽心有不甘，却也无可奈何...',
        next: 'liang_2c'
      },
      {
        id: 'liang_2c',
        type: 'dialogue',
        speaker: '梁山伯',
        text: '英台，难道我们就这样认命吗？',
        choices: [
          { text: '（不甘）我不信命运如此安排', next: 'liang_rebel' },
          { text: '（黯然）或许这就是天意...', next: 'liang_accept' }
        ]
      },
      
      // ===== 梁山伯选择分支 =====
      {
        id: 'liang_propose',
        type: 'dialogue',
        speaker: '梁山伯',
        text: '（激动）英台，等我！我这就去祝家求见令尊，求他退了马家的亲事！',
        next: 'zhu_3a'
      },
      {
        id: 'zhu_3a',
        type: 'dialogue',
        speaker: '祝英台',
        text: '山伯哥哥，我爹爹他...',
        choices: [
          { text: '（担忧）他性情固执，恐怕不会答应', next: 'path_difficult' },
          { text: '（燃起希望）或许还有一线希望', next: 'path_hope' }
        ]
      },
      
      {
        id: 'liang_think',
        type: 'dialogue',
        speaker: '梁山伯',
        text: '（沉思）英台，容我想个万全之策。贸然行事恐怕适得其反...',
        next: 'zhu_3b'
      },
      {
        id: 'zhu_3b',
        type: 'dialogue',
        speaker: '祝英台',
        text: '（点头）山伯哥哥思虑周全，不知你有何计策？',
        choices: [
          { text: '（献策）不如我们私奔远走他乡', next: 'path_elope' },
          { text: '（等待）你说怎样便怎样', next: 'liang_plan' }
        ]
      },
      
      {
        id: 'liang_comfort',
        type: 'dialogue',
        speaker: '梁山伯',
        text: '（温柔握住她的手）英台，让我来想办法。无论如何，我都不会让你嫁给马文才。',
        next: 'zhu_touched'
      },
      
      {
        id: 'liang_vow',
        type: 'dialogue',
        speaker: '梁山伯',
        text: '（悲痛）英台，你若有什么事，我梁山伯也绝不独活于世！你我生同衾，死同穴！',
        next: 'zhu_vow_response'
      },
      
      {
        id: 'liang_rebel',
        type: 'dialogue',
        speaker: '梁山伯',
        text: '（攥紧拳头）我不信命运如此安排！英台，我们一起反抗这不公的命运！',
        next: 'zhu_rebel_response'
      },
      
      {
        id: 'liang_accept',
        type: 'dialogue',
        speaker: '梁山伯',
        text: '（黯然垂首）或许...这就是天意吧。我梁山伯一介寒门书生，如何配得上祝家小姐...',
        next: 'zhu_encourage'
      },
      
      // ===== 中段剧情 =====
      {
        id: 'path_difficult',
        type: 'dialogue',
        speaker: '祝英台',
        text: '（担忧）山伯哥哥，我爹爹性情固执，且已收了马家聘礼。恐怕...恐怕难以改变心意。',
        next: 'narration_conflict'
      },
      
      {
        id: 'path_hope',
        type: 'dialogue',
        speaker: '祝英台',
        text: '（眼中燃起希望）山伯哥哥，若你真能说服爹爹，或许还有一线希望！',
        next: 'narration_hope'
      },
      
      {
        id: 'path_elope',
        type: 'dialogue',
        speaker: '祝英台',
        text: '（大胆提议）山伯哥哥，不如我们私奔远走他乡？只要和你在一起，去哪里我都愿意！',
        next: 'liang_elope_response'
      },
      
      {
        id: 'liang_plan',
        type: 'dialogue',
        speaker: '梁山伯',
        text: '（深思）我有一计，或可一试。明日我便去求取功名，待我高中之日，再来提亲...',
        next: 'zhu_plan_response'
      },
      
      {
        id: 'zhu_touched',
        type: 'dialogue',
        speaker: '祝英台',
        text: '（感动落泪）山伯哥哥...有你这番话，英台此生无憾...',
        choices: [
          { text: '（坚强）我相信我们一定能在一起', next: 'path_faith' },
          { text: '（忧虑）只怕时日无多...', next: 'path_worry' }
        ]
      },
      
      {
        id: 'zhu_vow_response',
        type: 'dialogue',
        speaker: '祝英台',
        text: '（泪流满面）山伯哥哥！生同衾，死同穴...这句话，英台记下了！',
        next: 'narration_vow'
      },
      
      {
        id: 'zhu_rebel_response',
        type: 'dialogue',
        speaker: '祝英台',
        text: '（眼神坚定）好！山伯哥哥，英台与你共同面对！',
        choices: [
          { text: '（握紧他的手）我们一起抗争到底', next: 'path_rebel' },
          { text: '（犹豫）但若连累了你...', next: 'path_hesitate' }
        ]
      },
      
      {
        id: 'zhu_encourage',
        type: 'dialogue',
        speaker: '祝英台',
        text: '（急忙）山伯哥哥，你怎可如此看轻自己！在英台心中，你胜过世间所有男子！',
        next: 'liang_encouraged'
      },
      
      // ===== 过渡与高潮 =====
      {
        id: 'narration_conflict',
        type: 'narration',
        speaker: '旁白',
        text: '【月色渐暗，二人相对无言。封建礼教如同巨石，压在这对有情人心头】',
        next: 'final_scene'
      },
      
      {
        id: 'narration_hope',
        type: 'narration',
        speaker: '旁白',
        text: '【一丝希望在二人心中升起，然而命运的齿轮已然转动】',
        next: 'final_scene'
      },
      
      {
        id: 'liang_elope_response',
        type: 'dialogue',
        speaker: '梁山伯',
        text: '（挣扎）私奔...这虽是权宜之计，但英台，你愿意为我放弃一切吗？',
        choices: [
          { text: '（坚定）为了英台，我愿承担一切', next: 'path_elope_agree' },
          { text: '（犹豫）让我再想想...', next: 'path_elope_hesitate' }
        ]
      },
      
      {
        id: 'zhu_plan_response',
        type: 'dialogue',
        speaker: '祝英台',
        text: '（担忧）山伯哥哥，科举之路漫漫，婚期将至...恐怕来不及了...',
        next: 'liang_desperate'
      },
      
      {
        id: 'path_faith',
        type: 'dialogue',
        speaker: '祝英台',
        text: '（坚强地擦干眼泪）山伯哥哥，我相信我们一定能在一起！老天不会如此残忍！',
        next: 'final_scene'
      },
      
      {
        id: 'path_worry',
        type: 'dialogue',
        speaker: '祝英台',
        text: '（忧虑地望向远方）只怕时日无多...婚期就在下月...',
        next: 'liang_desperate'
      },
      
      {
        id: 'narration_vow',
        type: 'narration',
        speaker: '旁白',
        text: '【二人四目相对，泪眼朦胧。这一刻的誓言，将成为千古绝唱】',
        next: 'final_scene'
      },
      
      {
        id: 'path_rebel',
        type: 'dialogue',
        speaker: '祝英台',
        text: '（紧握他的手）山伯哥哥，我们一起抗争到底！纵使粉身碎骨，也绝不屈服！',
        next: 'narration_rebel'
      },
      
      {
        id: 'path_hesitate',
        type: 'dialogue',
        speaker: '祝英台',
        text: '（犹豫）但若连累了你，英台于心何安...',
        next: 'liang_no_fear'
      },
      
      {
        id: 'liang_encouraged',
        type: 'dialogue',
        speaker: '梁山伯',
        text: '（振作）英台...你说得对！我不能就此放弃！',
        choices: [
          { text: '（下定决心）我明日就去提亲', next: 'path_determined' },
          { text: '（感慨）遇到你是我此生最大的幸运', next: 'path_grateful' }
        ]
      },
      
      {
        id: 'path_elope_agree',
        type: 'dialogue',
        speaker: '梁山伯',
        text: '（坚定）好！英台，我们今夜就走！天涯海角，我陪你走到底！',
        next: 'zhu_elope_ready'
      },
      
      {
        id: 'path_elope_hesitate',
        type: 'dialogue',
        speaker: '梁山伯',
        text: '（犹豫）让我再想想...私奔毕竟是下策，或许还有更好的办法...',
        next: 'narration_time'
      },
      
      {
        id: 'liang_desperate',
        type: 'dialogue',
        speaker: '梁山伯',
        text: '（绝望）来不及了吗...难道真的来不及了吗？',
        choices: [
          { text: '（不甘）我不信没有办法', next: 'path_struggle' },
          { text: '（悲痛）天要亡我...', next: 'path_despair' }
        ]
      },
      
      {
        id: 'narration_rebel',
        type: 'narration',
        speaker: '旁白',
        text: '【二人决心共同抗争，然而封建礼教的枷锁，岂是轻易能够打破】',
        next: 'final_scene'
      },
      
      {
        id: 'liang_no_fear',
        type: 'dialogue',
        speaker: '梁山伯',
        text: '（认真地看着她）英台，能与你同甘共苦，是我的荣幸。哪怕赴汤蹈火，我也心甘情愿！',
        next: 'final_scene'
      },
      
      {
        id: 'path_determined',
        type: 'dialogue',
        speaker: '梁山伯',
        text: '（下定决心）英台，等我！明日我便去祝家，哪怕祝员外将我赶出来，我也要试一试！',
        next: 'final_scene'
      },
      
      {
        id: 'path_grateful',
        type: 'dialogue',
        speaker: '梁山伯',
        text: '（深情）英台，遇到你是我此生最大的幸运。无论结局如何，这份情，我永生不忘。',
        next: 'zhu_final_response'
      },
      
      {
        id: 'zhu_elope_ready',
        type: 'dialogue',
        speaker: '祝英台',
        text: '（激动）好！山伯哥哥，我这就去收拾行装！',
        choices: [
          { text: '（义无反顾）我们现在就走', next: 'path_elope_now' },
          { text: '（谨慎）还是明晚更安全', next: 'path_elope_tomorrow' }
        ]
      },
      
      {
        id: 'narration_time',
        type: 'narration',
        speaker: '旁白',
        text: '【时光流逝，良机错过。有些抉择，一旦犹豫便再无回头之路】',
        next: 'final_scene'
      },
      
      {
        id: 'path_struggle',
        type: 'dialogue',
        speaker: '梁山伯',
        text: '（不甘）我不信没有办法！英台，让我再想想，一定还有出路！',
        next: 'final_scene'
      },
      
      {
        id: 'path_despair',
        type: 'dialogue',
        speaker: '梁山伯',
        text: '（悲痛万分）天要亡我梁山伯...英台，来世...我们再续前缘...',
        next: 'zhu_despair_response'
      },
      
      {
        id: 'zhu_final_response',
        type: 'dialogue',
        speaker: '祝英台',
        text: '（含泪）山伯哥哥...此情此景，英台铭记于心。纵使不能相守，也要...也要...',
        choices: [
          { text: '（坚定）化蝶相随', next: 'ending_butterfly' },
          { text: '（祝福）愿你一生平安', next: 'ending_blessing' }
        ]
      },
      
      {
        id: 'path_elope_now',
        type: 'dialogue',
        speaker: '祝英台',
        text: '（义无反顾）好！山伯哥哥，我们现在就走，再不迟疑！',
        next: 'ending_elope'
      },
      
      {
        id: 'path_elope_tomorrow',
        type: 'dialogue',
        speaker: '祝英台',
        text: '（谨慎）还是明晚更安全。山伯哥哥，你先回去准备，明晚亥时，我们在城门相见。',
        next: 'narration_tomorrow'
      },
      
      {
        id: 'zhu_despair_response',
        type: 'dialogue',
        speaker: '祝英台',
        text: '（泣不成声）山伯哥哥！不要说来世...英台...英台愿随你而去...',
        next: 'ending_tragedy'
      },
      
      // ===== 最终场景 =====
      {
        id: 'final_scene',
        type: 'narration',
        speaker: '旁白',
        text: '【夜已深，更漏声声。二人依依惜别，不知这一别，是否还能再见】',
        next: 'liang_farewell'
      },
      
      {
        id: 'liang_farewell',
        type: 'dialogue',
        speaker: '梁山伯',
        text: '英台，夜深了，你该回去了。保重身体，等我的消息。',
        choices: [
          { text: '（不舍）我会等你', next: 'ending_wait' },
          { text: '（决绝）若等不到你，我也不独活', next: 'ending_vow' }
        ]
      },
      
      {
        id: 'narration_tomorrow',
        type: 'narration',
        speaker: '旁白',
        text: '【然而天不遂人愿，那个约定的明晚，二人终未能相见...】',
        next: 'ending_missed'
      },
      
      // ===== 多种结局 =====
      {
        id: 'ending_butterfly',
        type: 'narration',
        speaker: '旁白',
        text: '【后人传说，梁山伯忧思成疾而亡。祝英台出嫁途中，跃入梁山伯坟前，二人化作蝴蝶，双飞双宿，永不分离】',
        next: 'end'
      },
      
      {
        id: 'ending_blessing',
        type: 'narration',
        speaker: '旁白',
        text: '【祝英台终是嫁入马家，余生常望蝴蝶成双。而梁山伯虽未能遂愿，却将这份真情，留在了人间】',
        next: 'end'
      },
      
      {
        id: 'ending_elope',
        type: 'narration',
        speaker: '旁白',
        text: '【二人连夜出走，远遁江湖。虽是颠沛流离，却也相守一生。这另一种结局，或许更称人意】',
        next: 'end'
      },
      
      {
        id: 'ending_tragedy',
        type: 'narration',
        speaker: '旁白',
        text: '【一段旷世奇情，终成千古悲剧。唯有那化蝶的传说，寄托着世人对真爱的向往】',
        next: 'end'
      },
      
      {
        id: 'ending_wait',
        type: 'narration',
        speaker: '旁白',
        text: '【祝英台在楼台等待，等待着那个或许永远不会来的人。这份等待，成了她余生最深的执念】',
        next: 'end'
      },
      
      {
        id: 'ending_vow',
        type: 'narration',
        speaker: '旁白',
        text: '【生同衾，死同穴。这不只是誓言，更成了二人最终的归宿。千年之后，人们仍在传唱这段情】',
        next: 'end'
      },
      
      {
        id: 'ending_missed',
        type: 'narration',
        speaker: '旁白',
        text: '【错过的约定，成了永远的遗憾。命运弄人，有情人终未能成眷属】',
        next: 'end'
      },
      
      {
        id: 'end',
        type: 'end',
        speaker: '系统',
        text: '【剧终】感谢您的演绎，这段梁祝情缘，因您而更加动人。'
      }
    ]
  },
  
  // ===== 第二个剧本：天仙配 =====
  {
    id: 'tianxianpei',
    name: '天仙配',
    description: '董永与七仙女的凡间奇缘',
    cover: '/covers/tianxianpei.jpg',
    characters: [
      { id: 'dongyong', name: '董永', gender: 'male', description: '孝顺朴实的书生' },
      { id: 'qixiannv', name: '七仙女', gender: 'female', description: '向往人间的仙女' }
    ],
    nodes: [
      {
        id: 'start',
        type: 'start',
        speaker: '系统',
        text: '',
        next: 'narration_1'
      },
      {
        id: 'narration_1',
        type: 'narration',
        speaker: '旁白',
        text: '【槐荫树下，董永正在歇息。忽见一位美丽女子从天而降，飘然落在眼前】',
        next: 'qixiannv_1'
      },
      {
        id: 'qixiannv_1',
        type: 'dialogue',
        speaker: '七仙女',
        text: '这位大哥，小女子路过此地，见你愁眉不展，不知有何烦恼？',
        choices: [
          { text: '（好奇）仙子从何处来？', next: 'dongyong_curious' },
          { text: '（叹气）我为父债发愁', next: 'dongyong_worry' },
          { text: '（惊讶）你...你是仙女？', next: 'dongyong_shocked' }
        ]
      },
      {
        id: 'dongyong_curious',
        type: 'dialogue',
        speaker: '董永',
        text: '（好奇地打量）姑娘气质非凡，从何处来？为何会在这荒郊野外？',
        next: 'qixiannv_answer'
      },
      {
        id: 'dongyong_worry',
        type: 'dialogue',
        speaker: '董永',
        text: '（叹气）唉...我父亲去世，为葬父亲，我卖身为奴。如今正要去傅员外家做工抵债。',
        next: 'qixiannv_sympathy'
      },
      {
        id: 'dongyong_shocked',
        type: 'dialogue',
        speaker: '董永',
        text: '（惊讶）你...你从天而降，莫非是仙女下凡？',
        next: 'qixiannv_deny'
      },
      {
        id: 'qixiannv_answer',
        type: 'dialogue',
        speaker: '七仙女',
        text: '（微笑）我...我是邻村的，路过此地。见这槐荫树下清凉，便停下歇脚。',
        next: 'dongyong_introduce'
      },
      {
        id: 'qixiannv_sympathy',
        type: 'dialogue',
        speaker: '七仙女',
        text: '（心生怜悯）原来如此...大哥真是孝顺之人。这般境遇，令人心疼。',
        choices: [
          { text: '（感动）不如我助你一臂之力', next: 'qixiannv_help' },
          { text: '（询问）你可有婚配？', next: 'qixiannv_ask_marriage' }
        ]
      },
      {
        id: 'qixiannv_deny',
        type: 'dialogue',
        speaker: '七仙女',
        text: '（慌忙）哪里哪里，小女子不过是寻常村姑，如何会是仙女？大哥说笑了。',
        next: 'dongyong_apologize'
      },
      {
        id: 'dongyong_introduce',
        type: 'dialogue',
        speaker: '董永',
        text: '原来如此。在下董永，敢问姑娘芳名？',
        choices: [
          { text: '（恭敬）冒昧询问，多有得罪', next: 'qixiannv_name' },
          { text: '（直接）姑娘可愿与我交个朋友？', next: 'qixiannv_friend' }
        ]
      },
      {
        id: 'qixiannv_help',
        type: 'dialogue',
        speaker: '七仙女',
        text: '大哥不必客气。小女子虽是弱女子，但也略通织造。若大哥不嫌弃，我愿助你织绢抵债。',
        next: 'dongyong_surprised'
      },
      {
        id: 'qixiannv_ask_marriage',
        type: 'dialogue',
        speaker: '七仙女',
        text: '（脸红）大哥...大哥可有婚配？',
        next: 'dongyong_no_marriage'
      },
      {
        id: 'dongyong_apologize',
        type: 'dialogue',
        speaker: '董永',
        text: '（歉意）姑娘恕罪，是我唐突了。只是姑娘仙姿玉貌，令人不敢直视。',
        next: 'qixiannv_blush'
      },
      {
        id: 'qixiannv_name',
        type: 'dialogue',
        speaker: '七仙女',
        text: '（微笑）小女子姓张，单名一个巧字。大哥唤我张巧便是。',
        next: 'dongyong_fate'
      },
      {
        id: 'qixiannv_friend',
        type: 'dialogue',
        speaker: '七仙女',
        text: '（羞涩）交...交朋友？大哥真是爽快之人。',
        choices: [
          { text: '（点头）求之不得', next: 'path_friendship' },
          { text: '（大胆）不如我们结为夫妻', next: 'path_proposal' }
        ]
      },
      {
        id: 'dongyong_surprised',
        type: 'dialogue',
        speaker: '董永',
        text: '（惊喜）姑娘此话当真？可是...可是我身无分文，如何报答姑娘大恩？',
        choices: [
          { text: '（感激）若姑娘愿意，我愿以身相许', next: 'path_marry' },
          { text: '（惶恐）这如何使得', next: 'path_refuse' }
        ]
      },
      {
        id: 'dongyong_no_marriage',
        type: 'dialogue',
        speaker: '董永',
        text: '（摇头）家贫如洗，哪有女子愿意嫁我？至今孑然一身。',
        next: 'qixiannv_proposal'
      },
      {
        id: 'qixiannv_blush',
        type: 'dialogue',
        speaker: '七仙女',
        text: '（脸红）大哥过奖了...不知大哥为何在此叹气？',
        next: 'dongyong_explain'
      },
      {
        id: 'dongyong_fate',
        type: 'dialogue',
        speaker: '董永',
        text: '张巧姑娘，今日相遇，实乃天意。不知姑娘是否愿意...',
        choices: [
          { text: '（鼓起勇气）与我结为连理', next: 'qixiannv_accept' },
          { text: '（犹豫）...算了，我何德何能', next: 'qixiannv_encourage' }
        ]
      },
      {
        id: 'path_friendship',
        type: 'dialogue',
        speaker: '七仙女',
        text: '（开心）那好，从今日起，我们便是朋友了！',
        next: 'narration_friendship'
      },
      {
        id: 'path_proposal',
        type: 'dialogue',
        speaker: '七仙女',
        text: '（惊喜又羞涩）结...结为夫妻？大哥此话当真？',
        next: 'dongyong_confirm'
      },
      {
        id: 'path_marry',
        type: 'dialogue',
        speaker: '七仙女',
        text: '（欣喜）大哥此言，正合我意！小女子愿与大哥结为夫妻，共度此生！',
        next: 'narration_marriage'
      },
      {
        id: 'path_refuse',
        type: 'dialogue',
        speaker: '董永',
        text: '（惶恐）姑娘好意，我心领了。只是素昧平生，如何敢受此大恩？',
        next: 'qixiannv_insist'
      },
      {
        id: 'qixiannv_proposal',
        type: 'dialogue',
        speaker: '七仙女',
        text: '（大胆）大哥...小女子不嫌弃大哥贫寒。若大哥愿意，小女子愿意嫁给你为妻。',
        next: 'dongyong_overjoyed'
      },
      {
        id: 'dongyong_explain',
        type: 'dialogue',
        speaker: '董永',
        text: '唉，说来话长。我父亲去世，为葬父卖身为奴，如今要去做三年苦工...',
        next: 'qixiannv_solution'
      },
      {
        id: 'qixiannv_accept',
        type: 'dialogue',
        speaker: '七仙女',
        text: '（含羞点头）大哥若不嫌弃小女子...小女子愿意。',
        next: 'narration_vow'
      },
      {
        id: 'qixiannv_encourage',
        type: 'dialogue',
        speaker: '七仙女',
        text: '（温柔）大哥何必妄自菲薄？孝顺之人，最是难得。',
        choices: [
          { text: '（认真）我看大哥是良人', next: 'path_recognition' },
          { text: '（暗示）若有姑娘愿嫁，大哥可愿意？', next: 'path_hint' }
        ]
      },
      {
        id: 'dongyong_confirm',
        type: 'dialogue',
        speaker: '董永',
        text: '（郑重）千真万确！姑娘若愿意，我董永发誓一生一世对你好！',
        next: 'qixiannv_happy'
      },
      {
        id: 'narration_friendship',
        type: 'narration',
        speaker: '旁白',
        text: '【二人在槐荫树下相识相知，这段缘分，改变了他们的命运】',
        next: 'final_scene'
      },
      {
        id: 'narration_marriage',
        type: 'narration',
        speaker: '旁白',
        text: '【槐荫树作媒，二人结为夫妻。七仙女用天上的织艺，一夜织成十匹锦缎，助董永还清债务】',
        next: 'final_scene'
      },
      {
        id: 'qixiannv_insist',
        type: 'dialogue',
        speaker: '七仙女',
        text: '（坚持）大哥，小女子是真心实意的。请大哥不要推辞。',
        choices: [
          { text: '（感动）那我就恭敬不如从命', next: 'path_accept_help' },
          { text: '（坚持）还是不妥...', next: 'path_decline' }
        ]
      },
      {
        id: 'dongyong_overjoyed',
        type: 'dialogue',
        speaker: '董永',
        text: '（狂喜）姑娘...姑娘此话当真？我董永做梦也不敢想啊！',
        choices: [
          { text: '（感激涕零）多谢姑娘厚爱', next: 'ending_happy' },
          { text: '（自卑）姑娘如此仙姿，我怕配不上...', next: 'qixiannv_reassure' }
        ]
      },
      {
        id: 'qixiannv_solution',
        type: 'dialogue',
        speaker: '七仙女',
        text: '（眼神一亮）三年苦工？大哥，小女子有办法助你！',
        next: 'dongyong_hopeful'
      },
      {
        id: 'narration_vow',
        type: 'narration',
        speaker: '旁白',
        text: '【槐荫树为媒，清风作证。二人在树下许下誓言，结为夫妻】',
        next: 'ending_complete'
      },
      {
        id: 'path_recognition',
        type: 'dialogue',
        speaker: '七仙女',
        text: '（认真地看着他）大哥心地善良，孝顺父母，这样的人，才是真正的良人。',
        next: 'dongyong_moved'
      },
      {
        id: 'path_hint',
        type: 'dialogue',
        speaker: '七仙女',
        text: '（暗示）若有姑娘愿意嫁给大哥，大哥可愿意娶她？',
        next: 'dongyong_understand'
      },
      {
        id: 'qixiannv_happy',
        type: 'dialogue',
        speaker: '七仙女',
        text: '（喜极而泣）大哥！小女子愿意！这槐荫树为证，我们今日结为夫妻！',
        next: 'ending_marriage'
      },
      {
        id: 'path_accept_help',
        type: 'dialogue',
        speaker: '董永',
        text: '（感动）那我就恭敬不如从命了。姑娘大恩，永生难忘！',
        next: 'narration_weaving'
      },
      {
        id: 'path_decline',
        type: 'dialogue',
        speaker: '董永',
        text: '（坚持摇头）还是不妥，萍水相逢，如何能受此恩惠...',
        next: 'qixiannv_reveal'
      },
      {
        id: 'ending_happy',
        type: 'narration',
        speaker: '旁白',
        text: '【二人就此结为夫妻，恩爱非常。七仙女用仙术织绢，百日内织成三百匹，帮董永还清债务。虽然最终七仙女被召回天庭，但这段情缘，成为人间最美的传说】',
        next: 'end'
      },
      {
        id: 'qixiannv_reassure',
        type: 'dialogue',
        speaker: '七仙女',
        text: '（认真）大哥，在小女子心中，你便是世上最好的人。仙姿俗貌，都不重要。',
        next: 'ending_reassured'
      },
      {
        id: 'dongyong_hopeful',
        type: 'dialogue',
        speaker: '董永',
        text: '（眼中燃起希望）姑娘有何办法？',
        choices: [
          { text: '（急切）请姑娘赐教', next: 'qixiannv_plan' },
          { text: '（怀疑）姑娘莫不是在安慰我？', next: 'qixiannv_prove' }
        ]
      },
      {
        id: 'ending_complete',
        type: 'narration',
        speaker: '旁白',
        text: '【从此，七仙女陪伴董永，用天上的织艺帮他还清债务。虽然天上一日，人间一年，终有别离之日，但这份情，已刻入彼此心间】',
        next: 'end'
      },
      {
        id: 'dongyong_moved',
        type: 'dialogue',
        speaker: '董永',
        text: '（感动）姑娘如此看得起我...我...我真不知该说什么好...',
        next: 'qixiannv_direct'
      },
      {
        id: 'dongyong_understand',
        type: 'dialogue',
        speaker: '董永',
        text: '（恍然大悟）姑娘...姑娘是说...你愿意...愿意嫁给我？',
        next: 'qixiannv_nod'
      },
      {
        id: 'ending_marriage',
        type: 'narration',
        speaker: '旁白',
        text: '【槐荫树下，一段仙凡奇缘就此开始。七仙女用神奇的织艺，一夜之间织成百匹锦缎，帮助董永还清债务。虽然最终天规难违，七仙女被迫返回天庭，但他们的爱情故事，却在人间永远流传】',
        next: 'end'
      },
      {
        id: 'narration_weaving',
        type: 'narration',
        speaker: '旁白',
        text: '【七仙女施展仙术，一夜织成百匹锦缎。傅员外见之大喜，当即免除董永债务。二人也因此结下不解之缘】',
        next: 'final_scene'
      },
      {
        id: 'qixiannv_reveal',
        type: 'dialogue',
        speaker: '七仙女',
        text: '（叹气）罢了，实话告诉大哥吧。我...我其实是天上的仙女，下凡来寻找有缘人...',
        next: 'dongyong_shocked_again'
      },
      {
        id: 'ending_reassured',
        type: 'narration',
        speaker: '旁白',
        text: '【董永终于放下心中顾虑，与七仙女结为夫妻。这段仙凡奇缘，成就了一段千古佳话】',
        next: 'end'
      },
      {
        id: 'qixiannv_plan',
        type: 'dialogue',
        speaker: '七仙女',
        text: '（胸有成竹）小女子善于织造，一夜可织百匹。只要大哥愿意，我帮你织绢还债！',
        next: 'dongyong_amazed'
      },
      {
        id: 'qixiannv_prove',
        type: 'dialogue',
        speaker: '七仙女',
        text: '（认真）大哥不信？那小女子就证明给你看！',
        next: 'narration_miracle'
      },
      {
        id: 'qixiannv_direct',
        type: 'dialogue',
        speaker: '七仙女',
        text: '（大胆）那我就直说了——大哥，小女子对你一见倾心，愿意嫁给你为妻！',
        next: 'ending_direct'
      },
      {
        id: 'qixiannv_nod',
        type: 'dialogue',
        speaker: '七仙女',
        text: '（羞涩点头）嗯...只要大哥愿意...',
        next: 'ending_sweet'
      },
      {
        id: 'dongyong_shocked_again',
        type: 'dialogue',
        speaker: '董永',
        text: '（惊愕）仙...仙女？所以我没有看错？姑娘真是从天而降？',
        choices: [
          { text: '（激动）原来我有此福缘', next: 'ending_fate' },
          { text: '（惶恐）仙凡有别，这如何使得', next: 'ending_separation' }
        ]
      },
      {
        id: 'dongyong_amazed',
        type: 'dialogue',
        speaker: '董永',
        text: '（惊讶）一夜百匹？这...这怎么可能？姑娘莫不是神仙？',
        next: 'qixiannv_smile'
      },
      {
        id: 'narration_miracle',
        type: 'narration',
        speaker: '旁白',
        text: '【只见七仙女轻抬素手，指尖光华流转，一匹锦缎从虚空中缓缓织成。董永见状，惊为天人】',
        next: 'dongyong_believe'
      },
      {
        id: 'ending_direct',
        type: 'narration',
        speaker: '旁白',
        text: '【七仙女的真诚打动了董永，二人就此结缘。天上的仙女，人间的书生，谱写了一曲动人的爱情赞歌】',
        next: 'end'
      },
      {
        id: 'ending_sweet',
        type: 'narration',
        speaker: '旁白',
        text: '【在槐荫树的见证下，董永与七仙女结为夫妻。这段天赐良缘，成为后世传颂的佳话】',
        next: 'end'
      },
      {
        id: 'ending_fate',
        type: 'narration',
        speaker: '旁白',
        text: '【董永欣然接受这段天赐奇缘，与七仙女结为夫妻。虽然仙凡终有别离，但这份情，超越了天人之隔】',
        next: 'end'
      },
      {
        id: 'ending_separation',
        type: 'narration',
        speaker: '旁白',
        text: '【董永虽知这是天赐良缘，却不敢亵渎仙人。七仙女见他如此诚恳，更加确定他就是自己要等的人。终于，二人还是走到了一起】',
        next: 'end'
      },
      {
        id: 'qixiannv_smile',
        type: 'dialogue',
        speaker: '七仙女',
        text: '（神秘一笑）大哥莫问太多，只管信我便是。',
        next: 'final_scene'
      },
      {
        id: 'dongyong_believe',
        type: 'dialogue',
        speaker: '董永',
        text: '（跪下）仙女娘娘！小人有眼不识泰山，请恕罪！',
        next: 'qixiannv_raise'
      },
      {
        id: 'qixiannv_raise',
        type: 'dialogue',
        speaker: '七仙女',
        text: '（扶起他）大哥快起来！我下凡就是为了寻找你这样的有缘人。',
        next: 'ending_miracle'
      },
      {
        id: 'final_scene',
        type: 'narration',
        speaker: '旁白',
        text: '【槐荫树下的相遇，开启了一段传奇。无论结局如何，这份情缘，已成为永恒】',
        next: 'ending_open'
      },
      {
        id: 'ending_miracle',
        type: 'narration',
        speaker: '旁白',
        text: '【七仙女下凡寻觅真爱，终于在董永身上找到了。他们的故事，成为天上人间最美的传说】',
        next: 'end'
      },
      {
        id: 'ending_open',
        type: 'narration',
        speaker: '旁白',
        text: '【故事仍在继续，而他们的缘分，才刚刚开始...】',
        next: 'end'
      },
      {
        id: 'end',
        type: 'end',
        speaker: '系统',
        text: '【剧终】感谢您的演绎，这段天仙配的奇缘，因您而更加精彩。'
      }
    ]
  },
  
  // ===== 第三个剧本：女驸马 =====
  {
    id: 'nvfuma',
    name: '女驸马',
    description: '冯素珍女扮男装中状元的传奇故事',
    cover: '/covers/nvfuma.jpg',
    characters: [
      { id: 'feng', name: '冯素珍', gender: 'female', description: '才女佳人，女扮男装' },
      { id: 'li', name: '李兆廷', gender: 'male', description: '冯素珍的未婚夫' }
    ],
    nodes: [
      {
        id: 'start',
        type: 'start',
        speaker: '系统',
        text: '',
        next: 'narration_1'
      },
      {
        id: 'narration_1',
        type: 'narration',
        speaker: '旁白',
        text: '【金銮殿上，新科状元冯素珍（女扮男装）正受皇帝召见。公主对这位俊俏状元一见倾心，皇帝欲招其为驸马】',
        next: 'feng_1'
      },
      {
        id: 'feng_1',
        type: 'dialogue',
        speaker: '冯素珍',
        text: '（内心忐忑）这下如何是好？若推辞驸马之位，恐有欺君之罪；若应允，又将如何收场？',
        choices: [
          { text: '（冷静）先应下来，再做打算', next: 'feng_accept' },
          { text: '（慌张）臣...臣有难言之隐', next: 'feng_excuse' },
          { text: '（大胆）臣愿说出实情', next: 'feng_truth' }
        ]
      },
      {
        id: 'feng_accept',
        type: 'dialogue',
        speaker: '冯素珍',
        text: '（跪拜）臣谢主隆恩，愿为驸马。',
        next: 'narration_accept'
      },
      {
        id: 'feng_excuse',
        type: 'dialogue',
        speaker: '冯素珍',
        text: '（慌张）启禀陛下，臣...臣有难言之隐，恐怕无法担此大任...',
        next: 'emperor_curious'
      },
      {
        id: 'feng_truth',
        type: 'dialogue',
        speaker: '冯素珍',
        text: '（深吸一口气）陛下，臣有一事，不敢欺瞒圣上...',
        next: 'emperor_ask'
      },
      {
        id: 'narration_accept',
        type: 'narration',
        speaker: '旁白',
        text: '【冯素珍暂时应下驸马之位，退朝后心急如焚，思索着如何解决这燃眉之急】',
        next: 'feng_worry'
      },
      {
        id: 'emperor_curious',
        type: 'dialogue',
        speaker: '旁白',
        text: '皇帝闻言，面露不悦：「状元何出此言？莫非嫌弃朕的公主？」',
        next: 'feng_panic'
      },
      {
        id: 'emperor_ask',
        type: 'dialogue',
        speaker: '旁白',
        text: '皇帝闻言，示意她说下去：「哦？状元有何事不敢说？」',
        next: 'feng_reveal'
      },
      {
        id: 'feng_worry',
        type: 'dialogue',
        speaker: '冯素珍',
        text: '（独白）兆廷兄，你在狱中可还安好？我本是为救你才女扮男装赴考，如今中了状元又被招为驸马，这可如何是好...',
        choices: [
          { text: '（思索）我需尽快想个法子', next: 'feng_plan' },
          { text: '（决定）我要向公主坦白', next: 'feng_confess_princess' }
        ]
      },
      {
        id: 'feng_panic',
        type: 'dialogue',
        speaker: '冯素珍',
        text: '（慌忙）臣不敢！公主天姿国色，臣只是...只是家中已有婚约...',
        choices: [
          { text: '（编造）臣家中有病重老母', next: 'feng_lie_mother' },
          { text: '（实话）臣已有婚约在身', next: 'feng_truth_marriage' }
        ]
      },
      {
        id: 'feng_reveal',
        type: 'dialogue',
        speaker: '冯素珍',
        text: '（跪下）陛下恕罪，臣...臣其实是女儿身！',
        next: 'emperor_shocked'
      },
      {
        id: 'feng_plan',
        type: 'dialogue',
        speaker: '冯素珍',
        text: '（思索）若能在洞房之夜向公主说明一切，求她相助...或许还有转机。',
        next: 'narration_plan'
      },
      {
        id: 'feng_confess_princess',
        type: 'dialogue',
        speaker: '冯素珍',
        text: '（下定决心）我要找机会向公主坦白，希望她能理解我的苦衷...',
        next: 'scene_princess'
      },
      {
        id: 'feng_lie_mother',
        type: 'dialogue',
        speaker: '冯素珍',
        text: '（编造）臣家中有病重老母，需侍奉床前，实在无暇顾及婚事...',
        next: 'emperor_dismiss'
      },
      {
        id: 'feng_truth_marriage',
        type: 'dialogue',
        speaker: '冯素珍',
        text: '（鼓起勇气）启禀陛下，臣自幼与李家公子有婚约在身，不敢有负前约...',
        next: 'emperor_angry'
      },
      {
        id: 'emperor_shocked',
        type: 'dialogue',
        speaker: '旁白',
        text: '皇帝闻言大惊：「什么？女儿身？你这是欺君之罪！」',
        next: 'feng_explain'
      },
      {
        id: 'narration_plan',
        type: 'narration',
        speaker: '旁白',
        text: '【洞房花烛夜，冯素珍怀着忐忑的心情，等待着命运的裁决】',
        next: 'scene_bridal'
      },
      {
        id: 'scene_princess',
        type: 'narration',
        speaker: '旁白',
        text: '【冯素珍终于找到机会与公主单独相处】',
        next: 'feng_to_princess'
      },
      {
        id: 'emperor_dismiss',
        type: 'dialogue',
        speaker: '旁白',
        text: '皇帝摆手：「这有何难？朕许你带母进京，太医院为其诊治。驸马之事，不得再推辞！」',
        next: 'feng_cornered'
      },
      {
        id: 'emperor_angry',
        type: 'dialogue',
        speaker: '旁白',
        text: '皇帝面色一沉：「婚约？什么婚约比朕的公主更重要？」',
        next: 'feng_desperate'
      },
      {
        id: 'feng_explain',
        type: 'dialogue',
        speaker: '冯素珍',
        text: '（泣诉）陛下容禀！臣冯素珍，本是女儿身。只因未婚夫李兆廷被人陷害入狱，臣为救他，才女扮男装进京赴考，不想竟中了状元...',
        choices: [
          { text: '（恳求）求陛下开恩，饶臣一命', next: 'emperor_consider' },
          { text: '（慷慨）臣愿受死，但求陛下明察冤案', next: 'emperor_impressed' }
        ]
      },
      {
        id: 'scene_bridal',
        type: 'dialogue',
        speaker: '冯素珍',
        text: '（掀开盖头，面对公主）公主殿下，请恕臣无礼。臣有一事相告，还望公主恕罪...',
        next: 'princess_curious'
      },
      {
        id: 'feng_to_princess',
        type: 'dialogue',
        speaker: '冯素珍',
        text: '公主殿下，臣有一事不敢隐瞒。其实臣...臣是女儿身。',
        next: 'princess_shocked'
      },
      {
        id: 'feng_cornered',
        type: 'dialogue',
        speaker: '冯素珍',
        text: '（内心绝望）这下可如何是好？进退两难...',
        next: 'narration_cornered'
      },
      {
        id: 'feng_desperate',
        type: 'dialogue',
        speaker: '冯素珍',
        text: '（跪地）陛下息怒！臣...臣实在是...',
        choices: [
          { text: '（横下心）臣愿说出实情', next: 'feng_reveal' },
          { text: '（哀求）求陛下再给臣些时日', next: 'emperor_deadline' }
        ]
      },
      {
        id: 'emperor_consider',
        type: 'dialogue',
        speaker: '旁白',
        text: '皇帝沉吟片刻：「你说你未婚夫被人陷害？此事可有证据？」',
        next: 'feng_evidence'
      },
      {
        id: 'emperor_impressed',
        type: 'dialogue',
        speaker: '旁白',
        text: '皇帝闻言动容：「你一女子，为救未婚夫竟甘冒如此大险？倒是个有情有义之人。」',
        next: 'feng_grateful'
      },
      {
        id: 'princess_curious',
        type: 'dialogue',
        speaker: '旁白',
        text: '公主好奇地看着她：「驸马有何事相告？」',
        next: 'feng_confess_all'
      },
      {
        id: 'princess_shocked',
        type: 'dialogue',
        speaker: '旁白',
        text: '公主惊得站起身来：「什么？你是女子？」',
        next: 'feng_kneel_princess'
      },
      {
        id: 'narration_cornered',
        type: 'narration',
        speaker: '旁白',
        text: '【冯素珍进退维谷，只得先应下，再做打算。这一步棋，不知是福是祸】',
        next: 'scene_bridal'
      },
      {
        id: 'emperor_deadline',
        type: 'dialogue',
        speaker: '旁白',
        text: '皇帝不耐烦地挥手：「罢了罢了，朕给你三日时间。三日后，大婚！」',
        next: 'feng_three_days'
      },
      {
        id: 'feng_evidence',
        type: 'dialogue',
        speaker: '冯素珍',
        text: '（急忙）有！有证据！只需陛下派人重审此案，真相自会大白！',
        next: 'emperor_decree'
      },
      {
        id: 'feng_grateful',
        type: 'dialogue',
        speaker: '冯素珍',
        text: '（感激涕零）多谢陛下！臣与兆廷青梅竹马，情深意重，实在不忍见他蒙冤受屈...',
        next: 'emperor_decision'
      },
      {
        id: 'feng_confess_all',
        type: 'dialogue',
        speaker: '冯素珍',
        text: '（实话实说）公主殿下，其实臣是女儿身。臣本名冯素珍，为救未婚夫才女扮男装进京赴考...',
        next: 'princess_understanding'
      },
      {
        id: 'feng_kneel_princess',
        type: 'dialogue',
        speaker: '冯素珍',
        text: '（跪下）公主殿下恕罪！臣原本只想救出未婚夫，不想竟惊动了公主...',
        choices: [
          { text: '（恳求）求公主救臣', next: 'princess_help' },
          { text: '（慷慨）臣愿接受任何惩罚', next: 'princess_admire' }
        ]
      },
      {
        id: 'feng_three_days',
        type: 'dialogue',
        speaker: '冯素珍',
        text: '（独白）三日...三日内我必须想出办法，否则不只是欺君之罪，更要连累兆廷...',
        next: 'scene_plan_escape'
      },
      {
        id: 'emperor_decree',
        type: 'dialogue',
        speaker: '旁白',
        text: '皇帝大手一挥：「来人！传朕旨意，重审李兆廷一案！若真是冤案，朕定为其平反！」',
        next: 'ending_justice'
      },
      {
        id: 'emperor_decision',
        type: 'dialogue',
        speaker: '旁白',
        text: '皇帝点头：「好，朕就看你们这份情谊，饶你欺君之罪。朕这就下旨重审此案！」',
        next: 'feng_overjoyed'
      },
      {
        id: 'princess_understanding',
        type: 'dialogue',
        speaker: '旁白',
        text: '公主听完，非但没有生气，反而感动：「原来是这样...你为救未婚夫，甘愿冒此大险，真是难得的有情之人！」',
        next: 'princess_decision'
      },
      {
        id: 'princess_help',
        type: 'dialogue',
        speaker: '旁白',
        text: '公主扶起她：「你放心，本宫虽是公主，却也钦佩你这份情义。本宫定会帮你！」',
        next: 'ending_princess_help'
      },
      {
        id: 'princess_admire',
        type: 'dialogue',
        speaker: '旁白',
        text: '公主反而笑了：「你这般有情有义，本宫怎舍得惩罚你？起来吧，本宫帮你想办法！」',
        next: 'ending_princess_help'
      },
      {
        id: 'scene_plan_escape',
        type: 'dialogue',
        speaker: '冯素珍',
        text: '（思索）若能见到兆廷，商议对策...或许还有一线生机...',
        choices: [
          { text: '（决定）我要想办法入狱探视', next: 'feng_visit_prison' },
          { text: '（犹豫）不如先找人帮忙', next: 'feng_seek_help' }
        ]
      },
      {
        id: 'ending_justice',
        type: 'narration',
        speaker: '旁白',
        text: '【皇帝下旨重审，李兆廷冤案昭雪。冯素珍虽有欺君之嫌，但皇帝念其有情有义，不仅赦免其罪，更赐二人完婚。一段佳话，传为美谈】',
        next: 'end'
      },
      {
        id: 'feng_overjoyed',
        type: 'dialogue',
        speaker: '冯素珍',
        text: '（感激涕零）谢陛下隆恩！陛下圣明！',
        next: 'ending_happy'
      },
      {
        id: 'princess_decision',
        type: 'dialogue',
        speaker: '旁白',
        text: '公主思索片刻：「本宫有一计，或可助你...」',
        next: 'ending_princess_plan'
      },
      {
        id: 'ending_princess_help',
        type: 'narration',
        speaker: '旁白',
        text: '【在公主的帮助下，冯素珍终于见到了皇帝，陈述了事情的来龙去脉。皇帝被她的情义感动，不仅赦免了她的罪过，还下旨重审李兆廷一案。最终，真相大白，有情人终成眷属】',
        next: 'end'
      },
      {
        id: 'feng_visit_prison',
        type: 'dialogue',
        speaker: '冯素珍',
        text: '（换上便装）我要想办法进入大牢，与兆廷商议对策...',
        next: 'scene_prison'
      },
      {
        id: 'feng_seek_help',
        type: 'dialogue',
        speaker: '冯素珍',
        text: '（思索）朝中可有正直之臣，能助我一臂之力...',
        next: 'scene_help'
      },
      {
        id: 'ending_happy',
        type: 'narration',
        speaker: '旁白',
        text: '【李兆廷冤案昭雪，冯素珍功不可没。皇帝龙颜大悦，不仅赦免欺君之罪，更赐二人良缘，成就了一段千古佳话。正是：谁说女子不如男，巾帼英雄美名传】',
        next: 'end'
      },
      {
        id: 'ending_princess_plan',
        type: 'narration',
        speaker: '旁白',
        text: '【公主心生一计，助冯素珍化解危机。在她的斡旋下，皇帝终于知晓真相，不仅没有治罪，反而嘉许冯素珍的忠贞不渝。这段奇缘，成为朝野美谈】',
        next: 'end'
      },
      {
        id: 'scene_prison',
        type: 'narration',
        speaker: '旁白',
        text: '【冯素珍冒险入狱探视，与李兆廷相见】',
        next: 'li_surprised'
      },
      {
        id: 'scene_help',
        type: 'narration',
        speaker: '旁白',
        text: '【冯素珍四处奔走，终于找到了愿意帮助的朝臣】',
        next: 'ending_with_help'
      },
      {
        id: 'li_surprised',
        type: 'dialogue',
        speaker: '李兆廷',
        text: '（惊喜）素贞？你怎么会在这里？还穿着这身衣服？',
        next: 'feng_explain_li'
      },
      {
        id: 'ending_with_help',
        type: 'narration',
        speaker: '旁白',
        text: '【在众人的帮助下，冯素珍终于将冤案呈报御前。皇帝震怒，严惩奸佞，为李兆廷平反昭雪。冯素珍与李兆廷终于重逢，有情人终成眷属】',
        next: 'end'
      },
      {
        id: 'feng_explain_li',
        type: 'dialogue',
        speaker: '冯素珍',
        text: '（急忙解释）兆廷，说来话长。我女扮男装进京赴考，不想竟中了状元，还被招为驸马...',
        next: 'li_shocked'
      },
      {
        id: 'li_shocked',
        type: 'dialogue',
        speaker: '李兆廷',
        text: '（震惊）什么？状元？驸马？素贞，你这是...你这是为了救我？',
        choices: [
          { text: '（感动）素贞，你怎能如此冒险', next: 'li_moved' },
          { text: '（担忧）这下可如何是好', next: 'li_worried' }
        ]
      },
      {
        id: 'li_moved',
        type: 'dialogue',
        speaker: '李兆廷',
        text: '（感动落泪）素贞，你这是拿性命在冒险啊！若是被发现，那可是欺君之罪！',
        next: 'feng_determined'
      },
      {
        id: 'li_worried',
        type: 'dialogue',
        speaker: '李兆廷',
        text: '（担忧）素贞，这下可如何是好？我不能让你因为我而获罪啊！',
        next: 'feng_comfort_li'
      },
      {
        id: 'feng_determined',
        type: 'dialogue',
        speaker: '冯素珍',
        text: '（坚定）为了你，便是刀山火海，我也在所不惜！兆廷，我们定能共度此劫！',
        next: 'ending_together'
      },
      {
        id: 'feng_comfort_li',
        type: 'dialogue',
        speaker: '冯素珍',
        text: '（安慰）兆廷莫慌，天无绝人之路。我既能考中状元，自然也能想出办法来救你、救我们！',
        next: 'ending_together'
      },
      {
        id: 'ending_together',
        type: 'narration',
        speaker: '旁白',
        text: '【二人商议对策，决定向皇帝坦白一切。皇帝被冯素珍的忠贞感动，赦免其罪，更下旨重审李兆廷案。真相大白后，有情人终成眷属，传为千古佳话。正是：女扮男装为情郎，金榜题名美名扬】',
        next: 'end'
      },
      {
        id: 'end',
        type: 'end',
        speaker: '系统',
        text: '【剧终】感谢您的演绎，这段女驸马的传奇，因您而更加精彩。'
      }
    ]
  }
];

// 导出获取剧本的方法
export function getSceneById(id) {
  return scenes.find(s => s.id === id);
}

// 导出获取角色的方法
export function getCharactersBySceneId(sceneId) {
  const scene = getSceneById(sceneId);
  return scene ? scene.characters : [];
}