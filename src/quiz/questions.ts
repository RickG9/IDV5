import type { Bi, Demand, KiteStyle, SupportStyle, Trait } from '../types'

/**
 * Effects move the player profile. Deltas on desire/style are in roughly [-1, 1];
 * ability values are 0-10 observations with a confidence weight.
 */
export type Effect =
  | { t: 'desire'; k: Trait; d: number }
  | { t: 'kite'; k: KiteStyle; d: number }
  | { t: 'support'; k: SupportStyle; d: number }
  | { t: 'ability'; k: Demand; v: number; w: number }
  | { t: 'ceiling'; d: number } // appetite for mastery / high skill ceiling
  | { t: 'forgive'; d: number } // wants forgiving, low-floor characters
  | { t: 'complexity'; d: number } // likes juggling many abilities (+) or simple kits (-)
  | { t: 'meta'; v: number } // suggested meta weight 0-0.5
  | { t: 'vibe'; k: string; d: number }

export interface Option {
  id: string
  label: Bi
  hint?: Bi
  fx?: Effect[]
}

export type QuestionKind =
  | 'single' // pick one option
  | 'multi' // pick several (max optional)
  | 'likert' // 5-point agreement; fx scaled by (v-3)/2
  | 'rate' // 1-5 self rating; fx ability value derived from rating
  | 'survivors' // pick survivors from roster
  | 'stats' // per-survivor in-game data table
  | 'games' // other games + level
  | 'text' // free text (AI-interpreted when a key is set)

export type Act = 'intent' | 'role' | 'chase' | 'team' | 'hands' | 'record' | 'stages' | 'taste'

export interface Question {
  id: string
  act: Act
  quick: boolean // included in Quick mode
  kind: QuestionKind
  text: Bi
  help?: Bi
  options?: Option[]
  max?: number
  /** likert/rate: effects applied with a signed scale s in [-1,1] (likert) or rating 1-5 (rate) */
  fx?: Effect[]
  /** rate: which ability the self-rating feeds */
  ability?: Demand
  anchors?: [Bi, Bi]
  optional?: boolean
  showIf?: (a: Answers) => boolean
}

export type AnswerValue = string | string[] | number | StatRow[] | GameEntry[] | undefined
export type Answers = Record<string, AnswerValue>

export interface StatRow {
  id: string // survivor id
  games?: number
  winRate?: number // escape/win %
  kiteTime?: number // avg contain seconds
  decode?: number // avg decode %
  rescues?: number // avg rescues per match
}
export interface GameEntry {
  id: string
  level: 1 | 2 | 3 | 4 // casual, decent, strong, top/ranked elite
  role?: string
}

const b = (en: string, cn: string): Bi => ({ en, cn })
const des = (k: Trait, d: number): Effect => ({ t: 'desire', k, d })
const kite = (k: KiteStyle, d: number): Effect => ({ t: 'kite', k, d })
const sup = (k: SupportStyle, d: number): Effect => ({ t: 'support', k, d })

export const ACTS: { id: Act; title: Bi; blurb: Bi; optional?: boolean }[] = [
  { id: 'intent', title: b('The Invitation', '邀请函'), blurb: b('What you want from tonight, and how you play.', '你想得到什么，以及你怎么玩。') },
  { id: 'role', title: b('The Role', '角色'), blurb: b('What you love doing in a match.', '你在对局里最享受做什么。') },
  { id: 'chase', title: b('The Chase', '追逐'), blurb: b('How you face the hunter.', '你如何面对监管者。') },
  { id: 'team', title: b('The Company', '同伴'), blurb: b('You and your teammates.', '你与队友。') },
  { id: 'hands', title: b('Hands & Nerve', '手法与心态'), blurb: b('Your mechanics — self-rated, or measured in the Trials.', '你的操作——自评，或在试炼中实测。') },
  { id: 'record', title: b('The Record', '战绩'), blurb: b('In-game numbers and the survivors you know.', '游戏内数据和你熟悉的求生者。'), optional: true },
  { id: 'stages', title: b('Other Stages', '其他舞台'), blurb: b('Games you have played before.', '你玩过的其他游戏。'), optional: true },
  { id: 'taste', title: b('Taste', '品味'), blurb: b('Aesthetic and personality — a light tiebreaker only.', '审美与性格——仅作轻微参考。'), optional: true },
]

const LIKERT_EN = ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree']
const LIKERT_CN = ['非常不同意', '不同意', '一般', '同意', '非常同意']
export const LIKERT = LIKERT_EN.map((en, i) => b(en, LIKERT_CN[i]))

