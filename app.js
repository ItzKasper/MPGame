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
serv.listen(2000);
console.log("Server started succesfully.");

//Stores all the connected sockets (or web thingies, you know what i mean)
var SOCKET_LIST = {};

/* PLAYER PLAYER PLAYER PLAYER */

//Sets defaults for the player
var Player = function(id){
	var self = {
		id:"",
		health: 100,
		spd: 0.5,
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

	Player.generateBoard(socket);
	Task(socket.id);
}

//When a player disconnects, delete the player from the players list
Player.onDisconnect = function(socket){
	delete Player.list[socket.id];

	console.log('A player has disconnected');
	console.log(socket.id);

	//Remove all the elements from the allElements array so no new tasks will be generated for that element and it can be created again
	Player.cleanupArray(socket.id, allElements);
	Player.cleanupArray(socket.id, elementStatus);
}

Player.cleanupArray = function(playerId, array){
	//cycles through all the elements until it reaches one where the disconnected id matches with the element id, then it removes that and it start again until there isn't any left
	for(var i = 0;i < array.length;i++){
		if(array[i].playerId === playerId){
			array.splice(i, 1);
			Player.cleanupArray(playerId, array);
		}
	}
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
	return Math.floor(Player.list[id].health);
}

var allElements = [];
var elementStatus = [];

Player.generateBoard = function(socket){
	var elementOptions = ["button", "toggleSwitch", "slider"];
	var optionOptions = [3, 4, 6];

	var boardData = [socket.id];

	var newElementType;
	var newOptionCount;
	var newName;
	var newId;
	var newDisplayName;
	for(i=1;i<10;i++){

		newName = Player.generateDisplayName();
		newDisplayName = newName.displayName;
		newId = newName.id;
		//Determines which type it is going to use
		newElementType = elementOptions[Math.floor(3 * Math.random())];

		//Select the option count
		if(newElementType === "button"){
			newOptionCount = 1;
		}else if(newElementType === "toggleSwitch"){
			newOptionCount = 2;
		}else if(newElementType === "slider"){
			newOptionCount = optionOptions[Math.floor(3 * Math.random())];
		}

		var elementData = {
			playerId: socket.id,
			displayName: newDisplayName,
			id: newId,
			elementType: newElementType,
			optionCount: newOptionCount,
		}

		var statusData = {
			playerId: socket.id,
			displayName: newDisplayName,
			id: newId,
			optionCount: newOptionCount,
			currentOption: 0, 
		}

		boardData[i] = elementData;
		allElements.push(elementData);
		elementStatus.push(statusData);

	}
	//console.log(allElements);
	socket.emit('newBoard', boardData);

	socket.on('newToggleSwitchOption', function(switchId){
		for(var i = 0;i < elementStatus.length;i++){
			if(elementStatus[i].id === switchId){
				if(elementStatus[i].currentOption){
					elementStatus[i].currentOption = 0;
				}else if(!elementStatus[i].currentOption){
					elementStatus[i].currentOption = 1;
				}
			}
		}
	});

	socket.on('buttonPress', function(switchId){
		for(var i =0;i < elementStatus.length;i++){
			if(elementStatus[i].id === switchId){
				elementStatus[i].currenOption = 1;
				//Task.check();
				elementStatus[i].currenOption = 0;
			}
		}
	});
}

Player.generateDisplayName = function(){

	var nameOptions = [
	{displayName: "Kwadraat<wbr>lek", id: "kwadraatlek"},
	{displayName: "Systeem<wbr>bord", id: "systeembord"},
	{displayName: "Ontladings<wbr>schakelaar", id: "ontladingsschakelaar"},
	{displayName: "Javaanse <wbr>Wafel", id: "javaanse_wafel"},
	{displayName: "Birk", id: "birk"},
	{displayName: "Kalibrator", id: "kalibrator"},
	{displayName: "Mogge", id: "mogge"},
	{displayName: "Boermsa", id: "boersma"},
	{displayName: "Bril", id: "bril"},
	{displayName: "Banaan", id: "banaan"},
	{displayName: "Capacitor", id: "capacitor"},
	{displayName: "Geleiding", id: "geleiding"},
	{displayName: "Airco", id: "airco"},
	{displayName: "9", id: "9"},
	{displayName: "10", id: "10"},
	{displayName: "11", id: "11"},
	{displayName: "12", id: "12"},
	{displayName: "13", id: "13"},
	{displayName: "14", id: "14"},
	{displayName: "15", id: "15"},
	{displayName: "16", id: "16"},
	{displayName: "17", id: "17"},
	{displayName: "18", id: "18"},
	];
	var newDisplayName;

	while(true){

		var isDuplicate = false;
		newNameOption = nameOptions[Math.floor(nameOptions.length * Math.random())];
		newDisplayName = newNameOption.displayName;
		newId = newNameOption.id;

		for(var j = 0;j < allElements.length;j++){
			if(newDisplayName === allElements[j].displayName){
				isDuplicate = true;
				break;
			}
		}

		if(!isDuplicate){
			var self = {
				displayName: newDisplayName,
				id: newId,
			}

			return self;

		}

	}

}



/* TASK TASK TASK TASK */
var Task = function(id){
	var self = Task.generate(id);

	//console.log(self);
	Player.list[id].health = 100;
	var socket = SOCKET_LIST[id];
	socket.emit('newTask', self);
	return self;
}

Task.generate = function(id){
	var self = {
		playerId: "",
		displayMessage: "",
		type: "",
		option: "",
	}

	var rNumber = Math.floor(allElements.length * Math.random());
	randomElement = allElements[rNumber];

	var type = randomElement.elementType;
	var option = randomElement.optionCount;
	var displayName = randomElement.displayName;
	var message;

	statusData = elementStatus[rNumber];

	if(type === "button"){
		message = "Druk op de " + displayName + " knop";
	}else if(type === "toggleSwitch"){
		if(statusData.currentOption === 0){
			message = "Zet " + displayName + " aan";
		}else if(statusData.currentOption === 1){
			message = "Zet " + displayName + " uit";
		}
	}else if(type === "slider"){
		message = "Zet " + displayName + " to " + generateRandomNumberWithException(statusData.optionCount, statusData.currentOption);
	}

	var self = {
		playerId: id,
		displayMessage: message,
		type: type,
		option: option,
	}

	Task.list[id] = self;

	return self;
}

Task.list = {};

//When the health reaches 0 or below, execute this
Task.fail = function(id){
	delete Task.list[id];
	//console.log("Failed task for ID " + id);
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

	socket.on('requestCurrentOption', function(switchId){
		for(var i = 0;i < elementStatus.length;i++){
			if(elementStatus[i].id === switchId){
				socket.emit('requestReply', elementStatus[i].currentOption);
				break;
			}
		}
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

//Temporary because it keeps getting stuck in an infinite loop
function generateRandomNumberWithException(max, exception){
	var isDuplicate = true;

	//while(true)
		var rNumber = Math.floor(max * Math.random());
		//if(rNumber !== exception){
			//isDuplicate = false;
			return rNumber;
		//}else{
		//	isDuplicate = true;
		//}
}