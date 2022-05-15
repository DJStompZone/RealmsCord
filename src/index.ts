import { PluginApi } from "./@interface/pluginApi.i";
//import Jimp from "jimp";
const {
  Client,
  Intents,
  MessageEmbed,
  MessageAttachment,
} = require("discord.js");
const { SlashCommandBuilder } = require("@discordjs/builders");
// import { REST } from "@discordjs/rest";
// import { Routes } from "discord-api-types/v9";

const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const fs = require('node:fs');

const { token, channelId, clientId, guildId } = require("../config.json");
// const client = new Client({
//         intents: [
//           Intents.FLAGS.GUILDS,
//           Intents.FLAGS.GUILD_MESSAGES,
//           Intents.FLAGS.GUILD_MEMBERS,
//           ],
//         });

const {
  realmName,
  realmId,
  accountEmail,
  verboseMessageEvents,
  attemptAutoConnect,
} = require("../moreconfig.json");

const botName = "YourBotNameHere"


function objectFlip(obj) {
  const ret = {};
  Object.keys(obj).forEach(key => {
    ret[obj[key]] = key;
  });
  return ret;
}

const xToDMap = {
//      XUID            : Discord ID
		9999999999999999: 999999999999999999 // example
}

const dToXMap = objectFlip(xToDMap)

function checkCorrelation(target: number, fromDiscord: boolean) {
    if (!fromDiscord) {
		if (target in xToDMap) {
            return xToDMap[target]
		}
		else {return 0}
	}
	if (target in dToXMap) {
        return dToXMap[target]
	} 
	else {return 0}
}


function getSavedPic(eventXuid){
    const picMap = {
		2533274884028261: "https://i.imgur.com/ddE26vt.png" // stomp
    }
    if (eventXuid in picMap) {
	    return picMap[eventXuid]
	} else {
	    return "https://i.imgur.com/VPni8Fq.gif"
	}
}


class DiscBot {
    private api: PluginApi
    private client: typeof Client
    constructor(api: PluginApi) {
        this.api = api;
        this.client = new Client({
        intents: [
          Intents.FLAGS.GUILDS,
          Intents.FLAGS.GUILD_MESSAGES,
          Intents.FLAGS.GUILD_MEMBERS,
          ],
        });
        }
	
