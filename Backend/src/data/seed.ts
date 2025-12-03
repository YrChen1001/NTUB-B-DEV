import { Category, Item } from "../models/types";

export const DEFAULT_CATEGORIES: Category[] = [
  { 
    id: "c1", 
    name: "愛情神諭", 
    description: "心靈與靈魂的連結", 
    color: "bg-rose-900" 
  },
  { 
    id: "c2", 
    name: "職涯指引", 
    description: "野心與成功", 
    color: "bg-slate-800" 
  },
  { 
    id: "c3", 
    name: "財富流動", 
    description: "豐盛與繁榮", 
    color: "bg-amber-700" 
  },
  { 
    id: "c4", 
    name: "守護靈獸", 
    description: "圖騰與指引", 
    color: "bg-emerald-900" 
  },
  { 
    id: "c5", 
    name: "每日箴言", 
    description: "即時指引", 
    color: "bg-indigo-900" 
  },
  { 
    id: "c6", 
    name: "陰影警示", 
    description: "隱藏的警告", 
    color: "bg-purple-950" 
  }
];

export const DEFAULT_ITEMS: Item[] = [
  // --- Love ---
  { id: "l1", categoryId: "c1", title: "雙生火焰", subtitle: "靈魂鏡像", content: "你即將遇到一個完美反映你內心的人，連結將會強烈而直接。", footer: "做好準備" },
  { id: "l2", categoryId: "c1", title: "業力債務", subtitle: "償還時刻", content: "過去的關係回歸以平衡天秤。這次學會教訓以打破循環。", footer: "保持智慧" },
  { id: "l3", categoryId: "c1", title: "自愛", subtitle: "基礎", content: "你無法從空杯中倒水。本週專注於自己的需求。當你完整時，浪漫自會隨之而來。", footer: "先療癒" },
  { id: "l4", categoryId: "c1", title: "陌生人", subtitle: "意料之外", content: "愛情不會轟轟烈烈地到來，而是在擁擠房間裡與陌生人安靜的瞬間。", footer: "抬頭看" },
  { id: "l5", categoryId: "c1", title: "放手", subtitle: "釋放", content: "緊握繩索正在灼傷你的手。放手吧，墜落並沒有你恐懼的那麼深。", footer: "自由" },
  { id: "l6", categoryId: "c1", title: "重逢", subtitle: "舊人回歸", content: "一個你以為已經離開故事的人，準備以全新身分回到你的生命裡。", footer: "打開心門" },
  { id: "l7", categoryId: "c1", title: "時間差", subtitle: "不同步的心", content: "你們正在往同一個方向走，只是不是同一個速度。耐心是關鍵。", footer: "放慢腳步" },
  
  // --- Career ---
  { id: "w1", categoryId: "c2", title: "皇帝", subtitle: "權威", content: "掌權。現在比以往任何時候都更需要你的領導能力。不要等待許可。", footer: "領導" },
  { id: "w2", categoryId: "c2", title: "合作", subtitle: "團隊合作", content: "孤狼在冬天會餓死。與競爭對手聯手實現共同目標。", footer: "團結" },
  { id: "w3", categoryId: "c2", title: "倦怠", subtitle: "警告", content: "火焰正在消退。休息不是獎勵；它是必需品。在被迫停止前停下來。", footer: "睡眠" },
  { id: "w4", categoryId: "c2", title: "創新", subtitle: "新點子", content: "舊鑰匙打不開新門。嘗試一種你以前認為太激進的方法。", footer: "創造" },
  { id: "w5", categoryId: "c2", title: "轉職門票", subtitle: "新跑道", content: "你手上握著一張可以離開現況的車票，只差你願不願意踏出那一步。", footer: "選擇權在你" },
  { id: "w6", categoryId: "c2", title: "隱形貢獻", subtitle: "被看見", content: "你默默做的事終將被看見。別急著證明，讓成果替你說話。", footer: "相信實力" },
  
  // --- Wealth ---
  { id: "m1", categoryId: "c3", title: "黃金雨", subtitle: "意外之財", content: "一筆小橫財即將到來。用它來清償債務，而不是購買更多雜物。", footer: "儲蓄" },
  { id: "m2", categoryId: "c3", title: "乾旱", subtitle: "謹慎", content: "勒緊褲帶。一段匱乏期即將來臨，但如果你準備好了，它將是短暫的。", footer: "節約" },
  { id: "m3", categoryId: "c3", title: "投資", subtitle: "成長", content: "在別人看來貧瘠的土壤中播種。你在別人看不到的地方看到了潛力。", footer: "風險" },
  { id: "m4", categoryId: "c3", title: "現金流", subtitle: "穩定", content: "與其追求一次性暴利，不如修好每天流進來的小水管。", footer: "細水長流" },
  { id: "m5", categoryId: "c3", title: "清單", subtitle: "斷捨離", content: "打開你的帳單與訂閱清單，你會發現可以立刻省下一筆看不見的漏財。", footer: "立刻整理" },
  
  // --- Spirit Animals ---
  { id: "s1", categoryId: "c4", title: "狼", subtitle: "直覺", content: "今天相信你的直覺勝過邏輯。你的原始大腦在眼睛看到危險之前就知道它。", footer: "嚎叫" },
  { id: "s2", categoryId: "c4", title: "貓頭鷹", subtitle: "智慧", content: "注視黑暗。別人恐懼的，你必須研究。真相隱藏在陰影中。", footer: "洞察" },
  { id: "s3", categoryId: "c4", title: "熊", subtitle: "力量", content: "堅守立場。你比你想像的更強大。如果必須冬眠就冬眠，但甦醒時要兇猛。", footer: "力量" },
  { id: "s4", categoryId: "c4", title: "蛇", subtitle: "蛻變", content: "脫掉舊皮。今天的你對於明天的你來說太渺小了。", footer: "改變" },
  { id: "s5", categoryId: "c4", title: "鷹", subtitle: "視角", content: "飛得更高。問題在地面看很大，從天空看卻很小。", footer: "翱翔" },
  { id: "s6", categoryId: "c4", title: "狐狸", subtitle: "靈巧", content: "別硬碰硬，用迂迴的方式處理今天的衝突，你會得到更好的結果。", footer: "換個角度" },
  { id: "s7", categoryId: "c4", title: "鯨魚", subtitle: "深度", content: "你正在處理的是深水區的情緒，別急著浮上岸，先把話說完。", footer: "容納自己" },

  // --- Daily Truth ---
  { id: "d1", categoryId: "c5", title: "沈默", subtitle: "行動", content: "停止說話。你的話語正在消耗能量。在沈默中行動，讓結果發聲。", footer: "安靜" },
  { id: "d2", categoryId: "c5", title: "混沌", subtitle: "擁抱它", content: "秩序是一種幻覺。今天擁抱混亂；其中蘊藏著美麗的驚喜。", footer: "流動" },
  { id: "d3", categoryId: "c5", title: "鏡子", subtitle: "反射", content: "你在別人身上討厭的東西也存在於你身上。修正反射。", footer: "觀看" },
  { id: "d4", categoryId: "c5", title: "勝利", subtitle: "成功", content: "一個小小的勝利即將到來。像慶祝重大勝利一樣慶祝它。", footer: "乾杯" },
  { id: "d5", categoryId: "c5", title: "延遲", subtitle: "不是拒絕", content: "宇宙暫時讓你等一下，不代表說不，而是還在排版路線。", footer: "耐心等候" },
  { id: "d6", categoryId: "c5", title: "重置", subtitle: "重新開始", content: "關掉再打開，不只是手機的解法。給自己一個重新整理的機會。", footer: "重新啟動" },

  // --- Dark Shadows ---
  { id: "dk1", categoryId: "c6", title: "背叛", subtitle: "小心背後", content: "不是每個對你微笑的人都是朋友。本週保守你的秘密。", footer: "誰都別信" },
  { id: "dk2", categoryId: "c6", title: "虛空", subtitle: "空虛", content: "你感到空虛是因為你給予那些沒有回報的人太多了。", footer: "切斷聯繫" },
  { id: "dk3", categoryId: "c6", title: "幻覺", subtitle: "虛假", content: "那個閃閃發光的機會是愚人金。走開。", footer: "提防" },
  { id: "dk4", categoryId: "c6", title: "拖延", subtitle: "假性安全感", content: "你以為還有很多時間，其實是在慢慢放棄自己真正想要的。", footer: "現在就動" },
  { id: "dk5", categoryId: "c6", title: "謊言", subtitle: "自我欺騙", content: "你對別人說的漂亮理由，其實是說給自己聽的藉口。", footer: "說真話" }
];
