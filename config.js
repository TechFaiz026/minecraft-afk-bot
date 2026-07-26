require('dotenv').config();

console.log("HOST =", process.env.HOST);
console.log("PORT =", process.env.PORT);
console.log("BOT_USERNAME =", process.env.BOT_USERNAME);
console.log("VERSION =", process.env.VERSION);

module.exports = {
  host: process.env.HOST,
  port: parseInt(process.env.PORT),
  username: process.env.BOT_USERNAME,
  version: process.env.VERSION
};