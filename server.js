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
  console.log('Bot準備完了');
  client.user.setPresence({ activity: { name: '!s-poll' } });
});

const prefix = '!';
const emojis = ['🇦', '🇧', '🇨', '🇩', 'E', 'F', 'G'];
client.on('messageCreate', async message => {
  if (message.author.id == client.user.id) {
    return;
  }
  if (message.mentions.users.has(client.user.id)) {
    let text = "やっほー、" + message.author.username + "!!";
    sendReply(message, text);
    text = "投票は、「!s-poll タイトル リマインド 選択肢1 選択肢2 ...」でできるよ!!";
    sendMsg(message, text);
    text = "補足：リマインド = 2 -> 2日後にリマインド";
    sendMsg(message, text);
    return;
  }
  if (message.content.match(/だるい|だるい/)) {
    let text = "そんな君には";
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
  console.log('DISCORD_BOT_TOKENが設定されていません。');
  process.exit(0);
}

client.login(process.env.DISCORD_BOT_TOKEN);


async function makePoll(message, args) {
  const [title, remain, ...choices] = args;
  
  if (!title) {
    let text = "タイトルを指定して!!";
    sendMsg(message, text);
    return;
  }
  if (choices.length < 2 || choices.length > emojis.length){
    let text = `選択肢は2から${emojis.length}つまで!!`;
    sendMsg(message, text);
    return; 
  }

  const embed = new discord.MessageEmbed().setTitle(title).setDescription(choices.map((c,i)=> `${emojis[i]} ${c}`).join('\n'));
  const poll = await message.channel.send({
    embeds: [embed]
  });
  emojis.slice(0, choices.length).forEach(emoji => poll.react(emoji));
  embed.setFooter({
    text: `集計時は、「!end-s-poll ${poll.channel.id} ${poll.id}」と送信して!!`
  })
  poll.edit({embeds:[embed]});


  if(isNaN(remain)){
    let text = "リマインドは数値で!!";
    sendMsg(message, text);
    return; 
  }

  const remain_num = Number(remain)
  if(remain_num < 1){
    let text = "リマインドは1以上の数で!!";
    sendMsg(message, text);
    return; 
  }
  if(!Number.isInteger(remain_num)){
    let text = "リマインドは整数で!!";
    sendMsg(message, text);
    return; 
  }

  const remain_date = new Date();
  remain_date.setDate(remain_date.getDate() + remain_num);

  console.log("リマインド日時: " + remain_date);

  schedule.scheduleJob(remain_date, function () {
    let text = "投票リマインド!!";
    sendReply(poll, text);
    let uri = "https://cdn.glitch.global/8dc96b44-b90d-44f5-aa3b-9fbc17aabda8/justdoit.jpg";
    sendImg(message, uri);
  });

  return;
}

async function finishPoll(message, args) {
  const [cid, mid] = args;

  if (!cid || !mid) {
    let text = "IDを指定して!!";
    sendMsg(message, text);
    return;
  }

  const channel = await message.guild.channels.cache.get(cid);
  const poll = await channel.messages.fetch(mid);
  if (poll.author.id !== client.user.id) return;
  let result = "投票結果";
  for (let i = 0; poll.reactions.cache.get(emojis[i]) && i < emojis.length; i++){
    const reaction = poll.reactions.cache.get(emojis[i]);
    result = `${result}\n${emojis[i]}: ${reaction.users.cache.has(client.user.id)?reaction.count-1:reaction.count}票`;
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
    .then(console.log("リプライ送信: " + text))
    .catch(console.error);
}

function sendMsg(message, text, option = {}) {
  message.channel.send(text, option)
    .then(console.log("メッセージ送信: " + text + JSON.stringify(option)))
    .catch(console.error);
}

function sendImg(message, uri) {
  message.channel.send({ files: [uri] })
  .then(console.log("画像送信: " + uri))
    .catch(console.error);
}
