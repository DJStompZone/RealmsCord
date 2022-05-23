import { PluginApi, Player } from "./@interface/pluginApi.i";
const {
  Client,
  Intents,
  MessageEmbed,
  MessageAttachment,
} = require("discord.js");
const { SlashCommandBuilder } = require("@discordjs/builders");
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const fs = require('node:fs');

const {
  realmName,
  realmId,
  accountEmail,
  verboseMessageEvents,
  attemptAutoConnect,
  crossTalk,
  token,
  channelId,
  clientId,
  guildId,
  botName,
  xToDMap,
  picMap,
  ownerDiscordID
} = require("../config.json");
const crosstalk = crossTalk
import loc from "./loc";


function objectFlip(obj) {
  const ret = {};
  Object.keys(obj).forEach(key => {
    ret[obj[key]] = key;
  });
  return ret;
}
const dToXMap = objectFlip(xToDMap)

function checkCorrelation(target, fromDiscord) {
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

function getSavedPic(eventXuid) {
    if (eventXuid in picMap) {
	    return picMap[eventXuid]
	} else {
	    return "https://i.imgur.com/VPni8Fq.gif"
	}
}




function parseLocalText(itxt){
  let inp = itxt.replaceAll("%", "").replaceAll(".", "_")
  if (inp.split(" ").length === 1 && Object.keys(loc).includes(inp)){return loc[inp]}
  return inp.split(" ").map(itm => loc[itm]||itm).join(" ")
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
			client.channels.fetch(channelId)
				.then(async (channel) => await channel.send({ embeds: [fancyStartMSG] })
				.then(msg => {setTimeout(() => msg.delete(), 30000)})
				.catch((error) => {
					this.api.getLogger().error(error);
				}))
			this.api.getCommandManager()
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
					this.api.getLogger().success("Successfully registered commands.");
				}
				catch (error) {
					this.api.getLogger().error("Error occurred while attempting to register slash command", error);
				}
			};
        });
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
        client.on("messageCreate", (message) => {
			if (crosstalk?(message.author.id===clientId):(message.author.bot)) {return}
            if (message.channel.id == channelId) {
			    let hasCor = checkCorrelation(parseInt(`${message.author.id}`), false)
				let msgauthor = `${message.author.username}`
				if (!(parseInt(hasCor) === 0)) {
					msgauthor += `|${this.api.getPlayerManager().getPlayerByXuid(hasCor.toString()).getName()}`
				}
			    if (verboseMessageEvents) {
				    this.api.getLogger().info(`Received new message event from the Discord client: ${msgauthor}`);
				    this.api.getLogger().info(`   "${message.content}"`);
				}
                this.api
                    .getCommandManager()
                    .executeCommand(`tellraw @a {\"rawtext\":[{\"text\":\"§8[§9Discord§8]§f §7${msgauthor}§f: ${message.content}\"}]}`);
            }
        });
        this.api.getEventManager().on("PlayerMessage", async (packet) => {
		    if (verboseMessageEvents) {
				this.api.getLogger().info("Received new message event from the Realms client:");
				this.api.getLogger().info(`Message:   "${packet.message}"`);
			}
			let playerMessage = ""
			if (packet.sender) {
				playerMessage += `__[${realmName}]__ **${packet.sender.toString()}:** ${packet.message}`
			} else {
				playerMessage += `__[${realmName}]__ *${packet.message.substr(2)}*`
			}
            await client.channels
                .fetch(channelId)
                .then((channel) => channel
					.send(playerMessage))
                .catch((error) => {
					this.api.getLogger().error(error);
				});
        });
        this.api.getEventManager().on("PlayerInitialized", (userJoin) => {
			let eventXuid = userJoin.getXuid()
			let joinStr = `**${userJoin.getName()}** has joined ${realmName}`
            const fancyLeaveMSG = new MessageEmbed()
                .setColor("#00ff00")
				.setTitle("__Player connected!__")
                .setDescription(`${joinStr}\nXUID: [${eventXuid}]\nDevice: ${userJoin.getDevice()}`)
				.setImage(getSavedPic(eventXuid));
            return client.channels
                .fetch(channelId)
                .then(async (channel) => await channel.send({ 
					content: joinStr,
					embeds: [fancyLeaveMSG]
				}))
                .catch((error) => {
                this.api.getLogger().error(error);
            });
        });
		
		this.api.getEventManager().on("PlayerDied", (userDied: {player: Player, cause: string, killer?: Player | string}) => {
			let deadPlayer: string = `${userDied.player}`
			let obituary: string = `**${deadPlayer}** `.concat(
				parseLocalText(`${userDied.cause}`))
			if (obituary.includes("KLR")){
				obituary = obituary.replace("KLR", parseLocalText(`${userDied.killer}`))
				}
			this.api.getLogger().success(`PlayerDied event: Sending obituary text: ${obituary}`)
            const fancyDiedMSG = new MessageEmbed()
				.setColor("#ff0000")
				.setTitle("**Oof!**")
				.setDescription(obituary);
            return client.channels.fetch(channelId)
			.then(async (channel) => await channel.send({ content: '  ', embeds: [fancyDiedMSG] }))
            .catch((error) => {this.api.getLogger().error(error)});
		});
		
        this.api.getEventManager().on("PlayerLeft", async (userLeave) => {
            const fancyLeaveMSG = new MessageEmbed()
                .setColor("#9d3838")
                .setDescription(`**${userLeave.getName()}** has left the realm.`);
            return client.channels
                .fetch(channelId)
                .then(async (channel) => await channel.send({
					content: `**${userLeave.getName()}** has left the realm.`,
					embeds: [fancyLeaveMSG]
				}))
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
                response += `\n*-* ${botName} (Bot)`;
                for (const [, p] of this.api.getPlayerManager().getPlayerList()) {
                    players.push(p.getName());
                    response += `\n*-* ${p.getName()} (${p.getDevice()})`;
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
                if (interaction.user.id == ownerDiscordID) {
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
    async onDisabled(){
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
