const { goals } = require('mineflayer-pathfinder');
const GoalFollow = goals.GoalFollow;

module.exports = (bot) => {
    bot.on('chat', (username, message) => {
        if (username === bot.username) return;

        if (message === '!follow') {
            const player = bot.players[username];

            if (!player || !player.entity) {
                bot.chat("I can't see you!");
                return;
            }

            bot.chat("Following " + username);

            bot.pathfinder.setGoal(
                new GoalFollow(player.entity, 2),
                true
            );
        }

        if (message === '!stop') {
            bot.pathfinder.setGoal(null);
            bot.chat("Stopped following.");
        }
    });
};
