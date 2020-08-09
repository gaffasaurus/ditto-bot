// require the discord.js module
const Discord = require('discord.js');
const people = require('./responses.json');
const fs = require('fs');

// create a new Discord client
const client = new Discord.Client();
const prefix = ">";

const modesList = {
	'random': { value: false, desc: "Toggle to make Ditto transform randomly without being prompted" },
	'exclusive': { value: true, desc: "Toggle to only allow transformations into members of the current server" }
}
const modes = {};

const defaultRate = 0.03;
const rates = {};

let availableForms = {};
// when the client is ready, run this code
// this event will only trigger one time after logging in
client.once('ready', async () => {
	for (let person of people.people) {
		try {
			user = await client.users.fetch(person.id);
		} catch {
			user = "none"
		}
		if (user !== "none") {
			const avatar = user.avatarURL();
			person.avatar = avatar;
			person.username = user.username;
		} else {
			person.avatar = 'https://cdn.discordapp.com/attachments/711793617529995297/740856220394455100/ditto.png';
		}
	}
	client.guilds.cache.forEach(guild => {
		modes[guild.id] = deepClone(modesList);
		guild.channels.cache.forEach(channel => {
			if (channel.type === "text") {
				rates[channel.id] = defaultRate;
			}
		});
		availableForms[guild.id] = [];
		const members = [];
		guild.members.cache.forEach(member => {
			members.push(member.id);
		});
		for (let person of people.people) {
			if (members.includes(person.id)) {
				availableForms[guild.id].push(person);
			}
		}
	});
	console.log('Ready!');
});

let transformed = {};
let webhook;
// const available = [];

