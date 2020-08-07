// require the discord.js module
const Discord = require('discord.js');
const people = require('./responses.json');
const fs = require('fs');

// create a new Discord client
const client = new Discord.Client();
const prefix = ">";
// when the client is ready, run this code
// this event will only trigger one time after logging in
client.once('ready', async () => {
	console.log('Ready!');
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
});

let transformed = {};
let webhook;
// const available = [];
const modes = {
	'random': { value: false, desc: "Toggle to make Ditto transform randomly without being prompted" }
}

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
		for (let mode in modes) {
			switch (mode) {
				case 'random': {
					if (modes[mode].value) {
						if (Math.random() < 0.3) {
							let selected = Math.floor(Math.random() * people.people.length);
							await transform(people.people[selected], message);
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
      if (Math.random() < currentForm.rate || message.content === "<@!740746928186327072>") { // % chance to respond
        sendWebhook(available[selected], currentForm.nickname, currentForm.avatar);
        available.splice(selected, 1);
      }
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
						{ name: 'status', value: 'Displays modes that are toggled' }
          );
        message.channel.send(embed);
        break;
      }
      case 'current': {
        if (transformed[message.guild.id]) {
					let currentForm = transformed[message.guild.id].person;
          let embed = new Discord.MessageEmbed()
	         .setTitle('Current Form: ' + currentForm.name)
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
        const users = [];
        const guild = client.guilds.cache.get(message.guild.id + "");
        guild.members.cache.forEach(member => {
          users.push(member.user);
        });
        const valid = [];
        for (user of users) {
          for (person of people.people) {
            if (person.id && person.id === user.id) {
              valid.push([person.name, "@" + user.username + "#" + user.discriminator]);
            }
          }
        }
        let embed = new Discord.MessageEmbed()
          .setTitle("Available Forms (use full name or mention with >transform):")
          valid.forEach(form => {
            embed.addField(form[0], form[1], true);
          })
          embed.setColor('#FFC0CB');
        message.channel.send(embed);
        break;
      }
			case 'status': {
				let embed = new Discord.MessageEmbed()
					.setTitle("Toggled Modes:")
					.setColor('#FFC0CB')
				for (let mode in modes) {
					if (modes[mode].value) {
						embed.addField(mode, modes[mode].value ? "ON" : "OFF", true);
					}
				}
				if (embed.fields.length === 0) {
					embed.setDescription("No modes toggled! Use >modes to see a list of available modes")
				}
				message.channel.send(embed);
				break;
			}
			case 'toggle': {
				let selectedMode;
				for (let mode in modes) {
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
				modes[selectedMode].value = !modes[selectedMode].value;
				let embed = new Discord.MessageEmbed();
					switch (selectedMode) {
						case 'random': {
							embed.setTitle("Random toggled " + (modes['random'].value ? "on" : "off") + "!");
							embed.setDescription(modes['random'].value ? "Ditto will transform randomly without being prompted to." : "Ditto will no longer transform randomly.");
							embed.setColor('#FFC0CB');
							message.channel.send(embed);
							let selected = Math.floor(Math.random() * people.people.length)
							await transform(people.people[selected], message);
							break;
						}
					}
				break;
			}
			case 'modes': {
				let embed = new Discord.MessageEmbed()
					.setTitle("Available modes:")
					.setColor('#FFC0CB')
				for (let mode in modes) {
					embed.addField(mode, modes[mode].desc);
				}
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
        for (let person of people.people) {
          if (args.join(" ").toLowerCase() === person.name.toLowerCase() || args[0] === person.mention || (person.id && args === person.id) || (person.username && args.join(" ").toLowerCase() === person.username.toLowerCase())) {
						let currentForm = await transform(person, message);
            // sendWebhook("Transformed into " + person.name + "!", transformed.nickname, transformed.avatar);
            sendWebhook(currentForm.onTransform, currentForm.nickname, currentForm.avatar);
            valid = true;
            break;
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
		if (member.nickname) {
			nickname = member.nickname;
		} else {
			nickname = user.username;
		}
		currentForm.nickname = nickname;
	}
	console.log(currentForm.nickname);
	return currentForm;
}

function clearArray(arr) {
	while (arr.length > 0) {
		arr.pop();
	}
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