    async onLoaded(): Promise<void> {
        this.api.getLogger().info("RealmsCord: loaded!");
	    this.api.getLogger().info("Attempting auto-connection with realm...");
	    try {
	        this.api.autoConnect(accountEmail, realmId)
        }
	    catch(error) {
	        this.api.getLogger().error("AutoConnect failed... Attempting reconnect", error)
			try {
			    this.api.autoReconnect(accountEmail, realmId)
			}
			catch(anotherError) {
			    this.api.getLogger().error("AuReconnect failed. Skipping...", anotherError)
			}
        }
    }
    async onEnabled(): Promise<void> {
		this.api.getLogger().info("RealmsCord: enabled! (onEnabled)");
		this.api.getCommandManager().setPrefix('.')
		this.api.getCommandManager().registerCommand({
			command: "tonether",
			description: "Convert coords to their nethery equivalent.",
		}, (res) => {
			if (res.args.length === 0) {
				this.api.getCommandManager().executeCommand(`tellraw @a {\"rawtext\":[{\"text\":\"tonether: There are no coords to convert!\"}]}`)
			} else {
				const coords = []
				let coord = ""
				for (coord of res.args) {
					const ncoord = (parseInt(coord)/8)
					coords.push(ncoord.toString())
				}
				this.api.getCommandManager().executeCommand(`tellraw @a {\"rawtext\":[{\"text\":\"Here are the converted nether coordinates: ${coords.join(" ")}\"}]}`)
		}})
		this.api.getCommandManager().registerCommand({
				command: "fromnether",
				description: "Convert nether coords to their overworldy equivalent.",
			}, (res) => {
				if (res.args.length === 0) {
					this.api.getCommandManager().executeCommand(`tellraw @a {\"rawtext\":[{\"text\":\"fromnether: There are no coords to convert!\"}]}`)
				} else {
					const coords = []
					let coord = ""
					for (coord of res.args) {
						const ncoord = (parseInt(coord)*8)
						coords.push(ncoord.toString())
					}
					this.api.getCommandManager().executeCommand(`tellraw @a {\"rawtext\":[{\"text\":\"Here are the converted overworld coordinates: ${coords.join(" ")}\"}]}`)
		}})
		// this.api.getCommandManager().registerCommand({
				// command: "locate",
				// description: "Fetch your current location in the world (beta)",
			// }, (res) => {
					// var loc = res.sender.getLocation()
					// this.api.getCommandManager().executeCommand(`tellraw @a {\"rawtext\":[{\"text\":\"Here are your current coordinates: ${loc}\"}]}`)
		// })
		this.api.getLogger().info("RealmsCord: connecting to Discord Client...");
		let client = this.client
		client.login(token);
		this.api.getLogger().info("RealmsCord: login complete.");
			client.on("ready", async () => {
				this.api.getLogger().info("RealmsCord: Client Ready, setting activity...");
				client.user.setActivity(`over ${realmName}`, { type: "WATCHING" })
			this.api.getLogger().info("RealmsCord: Activity set.");
				this.api.getLogger().info(`Now bridged with Discord as ${client.user.username}`);
				const fancyStartMSG = new MessageEmbed()
					.setColor("#139dbf")
					.setDescription(`**${realmName}'s chat has been bridged with Discord**`)
					.setImage("https://i.imgur.com/5ygik4I.png");
				client.channels
					.fetch(channelId)
					.then(async (channel) => await channel.send({ embeds: [fancyStartMSG] }).then(msg => {
    setTimeout(() => msg.delete(), 30000)
  }).catch((error) => {
					this.api.getLogger().error(error);
				}))
					.catch((error) => {
					this.api.getLogger().error(error);
				});
				
				this.api
					.getCommandManager()
					.executeCommand(`tellraw @a {\"rawtext\":[{\"text\":\"§a§l§oRealmsCord has been connected.\"}]}`);
				const guild = await client.guilds.fetch(guildId);
				const cmds = await guild.commands.fetch();
				let arr = [];
				cmds.forEach((cmd) => {
					arr.push(cmd.name);
				});
				const commands = [
					new SlashCommandBuilder()
						.setName("list")
						.setDescription("Gets a list of people currently on the realm."),
					
					].map((command) => command.toJSON());
					commands.push(new SlashCommandBuilder()
						.setName("sendcmd")
						.setDescription("Send a command to be executed on the realm")
						.addStringOption(option =>
		                     option.setName('input')
			                   .setDescription('The command to send to the realm')
			                   .setRequired(true)).toJSON())
					const rest = new REST({ version: "9" }).setToken(token);
					async () => {
						try {
							await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
								body: commands,
							});
							this.api
								.getLogger()
								.success("Successfully registered commands.");
						}
						catch (error) {
							this.api.getLogger().error("Error occurred while attempting to register slash command", error);
						}
					};
				
        });
        client.on("messageCreate", (message) => {
            if (message.author.bot)
                return;
            if (message.channel.id == channelId) {
			    let hasCor = checkCorrelation(parseInt(`${message.author.id}`), false)
				let msgauthor = `${message.author.username}`
				if (!(parseInt(hasCor) === 0)) {
					msgauthor += `|${this.api.getPlayerManager().getPlayerByXuid(hasCor.toString()).getName()}`
				}
			    if (verboseMessageEvents) {
				    this.api.getLogger().success(`Received new message event from the Discord client: ${msgauthor}`);
				    this.api.getLogger().success(`   "${message.content}"`);
				}
                this.api
                    .getCommandManager()
                    .executeCommand(`tellraw @a {\"rawtext\":[{\"text\":\"§8[§9Discord§8]§f §7${msgauthor}§f: ${message.content}\"}]}`);
            }
        });
        this.api.getEventManager().on("PlayerMessage", async (packet) => {
		    if (verboseMessageEvents) {
				this.api.getLogger().success("Received new message event from the Realms client:");
				this.api.getLogger().success(`   "${packet.message}"`);
			}
            await client.channels
                .fetch(channelId)
                .then((channel) => channel
					.send(`__[${packet.sender
						.getConnection()
						.realm.name.replace(/§[0-9A-FK-OR]/gi, "")
						.replace("§g", "")}]__ **${packet.sender.getName()}:** ${packet.message}`))
                .catch((error) => {
					this.api.getLogger().error(error);
				});
        });
        this.api.getEventManager().on("PlayerInitialized", (userJoin) => {
			let eventXuid = userJoin.getXuid()
            const fancyLeaveMSG = new MessageEmbed()
                .setColor("#00ff00")
				.setTitle("__Player connected!__")
                .setDescription(`**${userJoin.getName()}** has joined the realm\nXUID: [${eventXuid}]\nDevice: ${userJoin.getDevice()}`)
				.setImage(getSavedPic(eventXuid));
            return client.channels
                .fetch(channelId)
                .then(async (channel) => await channel.send({ embeds: [fancyLeaveMSG] }))
                .catch((error) => {
                this.api.getLogger().error(error);
            });
        });
		this.api.getEventManager().on("PlayerDied", (userDied) => {
            const fancyDiedMSG = new MessageEmbed()
			let killer
			if(!userDied.killer) {
                fancyDiedMSG.setColor("#ff0000")
				fancyDiedMSG.setDescription(`**${userDied.player.getName()}** ${userDied.cause.replace('attack.anvil','was squashed by a falling anvil.').replace('attack.cactus','was pricked to death.').replace('attack.drown','drowned.').replace('attack.explosion','blew up.').replace('attack.fall','hit the ground too hard.').replace('attack.fallingBlock','was squashed by a falling block.').replace('attack.fireworks','went off with a bang.').replace('attack.flyIntoWall','experienced kinetic energy.').replace('attack.generic','died. :(').replace('attack.inFire','went up in flames').replace('attack.inWall','suffocated in a wall.').replace('attack.lava','tried to swim in lava.').replace('attack.lightningBolt','was struck by lightning.').replace('attack.magic','was killed by magic.').replace('attack.magma','discovered the floor was lava.').replace('attack.onFire','burned to death.').replace('attack.outOfWorld','fell out of the world.').replace('attack.spit','was spitballed by a lama.').replace('attack.starve','starved to death.').replace('attack.wither','withered away.').replace('attack.freeze','froze to death.').replace('attack.stalactite','was skewered by a falling stalacite.').replace('attack.stalagmite','was impaled on a stalagmite.').replace('fell.accident.generic','fell from a high place.').replace('fell.accident.ladder','fell off a ladder.').replace('fell.accident.vines','fell off some vines.').replace('fell.accident.water','fell out of the water.').replace('fell.accident.killer','was doomed to fall...').replace('fell.accident','fell from a high place').replace('attack','died. :(')}`);
			}
			else{
				if (userDied.killer && typeof userDied.killer !== 'string') {
					killer = userDied.killer.getName()
					}
				if (!killer) {
					if (userDied.killer && typeof userDied.killer === 'string') {
						killer = userDied.killer.replace('%entity.blaze.name','Balze').replace('%entity.creeper.name','Creeper').replace('%entity.drowned.name','Drowned').replace('%entity.elder_guardian.name','Elder Guardian').replace('%entity.endermite.name','Endermite').replace('%entity.evocation_illager.name','Evoker').replace('%entity.evocation_fang.name','Evoker Fangs').replace('%entity.ghast.name','Ghast').replace('%entity.guardian.name','Guardian').replace('%entity.hoglin.name','Hoglin').replace('%entity.husk.name','Husk').replace('%entity.magma_cube.name','Magma Cube').replace('%entity.phantom.name','Phantom').replace('%entity.piglin_brute.name','Piglin Brute').replace('%entity.pillager.name','Pillager').replace('%entity.ravager.name','Ravager').replace('%entity.shulker.name','Shulker').replace('%entity.shulker_bullet.name','Shulker Bullet').replace('%entity.silverfish.name','Silverfish').replace('%entity.skeleton.name','Skeleton').replace('%entity.skeleton_horse.name','Skeleton Horse').replace('%entity.slime.name','Slime').replace('%entity.stray.name','Stray').replace('%entity.vex.name','Vex').replace('%entity.vindicator.name','Vindicator').replace('%entity.witch.name','Witch').replace('%entity.wither_skeleton.name','Wither Skeleton').replace('%entity.zoglin.name','Zoglin').replace('%entity.zombie.name','Zombie').replace('%entity.zombie_villager.name','Zombie Villager').replace('%entity.zombie_villager_v2.name','Zombie Villager').replace('%entity.ender_dragon.name','Ender Dragon').replace('%entity.dragon_fireball.name','Dragon Fireball').replace('%entity.wither.name','Wither').replace('%entity.wither_skull.name','Wither Skull').replace('%entity.wither_skull_dangerous.name','Wither Skull').replace('%entity.warden.name','Warden').replace('%entity.allay.name','Allay').replace('%entity.frog.name','Frog').replace('%entity.bee.name','Bee').replace('%entity.cave_spider.name','Cave Spider').replace('%entity.dolphin.name','Dolphin').replace('%entity.enderman.name','Enderman').replace('%entity.goat.name','Goat').replace('%entity.iron_golem.name','Iron Golem').replace('%entity.llama.name','Llama').replace('%entity.llama_spit.name','Llama Spit').replace('%entity.panda.name','Panda').replace('%entity.piglin.name','Piglin').replace('%entity.polar_bear.name','Polar Bear').replace('%entity.spider.name','Spider').replace('%entity.wolf.name','Wolf').replace('%entity.zombie_pigman.name','Zombified Piglin').replace('%entity.pufferfish.name','Pufferfish')
					}
				}
                fancyDiedMSG.setColor("#ff0000")
				fancyDiedMSG.setDescription(`**${userDied.player.getName()}** was slain by ${killer}.`);
				}
            return client.channels
                .fetch(channelId)
                .then(async (channel) => await channel.send({ embeds: [fancyDiedMSG] }))
                .catch((error) => {
					this.api.getLogger().error(error);
            });
        });
        this.api.getEventManager().on("PlayerLeft", async (userLeave) => {
            const fancyLeaveMSG = new MessageEmbed()
                .setColor("#9d3838")
                .setDescription(`**${userLeave.getName()}** has left the realm.`);
            return client.channels
                .fetch(channelId)
                .then(async (channel) => await channel.send({ embeds: [fancyLeaveMSG] }))
                .catch((error) => {
					this.api.getLogger().error(error);
            });
        });
        client.on("interactionCreate", async (interaction) => {
            if (!interaction.isCommand())
                return;
            const { commandName } = interaction;
            if (commandName === "list") {
                let response = `/10 Players Online**:`;
                let players = [];
                response += `\n*-* ${botName}`;
                for (const [, p] of this.api.getPlayerManager().getPlayerList()) {
                    players.push(p.getName());
                    response += `\n*-* ${p.getName()}`;
                }
                const fancyResponse = new MessageEmbed()
                    .setColor("#5a0cc0")
                    .setTitle(`${realmName}`)
                    .setDescription(`**${players.length + 1}${response}`);
                await interaction
                    .reply({ embeds: [fancyResponse] })
                    .catch((error) => {
						this.api.getLogger().error(error);
                });
            } else if (commandName === "sendcmd") {
			    let cmdResponse = ''
                if (interaction.user.id == "269249777185718274") {
				    try {
				        this.api.getCommandManager().executeCommand(interaction.options.getString('input'))
						cmdResponse = "Command execution successful."
					} catch (error) {
		                console.error("Error executing command: ", error);
						cmdResponse = "Command execution failed."
	                }
                await interaction
                    .reply({ content: cmdResponse })
                    .catch((error) => {
						this.api.getLogger().error(error);
                });
            }}
        });
    }
    onDisabled() {
        let client = this.client
        const fancyStopMSG = new MessageEmbed()
            .setColor("#139dbf")
            .setDescription(":octagonal_sign: ***RealmsCord has been disconnected.***");
        client.channels
            .fetch(channelId)
            .then(async (channel) => await channel.send({ embeds: [fancyStopMSG] }).catch((error) => {
            this.api.getLogger().error(error);
        })).catch((error) => {
            this.api.getLogger().error(error);
        });
    }
}

export = DiscBot;