client.on('message', async message => {
	if (message.author.bot) return;
  try {
    const webhooks = await message.channel.fetchWebhooks();
    webhook = webhooks.first();
  } catch {
    message.channel.createWebhook('Ditto Bot');
		webhooks = await message.channel.fetchWebhooks();
		webhook = webhooks.first();
  }
  //randomly responds on message
  if (!message.content.startsWith(prefix)) {
		for (let mode in modesList) {
			switch (mode) {
				case 'random': {
					if (modes[message.guild.id].random.value) {
						let selected = Math.floor(Math.random() * availableForms[message.guild.id].length);
						if (Math.random() < 0.3) {
							await transform(availableForms[message.guild.id][selected], message);
						}
					}
				}
			}
		}
    if (transformed[message.guild.id]) {
			let currentForm = transformed[message.guild.id].person;
      let responses = currentForm.responses;
			let available = transformed[message.guild.id].available;
      if (available.length === 0) {
        for (let response of responses) {
          available.push(response);
        }
      }
      let selected = Math.floor(Math.random() * available.length);
      if (Math.random() < rates[message.channel.id] || message.content.includes("<@!740746928186327072>") || message.content.includes("<@740746928186327072>")) { // % chance to respond
        sendWebhook(available[selected], currentForm.nickname, currentForm.avatar);
        available.splice(selected, 1);
				if (message.content === "<@!740746928186327072>" || message.content === "<@740746928186327072>") {
					try {
						console.log("delete");
						message.delete();
					} catch {
						console.log("Missing permissions to delete message!");
					}
				}
      }
    } else if (message.content.includes("<@!740746928186327072>")) {
			let embed = new Discord.MessageEmbed()
				.setTitle('Ditto is not transformed!')
				.setDescription('Use >transform to transform into someone or see >forms for a list of available forms')
			message.channel.send(embed);
		}
  } else {
    //process commands
  	const args = message.content.slice(prefix.length).trim().split(/ +/);
  	const command = args.shift().toLowerCase();

    switch (command) {
      case 'help': {
        let embed = new Discord.MessageEmbed()
          .setTitle('Help Menu')
          .setColor('#FFC0CB')
          .addFields(
            { name: 'help', value: 'Opens this menu' },
            { name: 'current', value: 'Displays current form' },
            { name: 'transform', value: 'Transforms into someone else' },
            { name: 'forms', value: 'Displays all available forms' },
						{ name: 'toggle', value: 'Toggles a mode on/off. Use >modes to see available modes' },
						{ name: 'modes', value: 'Displays all available modes' },
						{ name: 'status', value: 'Displays modes that are toggled' },
						{ name: 'rate', value: 'Input a percentage between 0-100 to set how likely the bot is to respond' }
          );
        message.channel.send(embed);
        break;
      }
      case 'current': {
        if (transformed[message.guild.id]) {
					let currentForm = transformed[message.guild.id].person;
          let embed = new Discord.MessageEmbed()
	         .setTitle('Current Form: ' + currentForm.username)
           .setDescription('Use ">transform name" to give me another form! See ">forms" for a list of forms.')
           .setThumbnail(currentForm.avatar)
	         .setColor('#FFC0CB');
          message.channel.send(embed);
        } else {
          let embed = new Discord.MessageEmbed()
           .setTitle('Current Form: None')
           .setDescription('Use ">transform name" to give me a form! See ">help" for a list of forms.')
           .setColor('#FFC0CB');
          message.channel.send(embed);
        }
        break;
      }
      case 'forms': {
			  const valid = [];
				const users = [];
				const guild = client.guilds.cache.get(message.guild.id + "");
				// console.log(modes[message.guild.id]);
				if (modes[message.guild.id].exclusive.value) {
	        guild.members.cache.forEach(member => {
	          users.push(member.user);
	        });
	        for (let user of users) {
	          for (let person of people.people) {
	            if (person.id && person.id === user.id) {
	              valid.push("- @" + user.username);
	            }
	          }
	        }
				} else {
					for (let person of people.people) {
						let user;
						try {
							user = await client.users.fetch(person.id);
						} catch {
							user = "none";
						}
						if (user !== "none") {
							valid.push("@" + user.username);
						}
					}
				}
        let embed = new Discord.MessageEmbed()
          .setTitle("Available Forms (use full name or mention with >transform):")
					if (modes[message.guild.id].exclusive.value) {
						embed.setDescription("(Only showing members in " + message.guild.name + ")");
					}
          valid.forEach(form => {
            embed.addField(form, '\u200b', true);
          })
          embed.setColor('#FFC0CB');
        message.channel.send(embed);
        break;
      }
			case 'status': {
				let embed = new Discord.MessageEmbed()
					.setTitle("Toggled Modes:")
					.setColor('#FFC0CB')
				for (let mode in modes[message.guild.id]) {
					embed.addField(mode, modes[message.guild.id][mode].value ? "ON" : "OFF", true);
				}
				// if (embed.fields.length === 0) {
				// 	embed.setDescription("No modes toggled! Use >modes to see a list of available modes")
				// }
				message.channel.send(embed);
				break;
			}
			case 'toggle': {
				let selectedMode;
				for (let mode in modesList) {
					if (args.join(" ").toLowerCase() === mode.toLowerCase()) {
						selectedMode = mode;
					}
				}
				if (!selectedMode) {
					let embed = new Discord.MessageEmbed()
						.setTitle("Invalid mode!")
						.setDescription("Use >modes to see all available modes")
						.setColor('#FFC0CB');
					message.channel.send(embed);
					return;
				}
				let mode = modes[message.guild.id];
				if (!mode) {
					mode = modes[message.guild.id] = deepClone(modesList);
				}
				let embed = new Discord.MessageEmbed();
				mode[selectedMode].value = !mode[selectedMode].value;
				switch (selectedMode) {
					case 'random': {
						embed.setTitle("Random toggled " + (mode['random'].value ? "on" : "off") + "!");
						embed.setDescription(mode['random'].value ? "Ditto will transform randomly without being prompted to." : "Ditto will no longer transform randomly.");
						embed.setColor('#FFC0CB');
						message.channel.send(embed);
						getAvailableForms(mode, message);
						let selected = Math.floor(Math.random() * availableForms[message.guild.id].length)
						await transform(availableForms[message.guild.id][selected], message);
						break;
					}
					case 'exclusive': {
						embed.setTitle("Exclusive toggled " + (mode['exclusive'].value ? "on" : "off") + "!");
						embed.setDescription(mode['exclusive'].value ? "Ditto will only be able to transform into members in the server." : "Ditto will be able to transform into any form.");
						embed.setColor('#FFC0CB');
						message.channel.send(embed);
						getAvailableForms(mode, message);
						break;
					}
				}
				break;
			}
			case 'modes': {
				let embed = new Discord.MessageEmbed()
					.setTitle("Available modes:")
					.setColor('#FFC0CB')
				for (let mode in modesList) {
					embed.addField(mode, modesList[mode].desc);
				}
				message.channel.send(embed);
				break;
			}
			case 'rate': {
				if (isNaN(args[0]) || args.length > 1 || parseFloat(args[0]) > 100 || parseFloat(args[0]) < 0) {
					let embed = new Discord.MessageEmbed()
						.setTitle(args.length === 0 ? "Current rate for " + message.channel.name + ": " + (rates[message.channel.id] * 100.0) + "%" : "Not a valid argument!")
						.setDescription("Enter a percentage between 0-100 to set how likely the bot is to respond")
						.setColor('#FFC0CB');
					message.channel.send(embed);
					return;
				}
				const rate = parseFloat(args[0]) / 100.0;
				rates[message.channel.id] = rate;
				let embed = new Discord.MessageEmbed()
					.setTitle("Rate for " + message.channel.name + " set to " + parseFloat((rate * 100.0).toFixed(3)) + "%!")
					.setColor('#FFC0CB');
				message.channel.send(embed);
				break;
			}
      case 'transform': {
        if (args.length === 0) {
          let embed = new Discord.MessageEmbed()
            .setTitle("Enter the name of someone to transform into!")
            .setDescription("Use >forms to see a list of all available forms")
            .setColor('#FFC0CB');
          message.channel.send(embed);
          return;
        }
        let valid = false;
				outer:
        for (let person of people.people) {
          if (args.join(" ").toLowerCase() === person.name.toLowerCase() || args[0] === person.mention || (person.id && args === person.id) || (person.username && args.join(" ").toLowerCase() === person.username.toLowerCase())) {
						for (let availableForm of availableForms[message.guild.id]) {
							if (availableForm.id === person.id) {
								let currentForm = await transform(person, message);
		            // sendWebhook("Transformed into " + person.name + "!", transformed.nickname, transformed.avatar);
		            sendWebhook(currentForm.onTransform, currentForm.nickname, currentForm.avatar);
		            valid = true;
		            break outer;
							}
						}
          }
        }
        if (!valid) {
          let embed = new Discord.MessageEmbed()
            .setTitle('Invalid form! Use ">forms" to see a list of all available forms.')
            .setColor('#FFC0CB');
          message.channel.send(embed);
          return;
        }
        break;
      }
    }
  }
});

