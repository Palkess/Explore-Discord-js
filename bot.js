const Discord = require('discord.js');
const client = new Discord.Client();
const fs = require('fs');
const config = require('./config.json');
const User = require('./lib/user.js');
const pathToSaveFile = "./saved_queue.json";

let queue = [];

try {
  if(fs.existsSync(pathToSaveFile)) {
    queue = require(pathToSaveFile);
  }
} catch(err) {
  console.log(err);
}

/* Non-bot functionality */

// Check the given highestRoleName to our list of super roles in the config for the given server.
function isAdmin(server_id, highestRoleName) {
  return (config.servers.find(server => server.server_id === server_id).super_role_names.indexOf(highestRoleName) != -1);
}

// Check if the given channel_id is allowed from our config
function isChannelAllowed(server_id, channel_id) {
    return(config.servers.find(server => server.server_id === server_id).allowed_channels_ids.indexOf(channel_id) != -1);
}

// Adds the given username to the list in the queue with a message.
function addUserToQueue(username, message) {
  if(queue.find( user => user.username === username)) {
    return false;
  }

  queue.push(new User(username, message));

  return true;
}

// Removes the user with the given username if it exists.
function removeUserFromQueue(username) {
  let user = queue.find( user => user.username === username);

  if(!user) {
    return false;
  }

  queue.splice(queue.indexOf(user), 1);

  return true;
}

// Save the current queue to a file.
function saveQueueToFile() {
  try {
    fs.writeFile(pathToSaveFile, JSON.stringify(queue) , 'utf-8', function(err) {
      if(err) {
        return console.log(err);
      }

      console.log(`The queued was saved to: ${pathToSaveFile}`);
    });
  } catch (err) {
    console.log(err);
  }
}

function queueToString() {
  let output = "The queue is empty!\n";

  if(queue.length > 0) {
    output = "";
  }

  for(i = 0; i < queue.length; i++) {
    output += `${i + 1}. ${queue[i].username} ${(queue[i].message ? " (" + queue[i].message + ")" : "" )} \n`;
  }

  output += "\nJoin the queue with !join MESSAGE";

  return output;
}

function getHelpText() {
    let output = "";

    output += `${config.general.commandPrefix}help - Displays All Commands\n`;
    output += `${config.general.commandPrefix}join MESSAGE - Adds you to the Queue with an optional message to get into a ship\n`;
    output += `${config.general.commandPrefix}leave - Removes you from the Queue to get into a ship\n`;
    output += `${config.general.commandPrefix}queue - Displays the current Queue list\n`;
    output += `${config.general.commandPrefix}remove, USERNAME - Server Admin/Creators only command that removes the specified user from the Queue List\n`;
    output += `${config.general.commandPrefix}clearqueue - Server Admin/Creators only command that clears the entire Queue list\n`;
    output += `${config.general.commandPrefix}info - Information about the bot and its creators.\n`;

    return output;
}

function getInfoText() {

}

/* Bot stuff */

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);

    // Save the queue to file every 10 minutes
    setInterval(saveQueueToFile, 600000);
});

client.on('message', msg => {
    // To prevent Skynet, bots are not allowed to talk to eachother.
    if(msg.author.bot) {
        return;
    }

    if(isChannelAllowed(msg.guild.id, msg.channel.id)) {
        if (msg.content.startsWith(config.general.commandPrefix)) {
            let command = msg.content.split(' ')[0];

            switch(command) {
                case `${config.general.commandPrefix}join`:
                    if(addUserToQueue(msg.member.user.username + "#" + msg.member.user.discriminator, msg.content.replace(`${config.general.commandPrefix}join`, "").trim())) {
                        msg.reply(`You have joined the queue!\nYou have position ${queue.length}.`);
                    } else {
                        msg.reply("You are already in the queue!")
                    }

                    break;
                case `${config.general.commandPrefix}leave`:
                    if(removeUserFromQueue(msg.member.user.username + "#" + msg.member.user.discriminator)) {
                        msg.reply("You have left the queue.");
                    } else {
                        msg.reply("You are not in the queue.");
                    }

                    break;
                case `${config.general.commandPrefix}queue`:
                    msg.channel.send(queueToString());

                    break;

                case `${config.general.commandPrefix}help`:
                    msg.channel.send(getHelpText());

                    break;

                case `${config.general.commandPrefix}info`:
                    msg.channel.send(getInfoText());

                    break;

                // Admin commands
                case `${config.general.commandPrefix}save`:
                    if(isAdmin(msg.guild.id, msg.member.highestRole.name)) {
                        saveQueueToFile();
                        msg.author.send("You saved the current queue.");
                    }

                    break;
                case `${config.general.commandPrefix}remove`:
                    if(isAdmin(msg.guild.id, msg.member.highestRole.name)) {
                        if(removeUserFromQueue(msg.content.replace(`${config.general.commandPrefix}remove`, "").trim())) {
                            msg.channel.send(`${msg.content.replace(`${config.general.commandPrefix}remove`, "").trim()} was removed from the queue.`);
                        } else {
                            msg.channel.send("Noone with that username exists in the queue. Did you spell the username correctly?");
                        }
                    }

                    break;
                case `${config.general.commandPrefix}clear`:
                    if(isAdmin(msg.guild.id, msg.member.highestRole.name)) {
                        queue = [];

                        msg.channel.send("The queue has been cleared.");
                    }

                    break;
                default:
                    console.log("That command doesn't exists...");
                    break;
            }
        }
    }
});

client.login(config.connection.token);
