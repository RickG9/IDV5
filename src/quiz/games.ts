import type { Bi, Demand, KiteStyle, Trait } from '../types'

/**
 * How experience in another game transfers to Identity V.
 * `skills` are ability observations (0-10) reached at the TOP level (level 4);
 * lower levels scale toward a neutral 4. IDV-specific skills (map knowledge of
 * IDV maps, IDV game sense) only transfer partially — capped by `transfer`.
 * `leans` are gentle playstyle nudges (people often like what they are used to).
 */
export interface GameDef {
  id: string
  name: Bi
  genre: Bi
  skills: Partial<Record<Demand, number>>
  leans?: { desire?: Partial<Record<Trait, number>>; kite?: Partial<Record<KiteStyle, number>> }
  roles?: { id: string; label: Bi; leans: { desire?: Partial<Record<Trait, number>>; kite?: Partial<Record<KiteStyle, number>> } }[]
}

const b = (en: string, cn: string): Bi => ({ en, cn })

const FPS = b('Shooter', '射击')
const TAC = b('Tactical shooter', '战术射击')
const BR = b('Battle royale', '大逃杀')
const EXT = b('Extraction shooter', '搜打撤')
const MOBA = b('MOBA', 'MOBA')
const ASYM = b('Asymmetric horror', '非对称对抗')
const RHY = b('Rhythm', '音游')
const FGC = b('Fighting', '格斗')
const ACT = b('Action / Soulslike', '动作/魂系')
const STR = b('Strategy', '策略')
const OTHER = b('Other', '其他')

const shooterRoles = [
  { id: 'entry', label: b('Entry / fragger', '突破手/枪男'), leans: { desire: { kite: 0.2, disrupt: 0.2 } } },
  { id: 'support', label: b('Support / utility', '辅助/道具位'), leans: { desire: { support: 0.3, info: 0.2 } } },
  { id: 'igl', label: b('IGL / shot-caller', '指挥'), leans: { desire: { info: 0.3 } } },
  { id: 'lurk', label: b('Lurker / sniper', '自由人/狙击'), leans: { desire: { selfSufficiency: 0.3 }, kite: { stealth: 0.2 } } },
]
const mobaRoles = [
  { id: 'carry', label: b('Carry / ADC', '射手/核心'), leans: { desire: { selfSufficiency: 0.2 } } },
  { id: 'support', label: b('Support', '辅助'), leans: { desire: { support: 0.4, info: 0.2 } } },
  { id: 'tank', label: b('Tank / initiator', '坦克/开团'), leans: { desire: { survivability: 0.3, rescue: 0.2 }, kite: { tank: 0.3 } } },
  { id: 'jungle', label: b('Jungle / roamer', '打野/游走'), leans: { desire: { info: 0.2, disrupt: 0.2 } } },
  { id: 'mid', label: b('Mid / mage', '中单/法师'), leans: { desire: { disrupt: 0.2 } } },
]