function getAvailableForms(mode, message) {
	if (!availableForms[message.guild.id]) {
		availableForms[message.guild.id] = [];
	}
	if (mode['exclusive'].value) {
		clearArray(availableForms[message.guild.id]);
		const users = [];
		message.guild.members.cache.forEach(member => {
			users.push(member.user);
		});
		for (let user of users) {
			for (let person of people.people) {
				if (person.id && person.id === user.id) {
					availableForms[message.guild.id].push(person);
				}
			}
		}
	} else {
		clearArray(availableForms[message.guild.id]);
		for (let person of people.people) {
			availableForms[message.guild.id].push(person);
		}
	}
}

async function transform(person, message) {
	transformed[message.guild.id] = {};
	transformed[message.guild.id].person = person;
	let currentForm = transformed[message.guild.id].person;
	transformed[message.guild.id].available = [];
	let available = transformed[message.guild.id].available;
	//clear responses array so it can be set to new person
	clearArray(available);
	for (let response of person.responses) {
		available.push(response);
	}
	let user;
	try {
		user = await client.users.fetch(person.id);
	} catch {
		user = "none"
	}
	if (user !== "none") {
		const member = message.guild.member(await client.users.fetch(person.id));
		let nickname;
		if (member && member.nickname) {
			nickname = member.nickname;
		} else {
			nickname = user.username;
		}
		currentForm.nickname = nickname;
	}
	return currentForm;
}

function clearArray(arr) {
	while (arr.length > 0) {
		arr.pop();
	}
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

async function sendWebhook(message, username, avatar) {
  try {
    await webhook.send(message, {
      username: username,
      avatarURL: avatar,
    });
  } catch (error) {
    console.error('Error trying to send: ', error);
  }
}

// login to Discord with your app's token
fs.readFile('token.txt', 'utf-8', (err, data) =>{
	if (err) throw err;
	const token = data.toString().trim();
	client.login(token);
});
