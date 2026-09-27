import type { GameCharacter } from '@/types/game';

/** Explicit, offline demo roster. Never used to pretend a photo was analyzed. */
export const DEMO_FIGHTERS: GameCharacter[] = [
  {
    id: 'demo-staplord', sourceImage: '/fighters/stapler.jpg',
    object: { name: 'Stapler', category: 'office_supply', materials: ['metal', 'plastic'], confidence: 1 },
    identity: { name: 'STAPLORD', description: 'A desk-bound menace powered by unfinished paperwork.', rarity: 'rare' },
    type: { primary: 'metal', secondary: 'chaos' }, combat: { class: 'tank', hp: 88, maxHp: 88, attack: 72, defense: 94, speed: 31 },
    abilities: { normalAttack: { name: 'Desk slam', power: 1 }, specialAttack: { name: 'Paper Pierce', description: 'Costs 3 energy. Crushes Strike and Break; a Guard blocks and counters it.', power: 1.8, cooldown: 0 } },
    trait: 'pierce',
    personality: { trashTalk: "You're about to get permanently attached.", lines: {
      opener: 'Let’s get this bound.', counter: 'Denied. Filed. Stapled.', guardBreak: 'Your defense has a paper-thin loophole.',
      special: 'PAPER PIERCE! Sign here, here and here.', calledIt: 'Saw that coming three memos ago.', comeback: 'I was only half-jammed.',
      knockout: 'Consider yourself permanently attached.', ouch: 'That knocked a staple loose.' } },
    metadata: { createdAt: '2026-09-26T00:00:00Z', aiProvider: 'demo', decisionProvider: 'fallback' },
  },
  {
    id: 'demo-hydronox', sourceImage: '/fighters/bottle.jpg',
    object: { name: 'Water bottle', category: 'container', materials: ['metal', 'plastic'], confidence: 1 },
    identity: { name: 'HYDRONOX', description: 'Hydrated. Unbothered. Ready to make a splash.', rarity: 'uncommon' },
    type: { primary: 'water', secondary: 'metal' }, combat: { class: 'tank', hp: 93, maxHp: 93, attack: 65, defense: 84, speed: 42 },
    abilities: { normalAttack: { name: 'Bottle bonk', power: 1 }, specialAttack: { name: 'Hydro Slam', description: 'Costs 3 energy. Crushes Strike and Break; a Guard blocks and counters it.', power: 1.8, cooldown: 0 } },
    trait: 'flow',
    personality: { trashTalk: 'Your winning streak looks a little dehydrated.', lines: {
      opener: 'Stay hydrated. Stay intimidated.', counter: 'Go with the flow. Into the wall.', guardBreak: 'Pressure washing your guard.',
      special: 'HYDRO SLAM! Tidal wave incoming.', calledIt: 'I read you like a water label.', comeback: 'Refilled and reloaded.',
      knockout: 'Drained. Completely.', ouch: 'Ow, that dented my cap.' } },
    metadata: { createdAt: '2026-09-26T00:00:00Z', aiProvider: 'demo', decisionProvider: 'fallback' },
  },
  {
    id: 'demo-byteforge', sourceImage: '/fighters/laptop.jpg',
    object: { name: 'Laptop', category: 'electronics', materials: ['aluminum', 'glass', 'plastic'], confidence: 1 },
    identity: { name: 'BYTEFORGE', description: 'Has 47 open tabs and absolutely zero mercy.', rarity: 'epic' },
    type: { primary: 'electric', secondary: 'metal' }, combat: { class: 'glass_cannon', hp: 60, maxHp: 60, attack: 92, defense: 44, speed: 76 },
    abilities: { normalAttack: { name: 'Trackpad smack', power: 1 }, specialAttack: { name: 'Kernel Panic', description: 'Costs 3 energy. Crushes Strike and Break; a Guard blocks and counters it.', power: 1.8, cooldown: 0 } },
    trait: 'charged',
    personality: { trashTalk: 'Have you tried turning yourself off?', lines: {
      opener: 'Booting up your defeat.', counter: 'Exception caught. You.', guardBreak: 'Firewall? More like fire-hole.',
      special: 'KERNEL PANIC! Blue screen for you.', calledIt: 'Predictive text says: you lose.', comeback: 'Rebooted at 1% battery.',
      knockout: 'Shutting you down. Permanently.', ouch: 'That’s going in the error log.' } },
    metadata: { createdAt: '2026-09-26T00:00:00Z', aiProvider: 'demo', decisionProvider: 'fallback' },
  },
];
