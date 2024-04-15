const { pushData } = require('./database');
const fishTypes = ["Fish_001", "Fish_002", "Fish_003", "Fish_004", "Fish_005"];
const pathIds = ["p01", "p02", "p03", "p04"];
let players = [{}, {}]; // 用來保存玩家的balance數據

function setBalance(position, balance) {
    players[position].balance = balance;
}
function getFish() {
    const xPosition = [0, 800];
    const yPosition = [100, 200, 300, 400, 500];
    const angleOffset = [0, 180];
    const xPositionIndex = Math.floor(Math.random() * xPosition.length)
    const yPositionIndex = Math.floor(Math.random() * yPosition.length)
    const fishTypesIndex = Math.floor(Math.random() * fishTypes.length)

    // angle
    // when x = 0, angle from +60% to -60%
    // when x = 800, angle from 120% to 240%
    return {
        action: "fish",
        fish: {
            // random from fishTypes
            type: fishTypes[fishTypesIndex],
            id: "f01_" + generateRandomString(6),
            x: xPosition[xPositionIndex],
            y: yPosition[yPositionIndex],
            pathId: pathIds[Math.floor(Math.random() * pathIds.length)],
            angle: (Math.random() * 120 - 60 + angleOffset[xPositionIndex]) / 180 * Math.PI, // -60 to 60 degree
            speed: 0.5,
            timestamp: Date.now(),
            durationMS: (fishTypesIndex + 1) * 5000
        }
    };
}
async function processHit(data) {
    const fish = data.fish
    const bullet = data.bullet
    const position = data.position;
    const bet = bullet.bet;
    if (players[position] && players[position].balance >= bet) {
        players[position].balance -= bet; // Deduct the bet from the player's balance
        // 随机计算是否捕获鱼
        const fishIndex =  fishTypes.indexOf(fish.type) + 1;
        const isCaught = Math.random() < 1 / (fishIndex * 2);
        let winAmount = 0;
        if (isCaught) {
            winAmount = bet * (fishIndex + 2);
            players[position].balance += winAmount; // Update the balance with the win amount
        }

        let resultMessage = {
            result: {
                //Time with UTC format
                time: new Date().toUTCString(),
                hit: isCaught,
                transaction: {id: "TRX" + generateRandomString(6), bet:bet, win: winAmount},
                fish: fish,
                bullet: bullet,
                balance: players[position].balance,
                position: position
            }
        };
        await pushData(resultMessage.result); // Save the result to the database
        console.log(resultMessage)
        return resultMessage;
    } else {
        //Error Handling
        console.log("Error: Player " + position + " does not have enough balance to bet " + bet);
        return null;
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

module.exports = { getFish, processHit, setBalance };