const WebSocket = require('ws');
const wss = new WebSocket.Server({port: 8080});
const { getFish, processHit, setBalance } = require('./gameLogic');
// 管理最多10個房間，每個房間2個位置
let rooms = Array.from({ length: 10 }, () => [null, null]);
wss.on('connection', function connection(ws) {
    let assigned = false;
    let roomIndex, positionIndex;

    for (let i = 0; i < rooms.length; i++) {
        positionIndex = rooms[i].indexOf(null);
        if (positionIndex !== -1) {
            roomIndex = i;
            rooms[i][positionIndex] = ws;
            assigned = true;
            break;
        }
    }

    if (!assigned) {
        ws.send(JSON.stringify({action: 'error', message: '所有房間已滿'}));
        ws.close();
        return;
    }

    console.log(`A client connected to room ${roomIndex + 1}, position ${positionIndex + 1}`);
    setBalance(positionIndex, 1000); // 設置玩家初始 balance
    ws.send(JSON.stringify({action: "setPosition", room: roomIndex, position: positionIndex, balance: 1000}));

    ws.on('close', function () {
        rooms[roomIndex][positionIndex] = null; // 釋放位置
        console.log(`Client disconnected from room ${roomIndex + 1}, position ${positionIndex + 1}`);
    });

    ws.on('message', function incoming(message) {
        const data = JSON.parse(message);
        if (data.action === 'hit') {
            processHit(data).then(result => {
                broadcastRoom(result, roomIndex); // 僅廣播到當前房間
            });
        } else {
            broadcastRoom(data, roomIndex); // 僅廣播到當前房間
        }
    });
});

function broadcastRoom(message, roomIndex) {
    rooms[roomIndex].forEach(client => {
        if (client && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

function broadcastAll(message) {
    rooms.forEach(room => {
        room.forEach(client => {
            if (client && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(message));
            }
        });
    });
}

// 示例全局廣播，比如有人中了大獎
function announceJackpot(winnerInfo) {
    broadcastAll({action: 'jackpot', message: `恭喜 ${winnerInfo.name} 中大獎!`});
}
// 每三秒检查并发送鱼的信息
setInterval(() => {
    const fishInfo = getFish();
    rooms.forEach(room => {
        // check if room has at least one player
        if (room.some(client => client !== null)) {
            broadcastRoom(fishInfo, rooms.indexOf(room));
        }
    });
}, 5000); // 3000毫秒间隔


