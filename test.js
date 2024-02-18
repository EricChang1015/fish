const WebSocket = require('ws');
const wss = new WebSocket.Server({port: 8080});

let positions = [null, null]; // 兩個位置，初始時都是空的
let players = [{}, {}]; // 用來保存玩家的balance數據

wss.on('connection', function connection(ws) {
    console.log('A client connected');
    const index = positions.indexOf(null);
    if (index !== -1) {
        positions[index] = ws; // 分配位置
        players[index].balance = 1000; // 初始化玩家的balance
        ws.send(JSON.stringify({action: 'setPosition', position: index})); // 通知玩家其位置
        ws.send(JSON.stringify({action: "setPosition", position: index, balance: players[index].balance}));
    } else {
        ws.send(JSON.stringify({action: 'error', message: '尚無空位'}));
        ws.close(); // 沒有位置時關閉連接
        return;
    }

    ws.on('close', function () {
        positions[index] = null; // 釋放位置
    });

    // 接收來自客戶端的訊息
    ws.on('message', function incoming(message) {
        const data = JSON.parse(message);
        // 把訊息發送給所有連接的客戶端
        broadcast(data);
        // wss.clients.forEach(function each(client) {
        //     if (client !== ws && client.readyState === WebSocket.OPEN) {
        //         client.send(JSON.stringify(data));
        //     }
        // });

        if (data.action === 'hit') {
            processHit(ws, data);
        }
    });
});

function broadcast(message) {
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

// 每三秒检查并发送鱼的信息
setInterval(() => {
    if (positions.some(position => position !== null)) {
        const fishInfo = getFish();
        broadcast(fishInfo);
        // wss.clients.forEach(function each(client) {
        //     if (client.readyState === WebSocket.OPEN) {
        //         client.send(JSON.stringify(fishInfo));
        //     }
        // });
    }
}, 3000); // 3000毫秒间隔

function getFish() {
    const fishTypes = ["Fish_001", "Fish_002"];
    const xPosition = [0, 800];
    const angleOffset = [0, 180];
    const positionIndex = Math.floor(Math.random() * xPosition.length)

    // angle
    // when x = 0, angle from +60% to -60%
    // when x = 800, angle from 120% to 240%
    return {
        action: "fish",
        fish: {
            // random from fishTypes
            type: fishTypes[Math.floor(Math.random() * fishTypes.length)],
            id: "f01_" + generateRandomString(6),
            x: xPosition[positionIndex],
            y: 300,
            angle: (Math.random() * 120 - 60 + angleOffset[positionIndex]) / 180 * Math.PI, // -60 to 60 degree
            speed: 0.5,
            timestamp: Date.now()
        }
    };
}

function processHit(ws, data) {
    const fish = data.fish
    const bullet = data.bullet
    const position = data.position;
    const bet = bullet.bet;
    if (players[position] && players[position].balance >= bet) {
        players[position].balance -= bet; // Deduct the bet from the player's balance
        // 随机计算是否捕获鱼
        const isCaught = Math.random() < 1 / 3;
        let winAmount = 0;
        if (isCaught) {
            winAmount = bet * 3;
            players[position].balance += winAmount; // Update the balance with the win amount
        }

        let resultMessage = {
            result: {
                hit: isCaught,
                transaction: {id: "TRX" + generateRandomString(6), bet:bet, win: winAmount},
                fish: fish,
                bullet: bullet,
                balance: players[position].balance,
                position: position
            }
        };
        console.log(resultMessage);
        //ws.send(JSON.stringify(resultMessage)); // 发送捕获结果
        broadcast(resultMessage);
    } else {
        //Error Handling
        console.log("Error: Player " + position + " does not have enough balance to bet " + bet);
    }
}

function generateRandomString(length) {
    let result = '';
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}