export const QUESTIONS: Question[] = [
  // ───────────────────────── ACT 0 · INTENT ─────────────────────────
  {
    id: 'goals', act: 'intent', quick: true, kind: 'multi',
    text: b('What do you want to see at the end?', '你希望最后看到哪些内容？'),
    help: b('Pick as many as you like — the result page shows only what you choose.', '可多选——结果页只显示你选择的部分。'),
    options: [
      { id: 'main', label: b('My best-fit main', '最适合我的主玩角色') },
      { id: 'pool', label: b('A ranked character pool (3–4)', '排位角色池（3–4 个）') },
      { id: 'path', label: b('A learning path: easy now → main later', '学习路线：先易后难') },
      { id: 'team', label: b('Team comps that suit my picks', '适合我角色的阵容搭配') },
      { id: 'matchups', label: b('Hunter matchups for my picks', '我的角色对各监管者的优劣') },
      { id: 'skins', label: b('Skins for my picks', '推荐角色的时装') },
    ],
  },
  {
    id: 'queue', act: 'intent', quick: true, kind: 'single',
    text: b('How do you usually queue?', '你通常怎么排？'),
    options: [
      { id: 'solo', label: b('Solo with random teammates (野排)', '单排野队（野排）'), hint: b('Teammates are unpredictable — self-sufficient survivors score higher.', '队友不可控——能独立发挥的角色加分。') },
      { id: 'duo', label: b('Duo with a friend', '和朋友双排') },
      { id: 'premade', label: b('3–4 stack with voice (开黑)', '三排/四排语音开黑') },
    ],
  },
  {
    id: 'mode', act: 'intent', quick: true, kind: 'single',
    text: b('Which mode is this for?', '这是为哪个模式选角？'),
    options: [
      { id: 'ranked', label: b('Ranked 1v4', '排位赛'), fx: [{ t: 'meta', v: 0.3 }] },
      { id: 'quick', label: b('Quick match / custom', '匹配/自定义'), fx: [{ t: 'meta', v: 0.15 }] },
      { id: 'both', label: b('Both', '都有') },
    ],
  },
  {
    id: 'rank', act: 'intent', quick: true, kind: 'single',
    text: b('Your current survivor rank?', '你目前的求生者段位？'),
    options: [
      { id: 'none', label: b('Not ranked yet / new', '还没打排位/新手') },
      { id: 't1-4', label: b('Tier I–IV (一至四阶)', '一至四阶') },
      { id: 't5-6', label: b('Tier V–VI (五至六阶)', '五至六阶') },
      { id: 't7', label: b('Tier VII (七阶)', '七阶') },
      { id: 'peak', label: b('Peak VII / top ladder (巅峰七阶)', '巅峰七阶及以上') },
      { id: 'pro', label: b('I play competitively (IVL/COA/teams)', '我打比赛（IVL/COA/战队）') },
    ],
  },
  {
    id: 'experience', act: 'intent', quick: true, kind: 'single',
    text: b('Roughly how many Identity V matches have you played (any mode)?', '你大概玩过多少局第五人格（任意模式）？'),
    options: [
      { id: 'e0', label: b('Under 50', '50 局以内') },
      { id: 'e1', label: b('50 – 300', '50 – 300 局') },
      { id: 'e2', label: b('300 – 1,000', '300 – 1000 局') },
      { id: 'e3', label: b('1,000 – 3,000', '1000 – 3000 局') },
      { id: 'e4', label: b('3,000+', '3000 局以上') },
    ],
  },
  {
    id: 'platform', act: 'intent', quick: false, kind: 'single',
    text: b('What do you play on?', '你用什么设备玩？'),
    help: b('PC/emulator makes precise aiming and camera control easier.', '电脑/模拟器更容易精准瞄准和控制视角。'),
    options: [
      { id: 'phone', label: b('Phone', '手机') },
      { id: 'tablet', label: b('Tablet', '平板') },
      { id: 'pc', label: b('PC / emulator', '电脑/模拟器'), fx: [{ t: 'ability', k: 'aim', v: 6.5, w: 0.3 }] },
    ],
  },
  {
    id: 'winfun', act: 'intent', quick: false, kind: 'single',
    text: b('Winning or enjoying the character — which matters more?', '赢，还是玩得开心——哪个更重要？'),
    options: [
      { id: 'win', label: b('Winning. Give me what is strong.', '赢。给我强势的角色。'), fx: [{ t: 'meta', v: 0.4 }] },
      { id: 'balance', label: b('A bit of both', '都要一点'), fx: [{ t: 'meta', v: 0.25 }] },
      { id: 'fun', label: b('Enjoyment. Strength is a bonus.', '开心。强度只是加分项。'), fx: [{ t: 'meta', v: 0.1 }] },
    ],
  },

  {
    id: 'horizon', act: 'intent', quick: false, kind: 'single',
    text: b('Are you choosing a long-term main, or something to enjoy right now?', '你是在选长期主玩，还是想马上玩得开心？'),
    options: [
      { id: 'main', label: b('A main to invest months in', '愿意投入几个月的主玩'), fx: [{ t: 'ceiling', d: 0.4 }] },
      { id: 'now', label: b('Something fun I can pick up this week', '这周就能上手的有趣角色'), fx: [{ t: 'forgive', d: 0.4 }, { t: 'ceiling', d: -0.2 }] },
      { id: 'both', label: b('Both — show me each', '都要——分别给我看看') },
    ],
  },

  // ───────────────────────── ACT 1 · ROLE ─────────────────────────
  {
    id: 'job-disrupt', act: 'role', quick: false, kind: 'likert',
    text: b('Stunning or blocking the hunter is the most satisfying thing I can do.', '眩晕或阻挡监管者是我最有成就感的操作。'),
    fx: [des('disrupt', 0.9), kite('stun', 0.4)],
  },
  {
    id: 'calm-decode', act: 'role', quick: false, kind: 'likert',
    text: b('I can keep decoding calmly while the terror-radius heartbeat is pounding.', '心跳响起时我也能冷静地继续破译。'),
    fx: [des('decode', 0.4), des('selfSufficiency', 0.2), kite('stealth', 0.2)],
  },
  {
    id: 'flex', act: 'role', quick: false, kind: 'likert',
    text: b('I\'m happy to play whatever role my team is missing.', '队伍缺什么位置我都愿意补。'),
    fx: [des('support', 0.3), des('teamDependency', 0.3)],
  },
  {
    id: 'scn-first-down', act: 'role', quick: false, kind: 'single',
    text: b('The first teammate goes down far from you with four ciphers left. You…', '还剩四台机，第一个队友在远处倒地。你会……'),
    options: [
      { id: 'rescue', label: b('Head over to be the rescuer', '赶去当救人位'), fx: [des('rescue', 0.5)] },
      { id: 'second', label: b('Move closer as the backup / second rescue', '靠近准备补救/二救'), fx: [des('rescue', 0.3), des('support', 0.2)] },
      { id: 'decode', label: b('Keep decoding — pressure the clock', '继续修机——抢节奏'), fx: [des('decode', 0.5)] },
      { id: 'scout', label: b('Track the hunter to warn whoever is next', '盯住监管者提醒下一个目标'), fx: [des('info', 0.5)] },
    ],
  },
  {
    id: 'scn-camp', act: 'role', quick: false, kind: 'single',
    text: b('The hunter is camping the chair hard. What\'s your move?', '监管者死守椅子。你怎么做？'),
    options: [
      { id: 'tank', label: b('Take a hit to get them off — trade', '扛一刀硬救——换血'), fx: [des('survivability', 0.4), des('rescue', 0.3), kite('tank', 0.4)] },
      { id: 'stun', label: b('Stun or displace the hunter first', '先眩晕或位移监管者'), fx: [des('disrupt', 0.5), kite('stun', 0.3)] },
      { id: 'tools', label: b('Use a tool/ability to make the rescue safe', '用道具/技能保证安全救人'), fx: [sup('rescue-assist', 0.6), kite('displacement', 0.2)] },
      { id: 'rush', label: b('Punish the camp — rush ciphers', '惩罚守椅——全力修机'), fx: [des('decode', 0.5), des('selfSufficiency', 0.2)] },
    ],
  },
  {
    id: 'jobs', act: 'role', quick: true, kind: 'multi', max: 2,
    text: b('At the start of a match, what do you most want to be doing?', '开局时，你最想做什么？'),
    options: [
      { id: 'kite', label: b('Leading the hunter on a long chase', '拖住监管者，溜很久'), fx: [des('kite', 1), des('earlyGame', 0.4)] },
      { id: 'decode', label: b('Decoding ciphers fast', '快速破译密码机'), fx: [des('decode', 1)] },
      { id: 'rescue', label: b('Saving teammates from the chair', '把队友从狂欢之椅上救下来'), fx: [des('rescue', 1), des('lateGame', 0.2)] },
      { id: 'support', label: b('Keeping my team alive — heals, buffs, saves', '保住队友——治疗、增益、保护'), fx: [des('support', 1)] },
      { id: 'disrupt', label: b('Messing with the hunter — stuns, blocks', '干扰监管者——眩晕、阻挡'), fx: [des('disrupt', 1)] },
      { id: 'info', label: b('Scouting and calling out where the hunter is', '侦查并报点监管者位置'), fx: [des('info', 1)] },
    ],
  },
  {
    id: 'job-love', act: 'role', quick: false, kind: 'likert',
    text: b('Decoding ciphers is satisfying, not a chore.', '破译密码机让我有成就感，不是苦差事。'),
    fx: [des('decode', 0.8)],
  },
  {
    id: 'job-chase', act: 'role', quick: true, kind: 'likert',
    text: b('Being chased by the hunter is the most fun part of the game.', '被监管者追是游戏里最好玩的部分。'),
    fx: [des('kite', 0.9), des('survivability', 0.2)],
  },
  {
    id: 'job-rescue', act: 'role', quick: false, kind: 'likert',
    text: b('I feel responsible when a teammate is chaired — I want to be the one who goes.', '队友被绑时我觉得有责任——我想亲自去救。'),
    fx: [des('rescue', 0.9)],
  },
  {
    id: 'job-support', act: 'role', quick: false, kind: 'likert',
    text: b('I enjoy making teammates look good more than getting highlights myself.', '比起自己出彩，我更享受让队友发挥好。'),
    fx: [des('support', 0.8), des('teamDependency', 0.2)],
  },
  {
    id: 'job-info', act: 'role', quick: false, kind: 'likert',
    text: b('I like knowing things the rest of the team doesn\'t — where the hunter is, who is next.', '我喜欢掌握队友不知道的信息——监管者在哪、下一个是谁。'),
    fx: [des('info', 0.8)],
  },
  {
    id: 'highlight', act: 'role', quick: true, kind: 'single',
    text: b('Which highlight clip would you most want to post?', '你最想发哪个高光片段？'),
    options: [
      { id: 'kite5', label: b('Kiting the hunter for all five ciphers', '一人牵制完五台机'), fx: [des('kite', 0.8), des('survivability', 0.3)] },
      { id: 'stun3', label: b('Stunning the hunter three times in one chase', '一次追击里眩晕监管者三次'), fx: [des('disrupt', 0.8), kite('stun', 0.7)] },
      { id: 'double', label: b('A double rescue right before the chair fires', '椅子起飞前的极限双救'), fx: [des('rescue', 0.8), des('lateGame', 0.3)] },
      { id: 'heal', label: b('Keeping everyone alive so all four escape', '保住所有人四跑'), fx: [des('support', 0.8), sup('heal', 0.6)] },
      { id: 'ghost', label: b('Decoding three ciphers without being seen', '全程没被发现修完三台'), fx: [des('decode', 0.8), kite('stealth', 0.6)] },
      { id: 'call', label: b('The perfect callout that won the game', '一个完美报点赢下比赛'), fx: [des('info', 0.8), des('teamDependency', 0.2)] },
    ],
  },
  {
    id: 'button', act: 'role', quick: true, kind: 'multi', max: 2,
    text: b('You get one magic button. Which would you pick?', '给你一个技能按键，你选哪个？'),
    options: [
      { id: 'speed', label: b('Makes me suddenly faster', '让我瞬间加速'), fx: [kite('mobility', 0.9)] },
      { id: 'stun', label: b('Stuns the hunter', '眩晕监管者'), fx: [kite('stun', 0.9), des('disrupt', 0.4)] },
      { id: 'heal', label: b('Heals me or a teammate', '治疗自己或队友'), fx: [sup('heal', 0.9), des('support', 0.3)] },
      { id: 'reveal', label: b('Reveals where the hunter is', '显示监管者位置'), fx: [sup('info', 0.8), des('info', 0.4)] },
      { id: 'armor', label: b('Lets me survive one more hit', '让我多扛一刀'), fx: [kite('tank', 0.9), des('survivability', 0.4)] },
      { id: 'decode', label: b('Decodes faster', '加快破译'), fx: [sup('decode-buff', 0.5), des('decode', 0.5)] },
      { id: 'teleport', label: b('Moves me or a teammate somewhere else', '把我或队友传送到别处'), fx: [kite('displacement', 0.9), sup('rescue-assist', 0.3)] },
      { id: 'trick', label: b('Fools the hunter with a decoy or illusion', '用分身/幻象骗过监管者'), fx: [kite('trick', 0.9)] },
    ],
  },
  {
    id: 'phase', act: 'role', quick: false, kind: 'single',
    text: b('When do you want to matter most?', '你希望自己在什么时候最关键？'),
    options: [
      { id: 'early', label: b('Early — the first chase sets the game', '前期——第一波牵制决定比赛'), fx: [des('earlyGame', 0.9)] },
      { id: 'mid', label: b('Middle — rescues and trades', '中期——救人和换血'), fx: [des('rescue', 0.3), des('support', 0.3)] },
      { id: 'late', label: b('Endgame — gates, dungeon, the last save', '后期——开门、地窖、最后一救'), fx: [des('lateGame', 0.9)] },
      { id: 'all', label: b('Steady value the whole match', '全程稳定贡献') },
    ],
  },
  {
    id: 'scn-chair', act: 'role', quick: false, kind: 'single',
    text: b('Two ciphers left. A teammate is chaired across the map. You…', '还剩两台机。队友在地图另一头被绑了。你会……'),
    options: [
      { id: 'go', label: b('Sprint over and rescue', '跑过去救人'), fx: [des('rescue', 0.6), { t: 'ability', k: 'gameSense', v: 5, w: 0.1 }] },
      { id: 'finish', label: b('Finish the cipher — someone closer will go', '先修完——离得近的人会去'), fx: [des('decode', 0.6), des('selfSufficiency', 0.2)] },
      { id: 'cover', label: b('Go and harass the hunter to cover the rescuer', '过去干扰监管者掩护救人位'), fx: [des('disrupt', 0.5), des('support', 0.3)] },
      { id: 'scout', label: b('Watch where the hunter heads and call it', '观察监管者去向并报点'), fx: [des('info', 0.5)] },
    ],
  },
  {
    id: 'scn-gates', act: 'role', quick: false, kind: 'single',
    text: b('Gates are powered. One teammate is still down near the hunter. You…', '大门通电了。还有一名队友倒在监管者附近。你会……'),
    options: [
      { id: 'back', label: b('Go back for them — nobody gets left', '回去救——不能丢下任何人'), fx: [des('rescue', 0.5), des('lateGame', 0.4)] },
      { id: 'block', label: b('Body-block / tank so they can escape', '卡位/扛刀让他走'), fx: [des('survivability', 0.5), des('support', 0.3), kite('tank', 0.3)] },
      { id: 'leave', label: b('Leave. Three out is a win.', '走。三跑也是赢。'), fx: [des('selfSufficiency', 0.4)] },
      { id: 'stun', label: b('Stun or distract the hunter off them', '眩晕或引开监管者'), fx: [des('disrupt', 0.5), kite('stun', 0.3)] },
    ],
  },
  {
    id: 'scn-found', act: 'chase', quick: false, kind: 'single',
    text: b('The hunter finds you first, 20 seconds in. Your gut reaction?', '开局 20 秒监管者先找到了你。你的第一反应？'),
    options: [
      { id: 'good', label: b('Good. I\'ll hold them for three ciphers.', '正好。我能拖三台机。'), fx: [des('kite', 0.7), des('earlyGame', 0.4)] },
      { id: 'lead', label: b('Drag them towards a teammate who can help', '把它引到能帮忙的队友那'), fx: [des('teamDependency', 0.3), des('support', 0.2)] },
      { id: 'hide', label: b('Break line of sight and hide', '断视野然后藏起来'), fx: [kite('stealth', 0.6), des('kite', -0.2)] },
      { id: 'panic', label: b('Panic, honestly', '说实话，慌了'), fx: [{ t: 'forgive', d: 0.6 }, des('kite', -0.4), des('survivability', 0.4)] },
    ],
  },

  // ───────────────────────── ACT 2 · CHASE ─────────────────────────
  {
    id: 'chase-style', act: 'chase', quick: true, kind: 'multi', max: 3,
    text: b('How do you like to survive a chase?', '你喜欢怎么在追击中活下来？'),
    options: [
      { id: 'looping', label: b('Looping pallets and windows perfectly', '完美绕板窗'), fx: [kite('looping', 1), { t: 'ability', k: 'mapKnowledge', v: 6, w: 0.1 }] },
      { id: 'mobility', label: b('Outrunning with dashes and speed', '靠冲刺和加速拉开距离'), fx: [kite('mobility', 1)] },
      { id: 'stun', label: b('Stunning or slowing the hunter', '眩晕或减速监管者'), fx: [kite('stun', 1)] },
      { id: 'stealth', label: b('Not being found at all', '根本不被发现'), fx: [kite('stealth', 1)] },
      { id: 'tank', label: b('Soaking hits and staying up', '硬扛伤害不倒'), fx: [kite('tank', 1)] },
      { id: 'displacement', label: b('Teleports, swaps, rewinds', '传送、换位、回溯'), fx: [kite('displacement', 1)] },
      { id: 'trick', label: b('Mind games, decoys and fakes', '心理博弈、分身、假动作'), fx: [kite('trick', 1), { t: 'ceiling', d: 0.2 }] },
    ],
  },
  {
    id: 'risk', act: 'chase', quick: true, kind: 'single',
    text: b('Which describes your play?', '哪个更像你？'),
    options: [
      { id: 'safe', label: b('Safe and consistent — no throws', '稳——不失误'), fx: [{ t: 'forgive', d: 0.5 }, { t: 'ceiling', d: -0.3 }] },
      { id: 'mixed', label: b('Calculated risks when it pays', '有把握时才冒险') },
      { id: 'flashy', label: b('High risk, high reward. Style matters.', '高风险高回报，操作要秀'), fx: [{ t: 'ceiling', d: 0.7 }, { t: 'forgive', d: -0.3 }, des('disrupt', 0.2)] },
    ],
  },
  {
    id: 'mistake', act: 'chase', quick: false, kind: 'single',
    text: b('When you mess up a chase, you want your survivor to…', '当你溜鬼失误时，你希望你的角色……'),
    options: [
      { id: 'forgive', label: b('Give me a second chance', '给我第二次机会'), fx: [{ t: 'forgive', d: 0.8 }, des('survivability', 0.4)] },
      { id: 'punish', label: b('Punish me — the payoff should be worth it', '惩罚我——但上限够高就值'), fx: [{ t: 'ceiling', d: 0.8 }, { t: 'forgive', d: -0.4 }] },
    ],
  },
  {
    id: 'complexity', act: 'chase', quick: true, kind: 'single',
    text: b('How many abilities do you like to juggle?', '你喜欢同时管理多少技能？'),
    options: [
      { id: 'one', label: b('One clear button', '一个清晰的技能'), fx: [{ t: 'complexity', d: -0.8 }, { t: 'forgive', d: 0.3 }] },
      { id: 'few', label: b('Two or three', '两三个'), fx: [{ t: 'complexity', d: 0 }] },
      { id: 'many', label: b('As many as possible — resource management is fun', '越多越好——资源管理很有趣'), fx: [{ t: 'complexity', d: 0.8 }, { t: 'ceiling', d: 0.3 }] },
    ],
  },
  {
    id: 'grind', act: 'chase', quick: false, kind: 'likert',
    text: b('I\'m happy to lose games for weeks while I master a hard character.', '为了练成一个难角色，我愿意连输好几周。'),
    fx: [{ t: 'ceiling', d: 0.8 }, { t: 'forgive', d: -0.4 }],
  },
  {
    id: 'aimfun', act: 'chase', quick: false, kind: 'likert',
    text: b('Landing a skillshot (projectile, dash, lasso) feels amazing.', '命中一个指向性技能（投射物、冲刺、套索）感觉超爽。'),
    fx: [{ t: 'ceiling', d: 0.2 }],
  },
  {
    id: 'hide-ok', act: 'chase', quick: false, kind: 'likert',
    text: b('I\'d rather avoid the hunter entirely than out-play them in a chase.', '比起在追击中秀监管者，我更想完全避开它。'),
    fx: [kite('stealth', 0.7), des('kite', -0.4), des('decode', 0.3)],
  },

  {
    id: 'loops', act: 'chase', quick: false, kind: 'likert',
    text: b('I enjoy learning each map\'s layout and its strongest loops.', '我喜欢研究每张地图的结构和强点。'),
    fx: [kite('looping', 0.6), des('kite', 0.3)],
  },
  {
    id: 'mindgames', act: 'chase', quick: false, kind: 'likert',
    text: b('Baiting the hunter into mistakes — fakes, jukes, mind games — is the best part of a chase.', '骗监管者犯错——假动作、走位、心理博弈——是追击中最好玩的部分。'),
    fx: [kite('trick', 0.7), { t: 'ceiling', d: 0.3 }],
  },
  {
    id: 'chase-length', act: 'chase', quick: false, kind: 'single',
    text: b('Your ideal chase?', '你理想中的追击是？'),
    options: [
      { id: 'short', label: b('Short — buy time, then hand the hunter to someone else', '短——拖一会儿，然后把监管者交给别人'), fx: [des('support', 0.2), des('kite', -0.2)] },
      { id: 'medium', label: b('Long enough for two ciphers', '够修两台机就好'), fx: [des('kite', 0.2)] },
      { id: 'marathon', label: b('A marathon. The hunter should regret choosing me.', '马拉松。让监管者后悔追我。'), fx: [des('kite', 0.6), des('survivability', 0.3)] },
    ],
  },

  // ───────────────────────── ACT 3 · TEAM ─────────────────────────
  {
    id: 'callouts', act: 'team', quick: false, kind: 'likert',
    text: b('I call out where the hunter is heading and who is likely next.', '我会报点监管者的去向和下一个目标。'),
    fx: [des('info', 0.5), { t: 'ability', k: 'comms', v: 7, w: 0.25 }],
  },
  {
    id: 'selfless', act: 'team', quick: false, kind: 'likert',
    text: b('I\'d rather save a teammate than secure my own escape.', '我宁愿救下队友，也不急着自己逃出去。'),
    fx: [des('rescue', 0.5), des('support', 0.3), des('selfSufficiency', -0.2)],
  },
  {
    id: 'friends', act: 'team', quick: false, kind: 'single',
    text: b('The friends you queue with usually play…', '和你组队的朋友通常玩……'),
    showIf: (a) => a.queue === 'duo' || a.queue === 'premade',
    options: [
      { id: 'kiters', label: b('Kiters', '牵制位'), fx: [des('decode', 0.3), des('support', 0.3), des('kite', -0.2)] },
      { id: 'rescuers', label: b('Rescuers', '救人位'), fx: [des('kite', 0.3), des('decode', 0.2), des('rescue', -0.2)] },
      { id: 'supports', label: b('Supports / decoders', '辅助/修机位'), fx: [des('kite', 0.3), des('rescue', 0.3)] },
      { id: 'mixed', label: b('It varies', '不固定') },
    ],
  },
  {
    id: 'voice', act: 'team', quick: true, kind: 'single',
    text: b('Do you use voice or quick-chat callouts?', '你会用语音或快捷消息报点吗？'),
    options: [
      { id: 'never', label: b('Rarely — I just play', '很少——我只管自己玩'), fx: [{ t: 'ability', k: 'comms', v: 2, w: 0.8 }] },
      { id: 'quick', label: b('Quick-chat pings', '会用快捷消息'), fx: [{ t: 'ability', k: 'comms', v: 5, w: 0.8 }] },
      { id: 'voice', label: b('Voice with friends', '和朋友开语音'), fx: [{ t: 'ability', k: 'comms', v: 8.5, w: 0.8 }] },
    ],
  },
  {
    id: 'lonewolf', act: 'team', quick: true, kind: 'likert',
    text: b('I trust my teammates to do their job.', '我相信队友会做好自己的事。'),
    fx: [des('teamDependency', 0.6), des('selfSufficiency', -0.4)],
  },
  {
    id: 'carry', act: 'team', quick: false, kind: 'likert',
    text: b('I want to be able to carry a bad team on my own.', '我希望自己能带飞一支不靠谱的队伍。'),
    fx: [des('selfSufficiency', 0.8), { t: 'ceiling', d: 0.3 }],
  },
  {
    id: 'support-style', act: 'team', quick: false, kind: 'multi', max: 3,
    text: b('Which kinds of help do you enjoy giving?', '你喜欢提供哪种帮助？'),
    options: [
      { id: 'heal', label: b('Healing', '治疗'), fx: [sup('heal', 1)] },
      { id: 'shield', label: b('Shields / damage prevention', '护盾/免伤'), fx: [sup('shield', 1)] },
      { id: 'speed', label: b('Speed boosts', '加速'), fx: [sup('speed', 1)] },
      { id: 'info', label: b('Information / scouting', '信息/侦查'), fx: [sup('info', 1)] },
      { id: 'rescue-assist', label: b('Making rescues safe', '让救人更安全'), fx: [sup('rescue-assist', 1)] },
      { id: 'decode-buff', label: b('Speeding up decoding', '加快破译'), fx: [sup('decode-buff', 1)] },
      { id: 'hunter-debuff', label: b('Weakening the hunter', '削弱监管者'), fx: [sup('hunter-debuff', 1)] },
      { id: 'revive', label: b('Picking people back up', '拉起倒地队友'), fx: [sup('revive', 1)] },
      { id: 'none', label: b('I\'d rather not support', '不太想当辅助'), fx: [des('support', -0.6)] },
    ],
  },
  {
    id: 'reliable', act: 'team', quick: false, kind: 'single',
    text: b('At your usual rank, how reliable are random teammates?', '在你常打的段位，野队队友靠谱吗？'),
    showIf: (a) => a.queue === 'solo',
    options: [
      { id: 'bad', label: b('Mostly unreliable', '大多不靠谱'), fx: [des('selfSufficiency', 0.6), des('teamDependency', -0.5)] },
      { id: 'ok', label: b('Mixed', '看运气') },
      { id: 'good', label: b('Usually fine', '通常还行'), fx: [des('teamDependency', 0.2)] },
    ],
  },
  {
    id: 'blame', act: 'team', quick: false, kind: 'likert',
    text: b('I don\'t mind being the one blamed if the team wipes — I\'ll still take the risky role.', '即使团灭背锅，我也愿意承担高风险位置。'),
    fx: [des('rescue', 0.4), des('kite', 0.3), { t: 'ceiling', d: 0.2 }],
  },

  // ───────────────────────── ACT 4 · HANDS ─────────────────────────
  {
    id: 'r-aim', act: 'hands', quick: true, kind: 'rate', ability: 'aim',
    text: b('Aim — hitting moving targets and predicting where they\'ll be.', '瞄准——命中移动目标、预判走位。'),
    anchors: [b('Rarely land them', '基本打不中'), b('Pinpoint', '指哪打哪')],
  },
  {
    id: 'r-timing', act: 'hands', quick: true, kind: 'rate', ability: 'timing',
    text: b('Timing — hitting narrow windows (parries, calibrations, pallet stuns).', '时机——把握极短窗口（弹反、校准、砸板）。'),
    anchors: [b('Often early/late', '经常早了或晚了'), b('Frame-perfect', '帧级精准')],
  },
  {
    id: 'r-reaction', act: 'hands', quick: false, kind: 'rate', ability: 'reaction',
    text: b('Reaction speed — responding the instant something happens.', '反应速度——事情发生时立刻反应。'),
    anchors: [b('Slow', '偏慢'), b('Lightning', '闪电般')],
  },
  {
    id: 'r-map', act: 'hands', quick: true, kind: 'rate', ability: 'mapKnowledge',
    text: b('Identity V map knowledge — pallets, windows, strong loops, cipher spawns.', '第五人格地图理解——板窗位置、强点、密码机刷新。'),
    anchors: [b('I get lost', '经常迷路'), b('I know every loop', '每个点位都熟')],
  },
  {
    id: 'r-sense', act: 'hands', quick: false, kind: 'rate', ability: 'gameSense',
    text: b('Game sense — reading the hunter, knowing when to rescue, decode or leave.', '意识——读懂监管者，知道何时救人、修机或走人。'),
    anchors: [b('Still learning', '还在学'), b('I read the whole match', '全局都在掌握')],
  },
  {
    id: 'r-multi', act: 'hands', quick: false, kind: 'rate', ability: 'multitask',
    text: b('Multitasking — tracking cooldowns, resources and the map at once.', '多线操作——同时关注冷却、资源和地图。'),
    anchors: [b('One thing at a time', '一次一件事'), b('Everything at once', '全都兼顾')],
  },
  {
    id: 'r-mech', act: 'hands', quick: false, kind: 'rate', ability: 'mechanics',
    text: b('Overall execution — camera control, movement, combos under pressure.', '整体操作——视角、走位、高压下的连招。'),
    anchors: [b('Clumsy', '手忙脚乱'), b('Clean', '行云流水')],
  },
  {
    id: 'trials', act: 'hands', quick: true, kind: 'single', optional: true,
    text: b('Want to measure your hands instead? The Trials take about 3 minutes.', '想实测一下吗？试炼大约需要 3 分钟。'),
    help: b('Reaction, timing window, aim/flick and multitask tests. Results override self-ratings where they overlap.', '反应、时机窗口、瞄准/甩枪和多线测试。结果会覆盖对应的自评。'),
    options: [
      { id: 'yes', label: b('Take the Trials after this Act', '本幕结束后进行试炼') },
      { id: 'no', label: b('Skip — use my self-ratings', '跳过——用我的自评') },
    ],
  },

  // ───────────────────────── ACT 5 · RECORD ─────────────────────────
  {
    id: 'liked', act: 'record', quick: true, kind: 'survivors', optional: true,
    text: b('Survivors you have enjoyed playing (any)', '你玩得开心的求生者（可多选）'),
    help: b('Similar survivors get a boost. Leave empty if you are new.', '相似的求生者会加分。新手可以留空。'),
  },
  {
    id: 'disliked', act: 'record', quick: false, kind: 'survivors', optional: true,
    text: b('Survivors you have tried and disliked', '你试过但不喜欢的求生者'),
  },
  {
    id: 'owned', act: 'record', quick: false, kind: 'survivors', optional: true,
    text: b('Survivors you already own', '你已拥有的求生者'),
    help: b('Used for the "owned only" filter and to flag picks worth buying.', '用于"仅显示已拥有"筛选，并标记值得购买的角色。'),
  },
  {
    id: 'confident', act: 'record', quick: false, kind: 'single',
    text: b('How many survivors can you play confidently right now?', '你现在能熟练使用多少个求生者？'),
    options: [
      { id: 'c0', label: b('None yet', '还没有'), fx: [{ t: 'ability', k: 'gameSense', v: 2.5, w: 0.25 }] },
      { id: 'c1', label: b('1–2', '1–2 个'), fx: [{ t: 'ability', k: 'gameSense', v: 4.5, w: 0.25 }] },
      { id: 'c2', label: b('3–6', '3–6 个'), fx: [{ t: 'ability', k: 'gameSense', v: 6.5, w: 0.25 }, { t: 'ability', k: 'mapKnowledge', v: 6, w: 0.15 }] },
      { id: 'c3', label: b('7 or more', '7 个以上'), fx: [{ t: 'ability', k: 'gameSense', v: 8, w: 0.25 }, { t: 'ability', k: 'mapKnowledge', v: 7.5, w: 0.15 }] },
    ],
  },
  {
    id: 'stats', act: 'record', quick: false, kind: 'stats', optional: true,
    text: b('Per-survivor stats from your Personal Data screen', '个人数据页中各求生者的数据'),
    help: b('Add the survivors you have played most. Any field can be left blank.', '添加你最常玩的求生者，任何字段都可以留空。'),
  },

  // ───────────────────────── ACT 6 · STAGES ─────────────────────────
  {
    id: 'games', act: 'stages', quick: false, kind: 'games', optional: true,
    text: b('Other games you have played, and how well', '你玩过的其他游戏及水平'),
    help: b('Skills that transfer (aim, timing, map sense) are carried over — but Identity V-specific knowledge still comes from Identity V.', '可迁移的能力（瞄准、时机、地图意识）会被计入——但第五人格专属的理解仍以本作经验为准。'),
  },
  {
    id: 'games-text', act: 'stages', quick: false, kind: 'text', optional: true,
    text: b('Anything else about your gaming background or how you like to play?', '关于你的游戏经历或游玩偏好，还有什么想说的？'),
    help: b('Free text. Read by the AI assistant if you have added a key in Settings; otherwise ignored.', '自由填写。若在设置中添加了 AI 密钥，将由 AI 解读；否则忽略。'),
  },

  // ───────────────────────── ACT 7 · TASTE ─────────────────────────
  {
    id: 'vibe', act: 'taste', quick: false, kind: 'multi', max: 4, optional: true,
    text: b('Which character moods draw you in?', '哪些角色气质吸引你？'),
    options: [
      { id: 'gothic', label: b('Dark & gothic', '暗黑哥特'), fx: [{ t: 'vibe', k: 'gothic', d: 1 }] },
      { id: 'elegant', label: b('Elegant & refined', '优雅精致'), fx: [{ t: 'vibe', k: 'elegant', d: 1 }] },
      { id: 'playful', label: b('Playful & cheerful', '活泼开朗'), fx: [{ t: 'vibe', k: 'playful', d: 1 }] },
      { id: 'tragic', label: b('Tragic & melancholic', '悲剧忧郁'), fx: [{ t: 'vibe', k: 'tragic', d: 1 }] },
      { id: 'mysterious', label: b('Mysterious & eerie', '神秘诡异'), fx: [{ t: 'vibe', k: 'mysterious', d: 1 }] },
      { id: 'heroic', label: b('Brave & heroic', '勇敢英雄'), fx: [{ t: 'vibe', k: 'heroic', d: 1 }] },
      { id: 'rugged', label: b('Rugged & tough', '粗犷硬朗'), fx: [{ t: 'vibe', k: 'rugged', d: 1 }] },
      { id: 'cunning', label: b('Cunning & mischievous', '狡黠顽皮'), fx: [{ t: 'vibe', k: 'cunning', d: 1 }] },
      { id: 'gentle', label: b('Kind & gentle', '温柔善良'), fx: [{ t: 'vibe', k: 'gentle', d: 1 }] },
      { id: 'eccentric', label: b('Eccentric & artistic', '古怪艺术'), fx: [{ t: 'vibe', k: 'eccentric', d: 1 }] },
    ],
  },
  {
    id: 'look', act: 'taste', quick: false, kind: 'multi', max: 3, optional: true,
    text: b('Which character looks appeal to you?', '哪种角色外形吸引你？'),
    options: [
      { id: 'refined', label: b('Refined, formal, aristocratic', '精致正式、贵族气质'), fx: [{ t: 'vibe', k: 'elegant', d: 0.7 }] },
      { id: 'athletic', label: b('Athletic, physical, tough', '运动健硕、强悍'), fx: [{ t: 'vibe', k: 'rugged', d: 0.7 }] },
      { id: 'cute', label: b('Cute, bright, colourful', '可爱明亮、色彩丰富'), fx: [{ t: 'vibe', k: 'playful', d: 0.7 }] },
      { id: 'masked', label: b('Masked, eerie, uncanny', '面具、诡异、不安'), fx: [{ t: 'vibe', k: 'mysterious', d: 0.7 }] },
      { id: 'scholar', label: b('Bookish, inventive, odd', '书卷气、发明家、古怪'), fx: [{ t: 'vibe', k: 'eccentric', d: 0.7 }] },
      { id: 'brave', label: b('Brave, noble, protective', '勇敢、高尚、守护者'), fx: [{ t: 'vibe', k: 'heroic', d: 0.7 }] },
    ],
  },
]

export const questionById = Object.fromEntries(QUESTIONS.map((q) => [q.id, q])) as Record<string, Question>
