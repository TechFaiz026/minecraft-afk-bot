const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const collectBlock = require('mineflayer-collectblock').plugin
const { plugin: pvpPlugin } = require('mineflayer-pvp')
const armorManager = require('mineflayer-armor-manager')

// ===== CONFIG =====
const SERVER_HOST = 'Faiz_026.aternos.me'
const SERVER_PORT = 36389
const BOT_USERNAME = 'FaizBot'
const OWNER_NAMES = ['Faiz026']
const RECONNECT_DELAY_MS = 10000
// ==================

let followTargets = []
let fighting = false
let guarding = false
let homePosition = null
let pendingDestination = null

function createBot() {
  const bot = mineflayer.createBot({
    host: SERVER_HOST,
    port: SERVER_PORT,
    username: BOT_USERNAME,
    version: '1.21.11'
  })

  bot.loadPlugin(pathfinder)
  bot.loadPlugin(collectBlock)
  bot.loadPlugin(pvpPlugin)
  bot.loadPlugin(armorManager)

  bot.once('spawn', () => {
    console.log('[BOT] Joined the server as ' + BOT_USERNAME)
    const defaultMove = new Movements(bot)
    bot.pathfinder.setMovements(defaultMove)
    homePosition = bot.entity.position.clone()

    startAntiAfk(bot)
    startAutoEat(bot)
    startAutoArmor(bot)
    startFollowLoop(bot)
    startCombatLoop(bot)
    startLootPickupLoop(bot)
    startGuardLoop(bot)
  })

  bot.on('chat', (username, message) => {
    if (username === bot.username) return
    console.log('[CHAT] ' + username + ': ' + message)
    handleCommand(bot, username, message)
  })

  bot.on('health', () => {
    if (bot.health <= 6) bot.chat('Low health warning: ' + bot.health)
  })

  bot.on('kicked', (reason) => console.log('[BOT] Kicked: ' + reason))
  bot.on('error', (err) => console.log('[BOT] Error: ' + err.message))
  bot.on('end', () => {
    console.log('[BOT] Disconnected. Reconnecting in ' + (RECONNECT_DELAY_MS / 1000) + 's...')
    followTargets = []
    fighting = false
    guarding = false
    setTimeout(createBot, RECONNECT_DELAY_MS)
  })

  return bot
}

function startAntiAfk(bot) {
  setInterval(() => {
    if (followTargets.length || fighting) return
    bot.setControlState('jump', true)
    setTimeout(() => bot.setControlState('jump', false), 500)
  }, 30000)
}

function startAutoEat(bot) {
  setInterval(async () => {
    if (bot.food < 18) {
      const food = bot.inventory.items().find(item =>
        ['bread', 'cooked_beef', 'cooked_porkchop', 'apple', 'cooked_chicken'].includes(item.name)
      )
      if (food) {
        try {
          await bot.equip(food, 'hand')
          await bot.consume()
          console.log('[BOT] Ate ' + food.name)
        } catch (e) { console.log('[EAT] Failed: ' + e.message) }
      }
    }
  }, 15000)
}

function startAutoArmor(bot) {
  setInterval(() => {
    try { bot.armorManager.equipAll() } catch (e) { /* ignore */ }
  }, 20000)
}

function startLootPickupLoop(bot) {
  setInterval(() => {
    if (fighting) return
    const item = bot.nearestEntity(e => e.name === 'item' && e.position.distanceTo(bot.entity.position) < 10)
    if (item) {
      bot.pathfinder.setGoal(new goals.GoalNear(item.position.x, item.position.y, item.position.z, 1))
    }
  }, 3000)
}

function startFollowLoop(bot) {
  setInterval(() => {
    if (!followTargets.length) return
    const name = followTargets[0]
    const player = bot.players[name]?.entity
    if (!player) return
    bot.pathfinder.setGoal(new goals.GoalFollow(player, 2), true)
  }, 2000)
}

function startGuardLoop(bot) {
  setInterval(() => {
    if (!guarding || !homePosition) return
    const dist = bot.entity.position.distanceTo(homePosition)
    if (dist > 15) {
      bot.pathfinder.setGoal(new goals.GoalNear(homePosition.x, homePosition.y, homePosition.z, 2))
    }
    const hostile = bot.nearestEntity(e => e.type === 'mob' && e.position.distanceTo(homePosition) < 10)
    if (hostile) fighting = true
  }, 5000)
}

function goHome(bot) {
  if (!homePosition) { bot.chat("I don't have a home set yet."); return }
  pendingDestination = homePosition
  bot.pathfinder.setGoal(new goals.GoalNear(homePosition.x, homePosition.y, homePosition.z, 1))
  bot.chat('Heading home.')
}

