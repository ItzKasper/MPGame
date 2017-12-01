//app.js
var express = require('express');
var app = express();
var serv = require('http').Server(app);
 
app.get('/',function(req, res) {
    res.sendFile(__dirname + '/client/index.html');
});
app.use('/client',express.static(__dirname + '/client'));
 
serv.listen(2000);
console.log("Server started.");
 
var SOCKET_LIST = {};
 
var Entity = function(){
    var self = {
        x:250,
        y:250,
        spdX:0,
        spdY:0,
        id:"",
    }
    self.update = function(){
        self.updatePosition();
    }
    self.updatePosition = function(){
        self.x += self.spdX;
        self.y += self.spdY;
    }
    return self;
}
 
var Player = function(id){
    var self = Entity();
    self.id = id;
    self.number = "" + Math.floor(10 * Math.random());
    self.pressingRight = false;
    self.pressingLeft = false;
    self.pressingUp = false;
    self.pressingDown = false;
    self.maxSpd = 10;
   
    var super_update = self.update;
    self.update = function(){
        self.updateSpd();
        super_update();
    }
   
   
    self.updateSpd = function(){
        if(self.pressingRight)
            self.spdX = self.maxSpd;
        else if(self.pressingLeft)
            self.spdX = -self.maxSpd;
        else
            self.spdX = 0;
       
        if(self.pressingUp)
            self.spdY = -self.maxSpd;
        else if(self.pressingDown)
            self.spdY = self.maxSpd;
        else
            self.spdY = 0;     
    }
    Player.list[id] = self;
    return self;
}
Player.list = {};
Player.onConnect = function(socket){
    var player = Player(socket.id);
    socket.on('keyPress',function(data){
        if(data.inputId === 'left')
            player.pressingLeft = data.state;
        else if(data.inputId === 'right')
            player.pressingRight = data.state;
        else if(data.inputId === 'up')
            player.pressingUp = data.state;
        else if(data.inputId === 'down')
            player.pressingDown = data.state;
    });
}
Player.onDisconnect = function(socket){
    delete Player.list[socket.id];
}
Player.update = function(){
    var pack = [];
    for(var i in Player.list){
        var player = Player.list[i];
        player.update();
        pack.push({
            x:player.x,
            y:player.y,
            number:player.number
        });    
    }
    return pack;
}
 
 
var Bullet = function(angle){
    var self = Entity();
    self.id = Math.random();
    self.spdX = Math.cos(angle/180*Math.PI) * 10;
    self.spdY = Math.sin(angle/180*Math.PI) * 10;
   
    self.timer = 0;
    self.toRemove = false;
    var super_update = self.update;
    self.update = function(){
        if(self.timer++ > 100)
            self.toRemove = true;
        super_update();
    }
    Bullet.list[self.id] = self;
    return self;
}
Bullet.list = {};
 
Bullet.update = function(){
    if(Math.random() < 0.1){
        Bullet(Math.random()*360);
    }
   
    var pack = [];
    for(var i in Bullet.list){
        var bullet = Bullet.list[i];
        bullet.update();
        pack.push({
            x:bullet.x,
            y:bullet.y,
        });    
    }
    return pack;
}
 
var io = require('socket.io')(serv,{});
io.sockets.on('connection', function(socket){
    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;
   
    Player.onConnect(socket);
   
    socket.on('disconnect',function(){
        delete SOCKET_LIST[socket.id];
        Player.onDisconnect(socket);
    });
   
   
   
   
});
 
setInterval(function(){
    var pack = {
        player:Player.update(),
        bullet:Bullet.update(),
    }
   
    for(var i in SOCKET_LIST){
        var socket = SOCKET_LIST[i];
        socket.emit('newPositions',pack);
    }
},1000/25);
 
 
 
//index.html
<canvas id="ctx" width="500" height="500" style="border:1px solid #000000;"></canvas>
 
<script src="https://cdn.socket.io/socket.io-1.4.5.js"></script>
<script>
    var ctx = document.getElementById("ctx").getContext("2d");
    ctx.font = '30px Arial';
   
    var socket = io();
       
    socket.on('newPositions',function(data){
        ctx.clearRect(0,0,500,500);
        for(var i = 0 ; i < data.player.length; i++)
            ctx.fillText(data.player[i].number,data.player[i].x,data.player[i].y);     
           
        for(var i = 0 ; i < data.bullet.length; i++)
            ctx.fillRect(data.bullet[i].x-5,data.bullet[i].y-5,10,10);     
    });
 
    document.onkeydown = function(event){
        if(event.keyCode === 68)    //d
            socket.emit('keyPress',{inputId:'right',state:true});
        else if(event.keyCode === 83)   //s
            socket.emit('keyPress',{inputId:'down',state:true});
        else if(event.keyCode === 65) //a
            socket.emit('keyPress',{inputId:'left',state:true});
        else if(event.keyCode === 87) // w
            socket.emit('keyPress',{inputId:'up',state:true});
           
    }
    document.onkeyup = function(event){
        if(event.keyCode === 68)    //d
            socket.emit('keyPress',{inputId:'right',state:false});
        else if(event.keyCode === 83)   //s
            socket.emit('keyPress',{inputId:'down',state:false});
        else if(event.keyCode === 65) //a
            socket.emit('keyPress',{inputId:'left',state:false});
        else if(event.keyCode === 87) // w
            socket.emit('keyPress',{inputId:'up',state:false});
    }
   
</script>