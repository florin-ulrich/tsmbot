import {EventEmitter} from 'events';
const levenshtein = require('js-levenshtein');
import {RiotAPIClient} from "./RiotAPIClient"

export class LossGloat extends EventEmitter {
    private readonly riotAPIClient: RiotAPIClient
    private readonly teamName: string
    private teamId: number
    private teamCode: string
    private lastMatchId: number
    private currentMatchId: number
    private teamLosses: number
    private teamWins: number

    constructor(riotAPIClient: RiotAPIClient, teamName: string) {
        super()
        this.riotAPIClient = riotAPIClient;
        this.teamName = teamName;
    }

    async startGloating() {
        const {code, id, name} = await this.getTeamData()
        this.teamId = id
        this.teamCode = code
        this.emit("teamFound", `your team "${this.teamName}" has been identified as ${name} with code ${code} and id ${id}`)
        while (true) {
            try {
                const {result, amount} = await this.getMatchResult()
                this.emit(result, amount)
                await snooze(minutes(15))
            } catch (err) {
                this.emit("restart", "restarting due to an error occurring, error message: " + err.message)
                await snooze(minutes(1))
            }
        }
    }

    async getTeamData(): Promise<any> {
        const lowerCaseLevenshtein = (a, b) => levenshtein(a.toLowerCase(), b.toLowerCase())
        let {data: {teams: [...teamsArr]}} = await this.riotAPIClient.getAllTeams()
        let minDist = Number.MAX_SAFE_INTEGER
        let minTeam = {}
        for (const team of teamsArr) {
            const {name, slug, code, id} = team
            const mins = [name, slug, code].map(a => lowerCaseLevenshtein(a, this.teamName))
            if (!name.toLowerCase().includes("academy")) {
                // since academy teams sometimes have the same code as their supers, we dont want to consider academy teams if they
                // haven't been passed by name or slug to avoid ambiguities (assuming people looking for c9 ie would rather
                // know about their lcs team than the academy team)
                mins.push(lowerCaseLevenshtein(code, this.teamName))
            }
            let potentialNewMinDist = Math.min(...mins)
            if (potentialNewMinDist < minDist) {
                minDist = potentialNewMinDist
                minTeam = {id, code, name}
            }
        }
        return minTeam
    }

    async getMatchResult() {
        // riot api is a little out of sync between the events and schedule endpoint so we make sure that we dont check
        // a match that we already know the outcome of
        const {startTime, match: {id, teams}} = await this.getNextMatch()
        if (id === this.lastMatchId) {
            throw new Error(`riot api data most likely out of sync`)
        }
        this.emit("matchFound", `found next match for ${this.teamName}: ${JSON.stringify(teams)}`)
        const {record: {wins, losses}} = teams.find(({code}) => code === this.teamCode)
        this.teamLosses = losses
        this.teamWins = wins
        this.currentMatchId = id

        // if the game is in the future, we wait until that future date, otherwise we start looking right away
        const startDatePlus15Mins = new Date(startTime)
        startDatePlus15Mins.setTime(startDatePlus15Mins.getTime() + minutes(15))
        const snoozeFor = Math.max(startDatePlus15Mins.getTime() - new Date().getTime(), 0)
        if (snoozeFor) {
            this.emit("sleepingUntilMatch", `found future match for ${this.teamName} at ${startTime}, sleeping for ${snoozeFor / (60 * 1000)} minutes`)
        }
        await snooze(snoozeFor)

        // once our game has started, we periodically check the status and return the game result once its finished
        let matchCompleted = false
        while (!matchCompleted) {
            const {completed, lost, otherTeamName} = await this.getCurrentMatchStatus()
            this.emit("refreshingMatchStatus", `checking whether ${this.teamName} lost vs ${otherTeamName}`)
            matchCompleted = completed
            if (completed) {
                this.lastMatchId = this.currentMatchId
                const result = lost ? "loss" : "win"
                const amount = lost ? this.teamLosses + 1 : this.teamWins + 1
                return {result, amount}
            }
            await snooze(minutes(0.5))
        }
    }

    async getCurrentMatchStatus() {
        const {data: {event: {match: {teams, games}}}} = await this.riotAPIClient.getMatchById(this.currentMatchId)
        const team = teams.find(({code}) => code === this.teamCode)
        const otherTeam = teams.find(({code}) => code !== this.teamCode)
        return {
            completed: games.every(g => g.state === "completed" || g.state === "unneeded"),
            lost: team.result.gameWins < otherTeam.result.gameWins,
            otherTeamName: otherTeam.name
        }
    }

    // gets the next match for our team as found in the schedule endpoint
    async getNextMatch() {
        const {data: {esports: {events: [{league: {id}}]}}} = await this.riotAPIClient.getEventListForTeamById(this.teamId)
        const {data: {schedule: {events: [...eventList]}}} = await this.riotAPIClient.getScheduleForLeagueById(id)
        const unstartedMatches = eventList
            .filter(({state, type}) => state !== "completed" && type === "match")
            .filter(({match: {teams: [team]}}) => team.result?.outcome === null)
        const nextMatchForTeam = unstartedMatches.find(({match: {teams: [...teamsArr]}}) => teamsArr.map(({code}) => code).includes(this.teamCode))
        if (!nextMatchForTeam) {
            throw new Error(`no events found for ${this.teamName} in the near future`)
        }
        return nextMatchForTeam
    }
}

// test()

function test() {
    const rito: RiotAPIClient = new RiotAPIClient("0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z")
    const teamNames = ["pdw", "axl", "gxr", "msfp"]
    const logMsg = msg => console.log(msg)
    for (const teamName of teamNames) {
        const gloat = new LossGloat(rito, teamName)
        gloat.on("restart", logMsg)
        gloat.on("teamFound", logMsg)
        gloat.on("refreshingMatchStatus", logMsg)
        gloat.on("sleepingUntilMatch", logMsg)
        gloat.on("lost", logMsg)
        gloat.on("won", logMsg)
        gloat.startGloating().catch(err => console.error(err))
    }
}

function minutes(amount) {
    return amount * 60 * 1000
}

// basically Thread.sleep if used as await snooze(ms) in an async function
function snooze(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}
