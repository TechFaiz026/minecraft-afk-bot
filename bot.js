require('dotenv').config();

const mineflayer = require('mineflayer');
const config = require('./config');

let bot;

function createBot() {
    bot = mineflayer.createBot({
        host: config.host,
        port: config.port,
        username: config.username,
        version: config.version
    });

    bot.once('login', () => {
        console.log('✅ Logged in');
    });

    bot.once('spawn', () => {
        console.log('✅ Spawned');

        // Anti-AFK
        setInterval(() => {
            if (!bot || !bot.entity) return;

            bot.setControlState('jump', true);

            setTimeout(() => {
                bot.setControlState('jump', false);
            }, 300);

        }, 30000); // Jump every 30 seconds
    });

    bot.on('chat', (username, message) => {
        if (username === bot.username) return;

        console.log(`[CHAT] ${username}: ${message}`);
    });

    bot.on('kicked', (reason) => {
        console.log('❌ Kicked from server');
        console.log(reason);
    });

    bot.on('error', (err) => {
        console.log('❌ Error:', err.message);
    });

    bot.on('end', () => {
        console.log('🔄 Disconnected. Reconnecting in 10 seconds...');

        setTimeout(() => {
            createBot();
        }, 10000);
    });
}

createBot();