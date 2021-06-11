# tsmbot
tsmbot is a small discord bot that will tag your friends if their favorite team loses in competitive league of legends. it is written in typescript (mostly for intellisense)
and uses discord.js to integrate with discord. it makes heavy use of object destructuring to parse riot's api responses to show off some of it's capabilities. 

## how to use
the program takes a filename as argument. the file contains the following required parameters: the token of your discord bot, the id of the textchannel that your friends will
be tagged in, an array of your friend's user name ids, an x-api-key that is required to access riot's api and finally the name of your friends favorite team. an example file is
provided in example.json.

## how to get ids and x-api-key
in order to get a user's discord id right click their portrait -> copy id. in order to get a textchannel's id right click the channel -> copy id. in order to get an x-api-key
(for google chrome) go to [lol esports](https://lolesports.com/), press f12, go to the network tab, refresh the page, look for "getLeagues?hl=\<your locale\>", click it, look for
x-api-key under request headers. note that all ids are strings rather than numbers because they would otherwise be to big to fit into js's Number type.
