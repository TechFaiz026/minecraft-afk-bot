const mineflayer = require('mineflayer');

function createBot() {
    const bot = mineflayer.createBot({
        host: 'Faiz_026.aternos.me',
        port: 36389,
        username: 'FaizBot',
        version: '1.21.11'
    });

    bot.on('login', () => {
        console.log('✅ Bot logged in!');
    });

    bot.on('spawn', () => {
        console.log('✅ Bot joined the world!');
        bot.chat('Hello! I am online.');

        // Anti-AFK: Jump every 30 seconds
        setInterval(() => {
            bot.setControlState('jump', true);

            setTimeout(() => {
                bot.setControlState('jump', false);
            }, 500);

        }, 30000);
    });

    bot.on('chat', (username, message) => {
        if (username === bot.username) return;

        console.log(`${username}: ${message}`);

        if (message === '!jump') {
            bot.setControlState('jump', true);

            setTimeout(() => {
                bot.setControlState('jump', false);
            }, 500);
        }
    });

    ;bot.on('error', (err) => {
    console.error('❌ ERROR:', err);
});

bot.on('kicked', (reason, loggedIn) => {
    console.log('❌ KICKED!');
    console.log('Reason:', reason);
    console.log('Logged in:', loggedIn);
});

bot.on('end', (reason) => {
    console.log('🔄 Connection ended.');
    console.log('Reason:', reason);

    setTimeout(() => {
        console.log('Trying to reconnect...');
        createBot();
    }, 10000);
    });
}

createBot();