const got = require('got')

const endpoints = {
    schedule: "https://esports-api.lolesports.com/persisted/gw/getSchedule?hl=en-GB&leagueId=",
    event: "https://esports-api.lolesports.com/persisted/gw/getEventDetails?hl=en-GB&id=",
    teamEventList: "https://esports-api.lolesports.com/persisted/gw/getEventList?hl=en-GB&teamId=",
    teams: "https://esports-api.lolesports.com/persisted/gw/getTeams?hl=en-GB"
}

export class RiotAPIClient {
    private xApiKey: string;

    constructor(xApiKey) {
        this.xApiKey = xApiKey
    }

    getAllTeams() {
        return this.fetchJsonResource(endpoints.teams)
    }

    getEventListForTeamById(id) {
        return this.fetchJsonResource(endpoints.teamEventList + id)
    }

    getScheduleForLeagueById(id) {
        return this.fetchJsonResource(endpoints.schedule + id)
    }

    getMatchById(id) {
        return this.fetchJsonResource(endpoints.event + id)
    }

    async fetchJsonResource(url) {
        return (await got(url, {headers: {"x-api-key": this.xApiKey}, responseType: "json"})).body
    }
}
