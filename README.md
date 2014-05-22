[![build](https://travis-ci.org/Eeems/EeeZorBot.svg)](https://travis-ci.org/Eeems/EeeZorBot)
EeeZorBot
=========
Version:
  0.1.1

Important Files:
	Readme.txt		This file. Gives some important information about usage.
	Changelog.txt	The changelog
	Developers.txt	Documentation of the API.
	main.js			The main file for the bot. Used to load all the scripts and make/handle the irc connections.
	config.js		Where you can configure the bot's name, nick etc.

Built in Console commands:
	ADD-CHANNEL <server id> <channel name>
	ADD-SERVER <hostname> <port> [<nickserv password>]
	DEBUG
	EXIT
	HELP
	JOIN <server id> <channel name>
	LIST
	QUIT <server id>
	RAW <server id> <data to send>
	RELOAD
	REMOVE-CHANNEL <server id> <channel name>
	REMOVE-SERVER <server id>
	RUN <javascript string>
