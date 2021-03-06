const http = require('http');
const querystring = require('querystring');
const discord = require('discord.js');
const { Client, Intents } = require('discord.js');
const schedule = require("node-schedule");

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

http.createServer(function(req, res){
  if (req.method == 'POST'){
    var data = "";
    req.on('data', function(chunk){
      data += chunk;
    });
    req.on('end', function(){
      if(!data){
        res.end("No post data");
        return;
      }
      var dataObject = querystring.parse(data);
      console.log("post:" + dataObject.type);
      if(dataObject.type == "wake"){
        console.log("Woke up in post");
        res.end();
        return;
      }
      res.end();
    });
  }
  else if (req.method == 'GET'){
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('Discord Bot is active now\n');
  }
}).listen(3000);


client.on('ready', message => {
  console.log('Botæºåå®äº');
  client.user.setPresence({ activity: { name: '!s-poll' } });
});

const prefix = '!';
const emojis = ['ð¦', 'ð§', 'ð¨', 'ð©', 'E', 'F', 'G'];
client.on('messageCreate', async message => {
  if (message.author.id == client.user.id) {
    return;
  }
  if (message.mentions.users.has(client.user.id)) {
    let text = "ãã£ã»ã¼ã" + message.author.username + "!!";
    sendReply(message, text);
    text = "æç¥¨ã¯ãã!s-poll ã¿ã¤ãã« ãªãã¤ã³ã é¸æè¢1 é¸æè¢2 ...ãã§ã§ããã!!";
    sendMsg(message, text);
    text = "è£è¶³ï¼ãªãã¤ã³ã = 2 -> 2æ¥å¾ã«ãªãã¤ã³ã";
    sendMsg(message, text);
    return;
  }
  if (message.content.match(/ã ãã|ã ãã/)) {
    let text = "ãããªåã«ã¯";
    sendReply(message, text);
    let uri = "https://cdn.glitch.global/8dc96b44-b90d-44f5-aa3b-9fbc17aabda8/justdoit.jpg";
    sendImg(message, uri);
    return;
  }
  if (!message.content.startsWith(prefix)) return
  const [command, ...args] = message.content.slice(prefix.length).split(' ');
  if (command === 's-poll') {
    await makePoll(message, args);
  }
  if (command === 'end-s-poll') {
    await finishPoll(message, args);
  }
});

if (process.env.DISCORD_BOT_TOKEN == undefined) {
  console.log('DISCORD_BOT_TOKENãè¨­å®ããã¦ãã¾ããã');
  process.exit(0);
}

client.login(process.env.DISCORD_BOT_TOKEN);


async function makePoll(message, args) {
  const [title, remain, ...choices] = args;
  
  if (!title) {
    let text = "ã¿ã¤ãã«ãæå®ãã¦!!";
    sendMsg(message, text);
    return;
  }
  if (choices.length < 2 || choices.length > emojis.length){
    let text = `é¸æè¢ã¯2ãã${emojis.length}ã¤ã¾ã§!!`;
    sendMsg(message, text);
    return; 
  }

  const embed = new discord.MessageEmbed().setTitle(title).setDescription(choices.map((c,i)=> `${emojis[i]} ${c}`).join('\n'));
  const poll = await message.channel.send({
    embeds: [embed]
  });
  emojis.slice(0, choices.length).forEach(emoji => poll.react(emoji));
  embed.setFooter({
    text: `éè¨æã¯ãã!end-s-poll ${poll.channel.id} ${poll.id}ãã¨éä¿¡ãã¦!!`
  })
  poll.edit({embeds:[embed]});


  if(isNaN(remain)){
    let text = "ãªãã¤ã³ãã¯æ°å¤ã§!!";
    sendMsg(message, text);
    return; 
  }

  const remain_num = Number(remain)
  if(remain_num < 1){
    let text = "ãªãã¤ã³ãã¯1ä»¥ä¸ã®æ°ã§!!";
    sendMsg(message, text);
    return; 
  }
  if(!Number.isInteger(remain_num)){
    let text = "ãªãã¤ã³ãã¯æ´æ°ã§!!";
    sendMsg(message, text);
    return; 
  }

  const remain_date = new Date();
  remain_date.setDate(remain_date.getDate() + remain_num);

  console.log("ãªãã¤ã³ãæ¥æ: " + remain_date);

  schedule.scheduleJob(remain_date, function () {
    let text = "æç¥¨ãªãã¤ã³ã!!";
    sendReply(poll, text);
    let uri = "https://cdn.glitch.global/8dc96b44-b90d-44f5-aa3b-9fbc17aabda8/justdoit.jpg";
    sendImg(message, uri);
  });

  return;
}

async function finishPoll(message, args) {
  const [cid, mid] = args;

  if (!cid || !mid) {
    let text = "IDãæå®ãã¦!!";
    sendMsg(message, text);
    return;
  }

  const channel = await message.guild.channels.cache.get(cid);
  const poll = await channel.messages.fetch(mid);
  if (poll.author.id !== client.user.id) return;
  let result = "æç¥¨çµæ";
  for (let i = 0; poll.reactions.cache.get(emojis[i]) && i < emojis.length; i++){
    const reaction = poll.reactions.cache.get(emojis[i]);
    result = `${result}\n${emojis[i]}: ${reaction.users.cache.has(client.user.id)?reaction.count-1:reaction.count}ç¥¨`;
  }
  poll.reply({
    embeds:[
      new discord.MessageEmbed()
        .setTitle(poll.embeds[0].title)
        .setDescription(result)
    ]
  })
}

function sendReply(message, text) {
  message.reply(text)
    .then(console.log("ãªãã©ã¤éä¿¡: " + text))
    .catch(console.error);
}

function sendMsg(message, text, option = {}) {
  message.channel.send(text, option)
    .then(console.log("ã¡ãã»ã¼ã¸éä¿¡: " + text + JSON.stringify(option)))
    .catch(console.error);
}

function sendImg(message, uri) {
  message.channel.send({ files: [uri] })
  .then(console.log("ç»åéä¿¡: " + uri))
    .catch(console.error);
}
