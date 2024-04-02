const WebSocket = require('ws');
const wss = new WebSocket.Server({port: 8080});
const { getFish, processHit, setBalance } = require('./gameLogic');
let positions = [null, null]; // 兩個位置，初始時都是空的

wss.on('connection', function connection(ws) {
    console.log('A client connected');
    const index = positions.indexOf(null);
    if (index !== -1) {
        const defaultBalance = 1000;
        positions[index] = ws; // 分配位置
        setBalance(index, defaultBalance); // 設置玩家初始balance
        ws.send(JSON.stringify({action: 'setPosition', position: index})); // 通知玩家其位置
        ws.send(JSON.stringify({action: "setPosition", position: index, balance: defaultBalance}));
        const fishInfo = getFish();
        broadcast(fishInfo);
    } else {
        ws.send(JSON.stringify({action: 'error', message: '尚無空位'}));
        ws.close(); // 沒有位置時關閉連接
        return;
    }

    ws.on('close', function () {
        positions[index] = null; // 釋放位置
    });

    // 接收來自客戶端的訊息
    ws.on('message', async function incoming(message) {
        const data = JSON.parse(message);
        // 把訊息發送給所有連接的客戶端
        broadcast(data);
        if (data.action === 'hit') {
            broadcast(await processHit(data));
        }
    });
});

function broadcast(message) {
    if (message === null) return;
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
    }
}, 5000); // 3000毫秒间隔


