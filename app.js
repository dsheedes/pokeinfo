const Discord = require('discord.js');
const client = new Discord.Client();

const mysql = require('mysql2'); // Databases, yay!

const fetch = require('node-fetch'); // For fetching pages

const moment = require('moment'); // For formatting date & time
const cheerio = require('cheerio'); // jQuery parser, just to make things easier. :) 

const BOSS_URL = "https://leekduck.com/boss/";
const EVENT_URL = "https://leekduck.com/events/";
var CronJob = require('cron').CronJob; // For checking everything on a schedule

let env = require('./env.json'); // Environment variables

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'alf',
  password:'red',
  database: 'pokeinfo'
});

let prefix;

let previousImageUrl = null;

let base = {
  boss:null,
  event:null
}
let commands = new Map();
function updateBase(gid){
  connection.query("UPDATE general SET prefix = ?, boss = ?, last = ?, boss_last = ?, event_last = ?, last_updated = ? WHERE gid = ?", [base.prefix, base.boss, base.last, base.boss_last, base.event_last, base.last_updated, new Date(), gid], (err, res, fields) => {
    if(err){
      console.error("Error with updating database", err);
    } 
    // updated;
  });
}
commands.set("setboss", (message) => {
  if(message && message.mentions && message.mentions.channels && message.mentions.channels.size > 0){
    base.boss = message.mentions.channels.first();
    updateBase();
    message.channel.send(`Boss channel set to ${base.boss}`);
    // send message that it's set
  } else {
    // send message that something is wrong. fucker
    message.channel.send(`Something went wrong, fucker.`);
  }
});
commands.set("setevent", () => {
  let message = this.message;

  if(message && message.mentions && message.mentions.channels && message.mentions.channels.size > 0){
    base.event = message.mentions.channels.first();
    updateBase();
    // send message that it's set
  } else {
    // send message that something is wrong. fucker
  }
});
commands.set("setprefix", () => {
  let ins = message.content.split(" ");

  if(ins.length > 1){
    base.prefix = ins[1].substring(0, 1);
    // send message, prefix set.
  } else {
    // send message, no parameter
  }
});

function getBoss(){
  console.log("Scheduling cron...");
  var job = new CronJob('0 0 * * *', function() {
    if(base.boss){
      fetch(BOSS_URL)
      .then(res => res.text())
      .then(body => {
        // we parse data and extract boss image;
        const $ = cheerio.load(body);
        const imageUrl = $("#graphic > img").attr("src");

        if(imageUrl != base.boss_last.lastUrl){
          const attachment = new Discord.MessageAttachment("https://leekduck.com"+imageUrl);
          const text = $(".page-date").text()+"\n";

          const embed = new Discord.MessageEmbed()
          .setTitle(text)
          .setDescription(`https://leekduck.com/`)
          .setImage("https://leekduck.com"+imageUrl)
          .setColor(0xFFDE00)
          .setFooter("Created by gee#0749", "https://toppng.com/uploads/preview/okemon-pokeball-game-go-icon-free-pokemon-go-11563162943wavk28aonz.png")
          .setTimestamp(new Date());
          base.boss.send(embed).catch((e) => {console.error("Something went wrong while sending message.\n", e)});
          base.boss_last.lastUrl = imageUrl;
          updateBase(base.boss.guild.id);
        } // else there are no updates;
      });
    } else {
      // boss channel not set
    }
  }, null, true, 'Europe/Berlin');
  job.start();
}
let settings;
client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  
  connection.query(`SELECT * FROM general WHERE gid = ? LIMIT 1`, [client.guilds.cache.first().id], (err, res, fie) => {
    if(err) throw err;

    if(res){
	console.log(res);
      base.boss = res[0].boss;
      base.event = res[0].event;

      base.lastBoss = res[0].boss_last;
      base.lastEvent = res[0].event_last;

      base.prefix = res[0].prefix;
    }
  }); 
  
  getBoss(); // start boss grabbing
});

client.on('message', message => {
  let instructions = message.content.split(" ");
  let instruction = instructions[0].split(env.prefix);

  if(instructions[0].startsWith(env.prefix)){
    if(commands.has(instruction[1])){
      commands.get(instruction[1])(message);      
    } else message.channel.send("Command not found. :\\");
  } // Else no prefix, no instruction
});

client.login(env.token);
