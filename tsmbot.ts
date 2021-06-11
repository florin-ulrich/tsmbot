import {RiotAPIClient} from "./RiotAPIClient";
import {LossGloat} from "./LossGloat";
const {readFileSync} = require('fs')
import {Client, TextChannel} from "discord.js"


// arg file: x-api-key, token, pinged users, team name
const argsFromFile = JSON.parse(readFileSync(process.argv[2]).toString('utf-8'))
const {xApiKey, token, pingedUserIds, voiceChannelId, teamName} = argsFromFile

const client: Client = new Client()

client.login(token).catch(err => console.error(err))
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`)
    gloat()
});

function gloat() {
    const riotAPIClient = new RiotAPIClient(xApiKey)
    const lossGloat = new LossGloat(riotAPIClient, teamName)
    lossGloat.on("restart", console.log)
    lossGloat.on("teamFound", console.log)
    lossGloat.on("refreshingMatchStatus", console.log)
    lossGloat.on("sleepingUntilMatch", console.log)
    lossGloat.on("loss", losses => tagHopefulFans(true, losses))
    lossGloat.on("win", wins => tagHopefulFans(false, wins))
    lossGloat.startGloating().catch(err => {
        console.error(err)
        gloat()
    })
}

async function tagHopefulFans(won, losses, attempts = 0) {
    console.log(won ? "won" : "lost")
    if (attempts > 5) return
    const suffix = n => [, 'st', 'nd', 'rd'][n / 10 % 10 ^ 1 && n % 10] || 'th'
    try {
        const ch = await client.channels.fetch(voiceChannelId.toString(), true, true) as TextChannel
        for (const userId of pingedUserIds) {
            await ch.send(`${teamName} just lost for the ${losses}${suffix(losses)} time this split, lmaoooooooooooo <@${userId}>`)
        }
    } catch (err) {
        console.log(`failed to tag, retrying for ${attempts}${suffix(attempts)} time, err: ${err}`)
        setTimeout(() => tagHopefulFans(losses, attempts + 1), 2000, attempts + 1)
    }
}

