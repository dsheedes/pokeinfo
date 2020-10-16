const Discord = require('discord.js');
const client = new Discord.Client();

const fetch = require('node-fetch'); // For fetching pages

const moment = require('moment'); // For formatting date & time
const cheerio = require('cheerio'); // jQuery parser, just to make things easier. :) 

const BOSS_URL = "https://leekduck.com/boss/";
const EVENT_URL = "https://leekduck.com/events/";
var CronJob = require('cron').CronJob; // For checking everything on a schedule

let env = require('./env.json'); // Environment variables

let prefix;

let previousImageUrl = null;

let base = {
  boss:null,
  event:null
}
let commands = new Map();
commands.set("setboss", (message) => {
  if(message && message.mentions && message.mentions.channels && message.mentions.channels.size > 0){
    base.boss = message.mentions.channels.first();

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

    // send message that it's set
  } else {
    // send message that something is wrong. fucker
  }
});
commands.set("setprefix", () => {
  let ins = message.content.split(" ");

  if(ins.length > 1){
    prefix = ins[1].startsWith();
    // send message, prefix set.
  } else {
    // send message, no parameter
  }
});

function getBoss(){
  console.log("Scheduling cron");
  var job = new CronJob('* * * * *', function() {
    if(base.boss){
      fetch(BOSS_URL)
      .then(res => res.text())
      .then(body => {
        // we parse data and extract boss image;
        const $ = cheerio.load(body);
        const imageUrl = $("#graphic > img").attr("src");

        if(imageUrl != previousImageUrl){
          const attachment = new Discord.MessageAttachment("https://leekduck.com"+imageUrl);
          const text = $(".page-date").text()+"\n"+BOSS_URL;
          base.boss.send(text, attachment).catch((e) => {console.error("Something went wrong while sending message.\n", e)});
          previousImageUrl = imageUrl;
        } // else there are no updates;
      });
    } else {
      // boss channel not set
    }
  }, null, true, 'Europe/Berlin');
  job.start();
}

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  prefix = env.prefix;
  
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
