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
var totalCompleted = 0;
var totalFailed = 0;

/* PLAYER PLAYER PLAYER PLAYER */

//Sets defaults for the player
var Player = function(id, spd){
	var self = {
		id: "",
		health: 100,
		spd: 1,
	}

	self.id = id;
	self.spd = spd;

	Player.list[id] = self;
	console.log(Player.list);
	return self;
}

//When a player connects
Player.list = {};
Player.onConnect = function(socket){
	//Create a player with the socket id
	var player = Player(socket.id, 1);
	console.log("A Player With Id: " + socket.id + " Has Connected");
	//console.log(Player.list.length);

	//Adjust the speed of the healthbar on the amount of online players
	var onlinePlayers = getOnlinePlayers();

	for(var i in Player.list){
		Player.list[i].spd = 1 - (onlinePlayers * 0.115);
		Player.list[i].spd;
	}

	Player.generateBoard(socket);
	Task(socket.id);
}

//When a player disconnects, delete the player from the players list
Player.onDisconnect = function(socket){
	delete Player.list[socket.id]; 

	console.log('A player has disconnected');
	console.log(socket.id);

	if(getOnlinePlayers() === 0){
		totalCompleted = 0;
		totalFailed = 0;
	}

	//Adjust the speed of the healthbar on the amount of online players
	var onlinePlayers = getOnlinePlayers();

	for(var i in Player.list){
		Player.list[i].spd = 1 - (onlinePlayers * 0.115);
		Player.list[i].spd;
	}

	//Remove all the elements from the allElements array so no new tasks will be generated for that element and it can be created again
	Player.cleanupArray(socket.id, elementStatus);
	Player.cleanupArray(socket.id, taskList);
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
		for(var i = 0;i<taskList.length;i++){
			if(taskList[i].playerId === id){
				for(var j = 0; j < elementStatus.length; j++){
					if(elementStatus[j].playerId === id){
						elementStatus[j].oldOption = elementStatus[j].currentOption;
					}
				}
				Task.fail(i);
				newTask = Task.generate(id);
				var socket = SOCKET_LIST[id];
				socket.emit('newTask', newTask);
				break;
			}
		}
	}
	return Math.floor(Player.list[id].health);
}

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

		newName = Player.generateDisplayName(socket);
		newDisplayName = newName.displayName;
		newId = newName.id;
		//Determines which type it is going to use
		rNumber = Math.floor(100 * Math.random());
		if(rNumber >= 0 && rNumber < 35){
			newElementType = elementOptions[0];
		}else if(rNumber >= 40 && rNumber < 70){
			newElementType = elementOptions[1];
		}else if(rNumber >= 70 && rNumber <= 100){
			newElementType = elementOptions[2];
		}else{
			newElementType = elementOptions[0];
		}

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
			currentOption: 0, 
			oldOption: 0,
		}

		boardData[i] = elementData;
		elementStatus.push(elementData);

	}
	socket.emit('newBoard', boardData);

	socket.on('newToggleSwitchOption', function(switchId){
		for(var i = 0;i < elementStatus.length;i++){
			if(elementStatus[i].id === switchId){
				if(elementStatus[i].currentOption){
					elementStatus[i].currentOption = 0;
				}else if(!elementStatus[i].currentOption){
					elementStatus[i].currentOption = 1;
				}
				Task.check(switchId, elementStatus[i].currentOption);
			}
		}
	});

	socket.on('buttonPress', function(switchId){
		for(var i=0;i < elementStatus.length;i++){
			if(elementStatus[i].id === switchId){
				elementStatus[i].currentOption = 1;
				Task.check(switchId, elementStatus[i].currentOption);
				elementStatus[i].currentOption = 0;
			}
		}
	});

	socket.on('newSliderOption', function(data){
		currentOption = data.newOption;
		switchId = data.switchId;
		Task.check(switchId, currentOption);
	})

}