function startCombatLoop(bot) {
  setInterval(() => {
    if (!fighting) return
    const mob = bot.nearestEntity(e =>
      (e.type === 'mob' || e.type === 'hostile') && e.position.distanceTo(bot.entity.position) < 10
    )
    if (mob) {
      bot.pvp.attack(mob)
    } else {
      bot.pvp.stop()
      if (pendingDestination) {
        bot.pathfinder.setGoal(new goals.GoalNear(pendingDestination.x, pendingDestination.y, pendingDestination.z, 1))
      }
    }
  }, 1000)
}

async function mineBlock(bot, blockName, count) {
  const mcData = require('minecraft-data')(bot.version)
  const blockType = mcData.blocksByName[blockName]
  if (!blockType) { bot.chat("I don't know a block called " + blockName); return }
  const blocks = bot.findBlocks({ matching: blockType.id, maxDistance: 32, count: count })
  if (blocks.length === 0) { bot.chat('No ' + blockName + ' nearby.'); return }
  bot.chat('Mining ' + blocks.length + ' ' + blockName + '...')
  for (const pos of blocks) {
    try { await bot.collectBlock.collect(bot.blockAt(pos)) }
    catch (e) { console.log('[MINE] Failed: ' + e.message) }
  }
  bot.chat('Done mining ' + blockName + '.')
}

async function chopTrees(bot, count) {
  const logTypes = ['oak_log', 'birch_log', 'spruce_log', 'jungle_log', 'acacia_log', 'dark_oak_log']
  const mcData = require('minecraft-data')(bot.version)
  const ids = logTypes.map(n => mcData.blocksByName[n]?.id).filter(Boolean)
  const blocks = bot.findBlocks({ matching: (b) => ids.includes(b.type), maxDistance: 32, count: count })
  if (blocks.length === 0) { bot.chat('No trees nearby.'); return }
  bot.chat('Chopping ' + blocks.length + ' logs...')
  for (const pos of blocks) {
    try { await bot.collectBlock.collect(bot.blockAt(pos)) }
    catch (e) { console.log('[CHOP] Failed: ' + e.message) }
  }
  bot.chat('Done chopping.')
}

async function storeInChest(bot) {
  const chestBlock = bot.findBlock({ matching: (block) => block.name === 'chest', maxDistance: 8 })
  if (!chestBlock) { bot.chat('No chest nearby.'); return }
  try {
    const chest = await bot.openContainer(chestBlock)
    for (const item of bot.inventory.items()) {
      await chest.deposit(item.type, null, item.count)
    }
    chest.close()
    bot.chat('Stored items in chest.')
  } catch (e) {
    bot.chat('Could not store items: ' + e.message)
  }
}

function handleCommand(bot, username, message) {
  if (!OWNER_NAMES.includes(username)) return

  const args = message.split(' ')
  const cmd = args[0]

  if (cmd === '!ping') bot.chat('pong! I am online.')

  else if (cmd === '!come') {
    const player = bot.players[username]?.entity
    if (player) {
      bot.pathfinder.setGoal(new goals.GoalNear(player.position.x, player.position.y, player.position.z, 1))
      bot.chat('Coming!')
    }
  }

  else if (cmd === '!follow') {
    if (!followTargets.includes(username)) followTargets.push(username)
    bot.chat('Following ' + username)
  }

  else if (cmd === '!unfollow') {
    followTargets = followTargets.filter(n => n !== username)
    bot.chat('Stopped following ' + username)
  }

  else if (cmd === '!fight') {
    fighting = true
    bot.chat('Fighting mode on.')
  }

  else if (cmd === '!mine') {
    const blockName = args[1]
    const count = parseInt(args[2]) || 1
    if (!blockName) bot.chat('Usage: !mine <block_name> <count>')
    else mineBlock(bot, blockName, count)
  }

  else if (cmd === '!chop') {
    chopTrees(bot, parseInt(args[1]) || 5)
  }

  else if (cmd === '!store') {
    storeInChest(bot)
  }

  else if (cmd === '!sethome') {
    homePosition = bot.entity.position.clone()
    bot.chat('Home set.')
  }

  else if (cmd === '!home') {
    goHome(bot)
  }

  else if (cmd === '!guard') {
    guarding = true
    if (!homePosition) homePosition = bot.entity.position.clone()
    bot.chat('Guarding home.')
  }

  else if (cmd === '!stop') {
    followTargets = []
    fighting = false
    guarding = false
    pendingDestination = null
    bot.pathfinder.setGoal(null)
    bot.pvp.stop()
    bot.chat('Stopped.')
  }

  else if (cmd === '!status') {
    bot.chat('HP: ' + bot.health + ' Food: ' + bot.food + ' Pos: ' +
      Math.floor(bot.entity.position.x) + ',' + Math.floor(bot.entity.position.y) + ',' + Math.floor(bot.entity.position.z))
  }
}

createBot()