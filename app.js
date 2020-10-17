const Discord = require('discord.js');
const client = new Discord.Client();

const fs = require('fs'); // File system

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
  user: 'pokeinfo',
  password:'seekthetruth',
  database: 'pokeinfo'
});

let base = {
  prefix:env.prefix,
  boss:null,
  event:null,
  boss_last:{},
  event_last:{},
  last_updated:null
}
let commands = new Map();
function updateBase(gid){
	let inputboss;
	let inputevent;
	if(base.boss){
		inputboss = base.boss.id
	} else inputboss = null;

	if(base.event){
		inputevent = base.event.id;
	} else inputevent = null;
 connection.query("UPDATE `general` SET prefix = ?, boss = ?, event = ?, boss_last = ?, event_last = ?, last_updated = ?  WHERE gid = ?", [base.prefix, inputboss, inputevent, JSON.stringify(base.boss_last), JSON.stringify(base.event_last), new Date(), gid], (err, res, fields) => {
    if(err){
      console.error("Error with updating database", err);
    } 
    // updated;
  });
}
commands.set("setboss", (message) => {
  if(message && message.mentions && message.mentions.channels && message.mentions.channels.size > 0){
    base.boss = message.mentions.channels.first();
    updateBase(message.guild.id);
    message.channel.send(`Boss channel set to ${base.boss}`);
  } else {
    message.channel.send(`Something went wrong.`);
  }
});
commands.set("setevent", (message) => {
  if(message && message.mentions && message.mentions.channels && message.mentions.channels.size > 0){
    base.event = message.mentions.channels.first();
    updateBase(message.guild.id);
    // send message that it's set
    message.channel.send(`Event channel set to ${base.event}`);
  } else {
    // send message that something is wrong. fucker
    message.channel.send(`Something went wrong.`);
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
function getEvent(){
  console.log("Scheduling cron..."+moment(new Date()).format("dddd, MMMM Do YYYY, h:mm:ss a"));
  var job = new CronJob('* * * * *', function() {
    if(base.event){
      fetch(EVENT_URL, {headers:{'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36'}})
      .then(res => res.text())
      .then(body => {
        let $ = cheerio.load(body);
        let page = $($(".event")[0]).parent().attr("href");
        fetch("https://leekduck.com"+page)
        .then(r => r.text())
        .then(b => {
          $ = cheerio.load(b);
		let imgs = [];
          $("#graphic1 > img").each((index, element) => {
            let imageUrl = $(element).attr("src");
            if(!base.event_last.lastUrl.includes(imageUrl)){
              const title = $(".page-title").text();
              const attachment = new Discord.MessageAttachment("https://leekduck.com"+imageUrl, "tempevent.jpg");
              const e = {
                title:title,
                image:{
                  url:"attachment://tempevent.jpg"
                },
                url:EVENT_URL+page,
                color:0xffde00,
                footer: {
                  text: 'Created by gee#0749',
                  icon_url: 'https://toppng.com/uploads/preview/okemon-pokeball-game-go-icon-free-pokemon-go-11563162943wavk28aonz.png',
                },
                timestamp:new Date()
              }
              base.event.send({files:[attachment], embed:e}).catch((e) => {console.error("Something went wrong while sending message.\n", e)});
	      imgs.push(imageUrl);
              base.event_last.lastUrl = imgs;
	      base.event_last.fetched = new Date();
              updateBase(base.event.guild.id);

      } // else there are no updates;
          });
        })
      });
    } else {
      // boss channel not set
    }
  }, null, true, 'Europe/Berlin');
  job.start();
}
function getBoss(){
  console.log("Scheduling cron..."+moment(new Date()).format("dddd, MMMM Do YYYY, h:mm:ss a"));
  var job = new CronJob('* * * * *', function() {
    if(base.boss){
      fetch(BOSS_URL)
      .then(res => res.text())
      .then(body => {
        // we parse data and extract boss image;
        const $ = cheerio.load(body);
        const imageUrl = $("#graphic > img").attr("src");
        if(imageUrl != base.boss_last.lastUrl){
                const text = $(".page-date").text()+"\n";
                const attachment = new Discord.MessageAttachment("https://leekduck.com"+imageUrl, "tempboss.jpg");
                const e = {
                  title:text,
                  image:{
                    url:"attachment://tempboss.jpg"
                  },
                  url:BOSS_URL,
                  color:0xffde00,
                  footer: {
                    text: 'Created by gee#0749',
                    icon_url: 'https://toppng.com/uploads/preview/okemon-pokeball-game-go-icon-free-pokemon-go-11563162943wavk28aonz.png',
                  },
                  timestamp:new Date()
                }
                base.boss.send({files:[attachment], embed:e}).catch((e) => {console.error("Something went wrong while sending message.\n", e)});
                base.boss_last.lastUrl = imageUrl;
		base.boss_last.fetched = new Date();
                updateBase(base.boss.guild.id);

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
  
  connection.query(`SELECT * FROM general WHERE gid = ? LIMIT 1`, [client.guilds.cache.first().id], (err, res, fie) => {
    if(err) throw err;

    if(res){
      base.boss = client.guilds.cache.get(res[0].gid).channels.cache.get(res[0].boss);
      base.event = client.guilds.cache.get(res[0].gid).channels.cache.get(res[0].event);

      base.boss_last = JSON.parse(res[0].boss_last);
      base.event_last = JSON.parse(res[0].event_last);
      base.last_updated = res[0].last_updated;

      base.prefix = res[0].prefix;
      getBoss();
      getEvent();
    }
  }); 
});

client.on('message', message => {
  let instructions = message.content.split(" ");
  let instruction = instructions[0].split(base.prefix);

  if(instructions[0].startsWith(base.prefix)){
    if(commands.has(instruction[1])){
      commands.get(instruction[1])(message);      
    } else message.channel.send("Command not found. :\\");
  } // Else no prefix, no instruction
});
process.on('uncaughtException', function (error) {
   console.log(error);
});
client.login(env.token);