Player.generateDisplayName = function(socket){

	var nameOptions = [
	{displayName: "Kwadraat<wbr>lek", id: "kwadraatlek"},
	{displayName: "Systeem<wbr>bord", id: "systeembord"},
	{displayName: "Ontladings<wbr>schakelaar", id: "ontladingsschakelaar"},
	{displayName: "Javaanse <wbr>Wafel", id: "javaanse_wafel"},
	{displayName: "Birk", id: "birk"},
	{displayName: "Kalibrator", id: "kalibrator"},
	{displayName: "Mogge", id: "mogge"},
	{displayName: "Boersma", id: "boersma"},
	{displayName: "Bril", id: "bril"},
	{displayName: "Banaan", id: "banaan"},
	{displayName: "Capacitor", id: "capacitor"},
	{displayName: "Geleiding", id: "geleiding"},
	{displayName: "Airco", id: "airco"},
	{displayName: "Geluids<wbr>versneller", id: "geluidsversneller"},
	{displayName: "Sonisch <wbr>Schild", id: "sonisch_schild"},
	{displayName: "Holo<wbr>spectrum", id: "holospectrum"},
	{displayName: "Fiets<wbr>lampje", id: "fietslampje"},
	{displayName: "Spectrum<wbr>moer", id: "spectrummoer"},
	{displayName: "Strijk<wbr>machine", id: "strijkmachine"},
	{displayName: "Smoor<wbr>klep", id: "smoorklep"},
	{displayName: "Infrarood", id: "infrarood"},
	{displayName: "Ultra<wbr>violet", id: "ultraviolet"},
	{displayName: "Uitlaat", id: "uitlaat"},
	{displayName: "Landings<wbr>gestel", id: "landingsgestel"},
	{displayName: "Remmen", id: "remmen"},
	{displayName: "Raketten", id: "raketten"},
	{displayName: "SAS", id: "sas"},
	{displayName: "RCS", id: "rcs"},
	{displayName: "Golfvorm", id: "golfvorm"},
	{displayName: "COMMs", id: "comms"},
	{displayName: "VUUR!", id: "vuur"},
	{displayName: "Ongeloof", id: "Ongeloof"},
	{displayName: "Uien", id: "Uien"},
	{displayName: "Toeter", id: "toeter"},
	{displayName: "Bamboozle", id: "bamboozle"},
	{displayName: "Scanner", id: "scanner"},
	{displayName: "Super<wbr>druk", id: "superdruk"},
	{displayName: "Frustratie", id: "frustratie"},
	{displayName: "Dijkstra", id: "dijkstra"},
	{displayName: "Fusering", id: "fusering"},
	{displayName: "Fusie", id: "fusie"},
	{displayName: "Internet", id: "internet"},
	{displayName: "ME_IRL", id: "me_irl"},
	{displayName: "Stoffer", id: "stoffer"},
	{displayName: "Plannen", id: "plannen"},
	{displayName: "Vis.", id: "vis"},
	{displayName: "Allergiën", id: "allergien"},
	{displayName: "Fluit", id: "fluit"},
	{displayName: "Burninator", id: "burninator"},
	{displayName: "Prisma", id: "primsa"},
	{displayName: "MAND", id: "mand"},
	{displayName: "Module", id: "module"},
	{displayName: "Versneller", id: "versneller"},
	];
	var newDisplayName;

	var n = 0;
	while(getOnlinePlayers() * 9 > nameOptions.length){
		nameOptions.push({displayName: n, id: n});
		n++;
	}

	while(true){

		var isDuplicate = false;
		newNameOption = nameOptions[Math.floor(nameOptions.length * Math.random())];
		newDisplayName = newNameOption.displayName;
		newId = newNameOption.id;

		for(var j = 0;j < elementStatus.length;j++){
			if(newDisplayName === elementStatus[j].displayName){
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
	var self = Task.generate(id, 0);

	//console.log(self);
	Player.list[id].health = 100;
	var socket = SOCKET_LIST[id];
	socket.emit('newTask', self);
	return self;
}

Task.generate = function(id){
	Player.list[id].health = 100;

	var rNumber = Math.floor(elementStatus.length * Math.random());
	randomElement = elementStatus[rNumber];

	var type = randomElement.elementType;
	var option;
	var displayName = randomElement.displayName;
	var switchId = randomElement.id;
	var message;

	if(type === "button"){
		option = 1;
		message = "Druk op " + displayName;
	}else if(type === "toggleSwitch"){
		if(getCurrentOption(switchId) === 1){
			option = 0;
			message = "Zet " + displayName + " uit";
		}else{
			option = 1;
			message = "Zet " + displayName + " aan";
		}
	}else if(type === "slider"){
		option = generateRandomNumberWithException(randomElement.optionCount, randomElement.oldOption);
		message = "Zet " + displayName + " op " + option;
	}

	var self = {
		playerId: id,
		displayMessage: message,
		id: switchId,
		type: type,
		option: option,
	}

	taskList.push(self);
	for(var i = 0;i<Player.list.length;i++){
		if(Player.list[i] === id){
			Player.list[i].health = 100;
		}
	}

	return self;
}

taskList = [];

Task.check = function(switchId, currentOption){
	for(var j = 0;j<taskList.length;j++){
		if(taskList[j].id === switchId && taskList[j].option == currentOption){
			Task.complete(j, taskList[j].playerId, currentOption);
		}
	}
}

Task.complete = function(arrayId, playerId, oldOption){
	taskList.splice(arrayId, 1);
	for(var i = 0;i<elementStatus.length;i++){
		if(elementStatus[i].playerId === playerId){
			elementStatus[i].oldOption = oldOption;
		}
	}
	newTask = Task.generate(playerId);
	var socket = SOCKET_LIST[playerId];
	socket.emit('newTask', newTask);
	totalCompleted+=1;
}

//When the health reaches 0 or below, execute this
Task.fail = function(arrayId){
	taskList.splice(arrayId, 1);
	totalFailed+=1;
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
		socket.emit('requestReply', getCurrentOption(switchId));
	});
});

setInterval(function(){
	//Creates a pack with all the data to be used by the client
	for(var i in SOCKET_LIST){
		var socket = SOCKET_LIST[i];
		//console.log(socket.id);
		/*console.log(Player(socket.id).health);*/
		var pack = {
			health:Player.updateHealth(socket.id),
			totalCompleted: totalCompleted,
			totalFailed: totalFailed,
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

function generateRandomNumberWithException(max, exception){
	var isDuplicate = true;
	while(true){
		var rNumber = Math.floor(max * Math.random());
		if(rNumber != exception){
			isDuplicate = false;
			return rNumber;
		}else{
			isDuplicate = true;
		}
	}
}

function getCurrentOption(switchId){
	for(var i = 0;i < elementStatus.length;i++){
			if(elementStatus[i].id === switchId){
				return elementStatus[i].currentOption;
			}
		}
}

function getOnlinePlayers(){
	return Object.keys(Player.list).length;
}