export const GAMES: GameDef[] = [
  { id: 'dbd', name: b('Dead by Daylight', '黎明杀机'), genre: ASYM, skills: { mapKnowledge: 6.5, gameSense: 7, timing: 6.5, reaction: 6 },
    roles: [
      { id: 'surv', label: b('Survivor main', '人类主玩'), leans: { desire: { kite: 0.4 }, kite: { looping: 0.5 } } },
      { id: 'killer', label: b('Killer main', '屠夫主玩'), leans: { desire: { info: 0.2 } } },
    ] },
  { id: 'idv-hunter', name: b('Identity V as Hunter', '第五人格监管者'), genre: ASYM, skills: { gameSense: 8, mapKnowledge: 8.5 } },
  { id: 'other-asym', name: b('Other asymmetric (F13, Evolve, Last Year…)', '其他非对称游戏'), genre: ASYM, skills: { gameSense: 5.5, mapKnowledge: 5 }, leans: { desire: { kite: 0.2 } } },
  { id: 'cs', name: b('Counter-Strike 2', 'CS2'), genre: TAC, skills: { aim: 9, reaction: 8.5, gameSense: 6.5, comms: 6, timing: 7 }, roles: shooterRoles },
  { id: 'valorant', name: b('Valorant', '无畏契约'), genre: TAC, skills: { aim: 9, reaction: 8.5, gameSense: 6.5, comms: 6, multitask: 6.5 }, roles: shooterRoles },
  { id: 'r6', name: b('Rainbow Six Siege', '彩虹六号：围攻'), genre: TAC, skills: { aim: 8, reaction: 8, gameSense: 7, mapKnowledge: 5.5, comms: 6.5 }, roles: shooterRoles },
  { id: 'ow', name: b('Overwatch', '守望先锋'), genre: FPS, skills: { aim: 8, reaction: 7.5, multitask: 7, gameSense: 6.5, comms: 6 },
    roles: [
      { id: 'tank', label: b('Tank', '坦克'), leans: { desire: { survivability: 0.3, rescue: 0.2 }, kite: { tank: 0.3 } } },
      { id: 'dps', label: b('DPS', '输出'), leans: { desire: { disrupt: 0.2 } } },
      { id: 'support', label: b('Support', '辅助'), leans: { desire: { support: 0.4 } } },
    ] },
  { id: 'apex', name: b('Apex Legends', 'Apex 英雄'), genre: BR, skills: { aim: 8.5, reaction: 8, mechanics: 7.5, mapKnowledge: 5 }, leans: { kite: { mobility: 0.3 } }, roles: shooterRoles },
  { id: 'pubg', name: b('PUBG / PUBG Mobile', '绝地求生/和平精英'), genre: BR, skills: { aim: 8.5, reaction: 7.5, gameSense: 6, mapKnowledge: 4.5 }, roles: shooterRoles },
  { id: 'fortnite', name: b('Fortnite', '堡垒之夜'), genre: BR, skills: { aim: 7.5, reaction: 7.5, mechanics: 8, multitask: 7 } },
  { id: 'cod', name: b('Call of Duty (incl. Mobile / Warzone)', '使命召唤（含手游/战区）'), genre: FPS, skills: { aim: 8.5, reaction: 8.5 } },
  { id: 'abi', name: b('Arena Breakout (Infinite)', '暗区突围（无限）'), genre: EXT, skills: { aim: 8, reaction: 7.5, gameSense: 6.5, mapKnowledge: 5 }, leans: { kite: { stealth: 0.2 } }, roles: shooterRoles },
  { id: 'tarkov', name: b('Escape from Tarkov', '逃离塔科夫'), genre: EXT, skills: { aim: 7.5, gameSense: 7, mapKnowledge: 5.5 }, leans: { kite: { stealth: 0.2 } } },
  { id: 'deltaforce', name: b('Delta Force', '三角洲行动'), genre: EXT, skills: { aim: 8, reaction: 7.5, gameSense: 6 }, roles: shooterRoles },
  { id: 'lol', name: b('League of Legends', '英雄联盟'), genre: MOBA, skills: { gameSense: 7.5, multitask: 7.5, mechanics: 7, aim: 6, reaction: 6.5 }, roles: mobaRoles },
  { id: 'dota', name: b('Dota 2', 'Dota 2'), genre: MOBA, skills: { gameSense: 8, multitask: 8, mechanics: 6.5 }, roles: mobaRoles },
  { id: 'hok', name: b('Honor of Kings', '王者荣耀'), genre: MOBA, skills: { gameSense: 7, multitask: 7, mechanics: 7, aim: 6 }, roles: mobaRoles },
  { id: 'mlbb', name: b('Mobile Legends', '无尽对决'), genre: MOBA, skills: { gameSense: 6.5, multitask: 6.5, mechanics: 6.5 }, roles: mobaRoles },
  { id: 'osu', name: b('osu! / rhythm games (Arcaea, Phigros, Sekai…)', 'osu!/音游（Arcaea、Phigros、世界计划…）'), genre: RHY, skills: { timing: 9.5, reaction: 8.5, aim: 7 } },
  { id: 'fighting', name: b('Fighting games (SF6, Tekken, Smash…)', '格斗游戏（街霸6、铁拳、大乱斗…）'), genre: FGC, skills: { timing: 9, reaction: 8.5, mechanics: 8, gameSense: 6.5 } },
  { id: 'souls', name: b('Soulslikes / action (Elden Ring, Sekiro…)', '魂系/动作（艾尔登法环、只狼…）'), genre: ACT, skills: { timing: 8, reaction: 7.5, mechanics: 7 } },
  { id: 'genshin', name: b('Genshin / Honkai / Wuthering Waves', '原神/崩铁/鸣潮'), genre: ACT, skills: { mechanics: 5.5, timing: 6, multitask: 6 } },
  { id: 'rts', name: b('RTS (StarCraft, AoE…)', '即时战略（星际、帝国时代…）'), genre: STR, skills: { multitask: 9, gameSense: 7.5 } },
  { id: 'amongus', name: b('Social deduction (Among Us, Goose Goose Duck…)', '社交推理（Among Us、鹅鸭杀…）'), genre: OTHER, skills: { gameSense: 5, comms: 7 }, leans: { desire: { info: 0.3 } } },
  { id: 'stealth', name: b('Stealth games (Hitman, MGS, Dishonored…)', '潜行游戏（杀手、合金装备、耻辱…）'), genre: OTHER, skills: { gameSense: 5.5 }, leans: { kite: { stealth: 0.5 } } },
  { id: 'racing', name: b('Racing games', '竞速游戏'), genre: OTHER, skills: { reaction: 7.5, timing: 7 } },
  { id: 'platformer', name: b('Platformers / parkour (Celeste…)', '平台跳跃（蔚蓝…）'), genre: OTHER, skills: { timing: 8, mechanics: 7.5 }, leans: { kite: { mobility: 0.3 } } },
]

export const LEVELS: Bi[] = [
  b('Casual', '休闲'),
  b('Decent', '还行'),
  b('Strong / high rank', '较强/高分段'),
  b('Top / elite rank', '顶尖/精英段位'),
]

export const gameById = Object.fromEntries(GAMES.map((g) => [g.id, g])) as Record<string, GameDef>
