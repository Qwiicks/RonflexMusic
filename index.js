const Discord = require('discord.js');
const icy = require('icy');
const fs = require('fs');
const client = new Discord.Client();
const {
	prefix,
	token,
	voicechannel,
	logchannel,
	activity,
	list
} = require('./config.json');

var serverQueue = [...list];

client.once('ready', () => {
	clientLogMessage("Status: Connecté au serveur");
	playStream();
});

client.once('reconnecting', () => {
	clientLogMessage("Status: Reconnexion au serveur");
	playStream();
});

client.once('disconnect', () => {
	clientLogMessage("Status: déconnecter du serveur ");
});

client.on('message', async message => {
	if (!message.content.startsWith(prefix) || message.author.bot) return;
	const args = message.content.slice(prefix.length).split(' ');
	const command = args.shift().toLowerCase();
});

client.login(token);

function playStream() {
	client.channels.fetch(voicechannel).then(chanel => {
		chanel.join().then(connection => {
			clientLogMessage("Status: Connexion réussie au canal vocal");
			if (activity) changeActivity(activity);
			
			connection.on("debug", e => {
				if (e.includes('[WS] >>') || e.includes('[WS] <<')) return;
				clientLogMessage("Status: avertissement de connexion - " + e);
				//if(e.includes('[WS] closed')) abortWithError();
			});
			connection.on("disconnect", () => {
				clientLogMessage("Status: déconnecter la connexion");
			});
			connection.on("error", e => {
				clientLogMessage("Status: Erreur de Connexion ");
				console.log(e);
			});
			connection.on("failed", e => {
				clientLogMessage("Status: La connexion a échoué");
				console.log(e);
			});
			
			initDispatcher(connection);
		}).catch(e => {
			clientLogMessage("Status: Erreur de connexion Chanel");
			console.log(e);
		});
	}).catch(e => {
		clientLogMessage("Status: Chanel introuvable");
		console.log(e);
	});
}

function initDispatcher(connection) {
	clientLogMessage("Status: La diffusion a commencé");
	
	if (serverQueue === undefined || serverQueue.length == 0) {
		clientLogMessage("Status: Répéter toute la playlist");
		serverQueue = [...list];
	}
	const currentTrack = serverQueue.shift();
	if (currentTrack.name) changeActivity(currentTrack.name);
	
	const streamDispatcher = connection.play(currentTrack.url, {
			volume: false,
			highWaterMark: 512,
			bitrate: 128,
			fec: true
		})
		.on("finish", () => {
			clientLogMessage("Status: La diffusion était terminée");
			streamDispatcher.destroy();
			initDispatcher(connection);
		});
		
	streamDispatcher.setBitrate(128);
	streamDispatcher.setFEC(true);
	
	streamDispatcher.on("debug", e => {
		clientLogMessage("Status: Avertissement du répartiteur - " + e);
	});
	streamDispatcher.on("error", e => {
		clientLogMessage("Status: Avertissement du répartiteur");
		console.log(e);
		abortWithError();
	});
	
	getICY(currentTrack.url);
}

function getICY(url) {
	const icyReader = icy.get(url, function (i) {
		i.on('metadata', function (metadata) {
			let icyData = icy.parse(metadata);
			if (icyData.StreamTitle) changeActivity(icyData.StreamTitle);
		});
		i.resume();
	});
}

function abortWithError() {
	clientLogMessage("Status: La connexion à la station radio est interrompue ou ne répond pas, interrompant le processus");
	streamDispatcher.destroy();
	process.exit(1);
}

function clientLogMessage(message) {
	client.channels.fetch(logchannel).then(chanel => {
		chanel.send(message)
	}).catch(e => console.log(e));
	
	console.log(message);
}

function changeActivity(message) {
	clientLogMessage("Lecture en cours: " + message);
	client.user.setActivity(message, {
		type: 'LISTENING'
	});;
}