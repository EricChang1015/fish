const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

let positions = [null, null]; // 兩個位置，初始時都是空的

wss.on('connection', function connection(ws) {
    console.log('A client connected');
    const index = positions.indexOf(null);
    if (index !== -1) {
        positions[index] = ws; // 分配位置
        ws.send(JSON.stringify({ action: 'setPosition', position: index })); // 通知玩家其位置
    } else {
        ws.send(JSON.stringify({ action: 'error', message: '尚無空位' }));
        ws.close(); // 沒有位置時關閉連接
        return;
    }

    ws.on('close', function() {
        positions[index] = null; // 釋放位置
    });

    // 接收來自客戶端的訊息
    ws.on('message', function incoming(message) {
        console.log('received: %s', message);
		const data = JSON.parse(message);
        // 把訊息發送給所有連接的客戶端
        wss.clients.forEach(function each(client) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
            }
        });

        if (data.action === 'hit') {
            // 处理击中逻辑
            const result = processHit(data.fish, data.bullet);
            console.log('transaction:', result.result.transaction.id, 'hit:', result.result.hit, 'fish:', result.result.fish.id, 'bullet:', result.result.bullet.id);
            ws.send(JSON.stringify(result)); // 发送捕获结果
        }
    });
});


// 每三秒检查并发送鱼的信息
setInterval(() => {
    if (positions.some(position => position !== null)) {
        wss.clients.forEach(function each(client) {
            if (client.readyState === WebSocket.OPEN) {
                sendFish(client);
            }
        });
    }
}, 3000); // 3000毫秒间隔

function sendFish(ws) {
    const fishInfo = {
        action: "fish",
        fish: {
            type: "Fish_001",
            id: "f01_" + generateRandomString(6),
            x: 800,
            y: 300,
            angle: Math.random() * Math.PI * 2,
            speed: 0.5,
            timestamp: Date.now()
        }
    };
    ws.send(JSON.stringify(fishInfo));
}
function processHit(fish, bullet) {
    // 随机计算是否捕获鱼
    const isCaught = Math.random() < 1/3;
    return {
        result: {
            hit: isCaught,
            transaction: { id: "TRX" + generateRandomString(6) },
            fish: fish,
            bullet: bullet
        }
    };
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