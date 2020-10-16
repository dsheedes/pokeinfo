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
commands.set("setboss", () => {
  let message = this.message;

  if(message && message.mentions && message.mentions.channels && message.mentions.channels.size > 0){
    base.boss = message.mentions.channels.first().id;

    // send message that it's set
  } else {
    // send message that something is wrong. fucker
  }
});
commands.set("setevent", () => {
  let message = this.message;

  if(message && message.mentions && message.mentions.channels && message.mentions.channels.size > 0){
    base.event = message.mentions.channels.first().id;

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
  var job = new CronJob('0 0 * * *', function() {
    if(base.boss){
      fetch(BOSS_URL)
      .then(res => res.text())
      .then(body => {
        // we parse data and extract boss image;
        const $ = cheerio.load(body);

        const imageUrl = $("#graphic > img").src();

        if(imageUrl != previousImageUrl){
          const attachment = new MessageAttachment(imageUrl);
          const text = $(".page-date").text()+"\n"+BOSS_URL;
          message.channel.send(text, attachment).catch(() => {console.error("Something went wrong while sending message.")});
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
    if(commands.has(instructions[1])){
      commands.get(instruction[1]).call({message:message});      
    } else message.channel.send("Command not found. :\\");
  } // Else no prefix, no instruction
});

client.login(env.token);