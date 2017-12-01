//INIT for express
var express = require('express');
var app = express();
var serv = require('http').Server(app);

//If no directory is given
app.get('/',function(req, res) {
	res.sendFile(__dirname + '/client/index.html');
});
//Can only use files in the /client directory
app.use('/client',express.static(__dirname + '/client'));

//LISTEN UP HERE"S A STORY 
serv.listen(process.env.PORT || 2000);
console.log("Server started succesfully.");

//Stores all the connected sockets (or web thingies, you know what i mean)
var SOCKET_LIST = {};

/* PLAYER PLAYER PLAYER PLAYER */

//Sets defaults for the player
var Player = function(id){
	var self = {
		id:"",
		health: 100,
		spd: 1,
	}

	self.id = id;

	Player.list[id] = self;
	return self;
}

//When a player connects
Player.list = {};
Player.onConnect = function(socket){
	//Create a player with the socket id
	var player = Player(socket.id);
	console.log("A Player With Id: " + socket.id + " Has Connected");

	Task(socket.id);
}

//When a player disconnects, delete the player from the players list
Player.onDisconnect = function(socket){
	delete Player.list[socket.id];
}

//Updates the healthbare
Player.updateHealth = function(id){
	//Get the health from the player list with the ID same to the socket
	if(Player.list[id].health > 0){
		Player.list[id].health = Player.list[id].health -= Player.list[id].spd;
	}
	else if(Player.list[id].health <= 0){
		Task.fail(id);
		Task(id);
	}
	return Player.list[id].health;
}



/* TASK TASK TASK TASK */
var Task = function(id){
	var self = Task.generate(id);

	console.log(self);
	Player.list[id].health = 100;
	var socket = SOCKET_LIST[id];
	socket.emit('newTask', self);
	return self;
}

Task.generate = function(id){
	var self = {
		playerId: "",
		displayName: "",
		type: "",
		options: "",
	}

	Task.list[id] = self;
	var newDisplayName;
	switch(Math.floor(6 * Math.random())){
		case 0:
			newDisplayName = "HOI DIT IS EEN TASK 0";
			break;
		case 1:
			newDisplayName = "HOI DIT IS EEN TASK 1";
			break;
		case 2:
			newDisplayName = "HOI DIT IS EEN TASK 2";
			break;
		case 3:
			newDisplayName = "HOI DIT IS EEN TASK 3";
			break;
		case 4:
			newDisplayName = "HOI DIT IS EEN TASK 4";
			break;
		case 5:
			newDisplayName = "HOI DIT IS EEN TASK 5";
			break;
	}

	//If the new task is the same as the old one, try again (doesn't work yet)
	if(Task.list[id] != null && newDisplayName == Task.list[id].displayName){
		Task.generate(id);
	}else if(newDisplayName != Task.list[id].displayName){
		Task.list[id].displayName = newDisplayName;
	}

	self.playerId = id;
	self.type = "switch";
	self.options = "2";

	return self;
}

Task.list = {};

//When the health reaches 0 or below, execute this
Task.fail = function(id){
	delete Task.list[id];
	console.log("Failed task for ID " + id);
}



var io = require('socket.io')(serv,{});
io.sockets.on('connection', function(socket){
	//When a new socket connects
	console.log('New Socket Connection')

	//Give it a random id and add it to the array which stores all the sockets
	socket.id = Math.random();
	SOCKET_LIST[socket.id] = socket;

	//Do the necessary things
	Player.onConnect(socket);

	//When a socket disconnects
	socket.on('disconnect',function(){
		delete SOCKET_LIST[socket.id];
		Player.onDisconnect(socket);
	});

});

setInterval(function(){
	//Creates a pack with all the data to be used by the client
	for(var i in SOCKET_LIST){
		var socket = SOCKET_LIST[i];
		//console.log(socket.id);
		/*console.log(Player(socket.id).health);*/
		var pack = {
			health:Player.updateHealth(socket.id)
		}
		socket.emit('newPlayerData', pack);
	}
	/*var pack = {
		health:HealthBar.update()
	}

	//Sends the data out to all the sockets
	for(var i in SOCKET_LIST){
		var socket = SOCKET_LIST[i];
		socket.emit('newPlayerData', pack);
	}*/
},1000/25);