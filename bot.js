require('dotenv').config();

const mineflayer = require('mineflayer');
const pf = require('mineflayer-pathfinder');

console.log(pf);

const { pathfinder, Movements, goals } = pf;
const minecraftData = require('minecraft-data');
const config = require('./config');

const GoalFollow = goals.GoalFollow;

let bot;

function createBot() {

    bot = mineflayer.createBot({
        host: config.host,
        port: config.port,
        username: config.username,
        version: config.version
     });

     bot.loadPlugin(pathfinder);

     bot.once('login', () => {
        console.log('✅ Logged in');
     });

     bot.once('spawn', () => {
        console.log('✅ Spawned');

        const mcData = minecraftData(bot.version);
        const defaultMove = new Movements(bot, mcData);

        defaultMove.canDig = true;
        defaultMove.allowParkour = true;
        defaultMove.allow1by1towers = false;

        bot.pathfinder.setMovements(defaultMove);

        // Anti-AFK
        setInterval(() => {

            if (!bot.entity) return;

            bot.setControlState('jump', true);

            setTimeout(() => {
                bot.setControlState('jump', false);
            }, 300);

        }, 30000);
    });

    bot.on('chat', (username, message) => {

    if (username === bot.username) return;

    const player = bot.players[username];

    if (!player || !player.entity) {
        bot.chat("I can't see you.");
        return;
    }

    if (message === '!follow') {

        bot.chat("Following " + username);

        bot.pathfinder.setGoal(
            new GoalFollow(player.entity, 2),
            true
        );
    }

    else if (message === '!stop') {

        bot.pathfinder.setGoal(null);
        bot.chat("Stopped.");

    }

    else if (message === '!come') {

        const { GoalNear } = goals;

        bot.chat("Coming...");

        bot.pathfinder.setGoal(
            new GoalNear(
                player.entity.position.x,
                player.entity.position.y,
                player.entity.position.z,
                1
            )
        );

    }

    else if (message === '!jump') {

        bot.setControlState('jump', true);

        setTimeout(() => {
            bot.setControlState('jump', false);
        }, 500);

    }

    else if (message === '!look') {

        bot.lookAt(player.entity.position.offset(0, 1.6, 0));

    }

    else if (message === '!status') {

        bot.chat("I'm online and ready!");

    }

});

    bot.on('kicked', (reason) => {
        console.log("❌ Kicked");
        console.log(reason);
    });

    bot.on('error', (err) => {
        console.log("❌ Error:", err.message);
    });

    bot.on('end', () => {
        console.log("🔄 Disconnected. Reconnecting in 10 seconds...");

        setTimeout(() => {
            createBot();
        }, 10000);
    });

}

createBot();