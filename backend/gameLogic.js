const {pushData} = require('./database');
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
            durationMS: (fishTypesIndex + 3) * 3000 + 5000
        }
    };
}

async function processHit(data) {
    const bullet = data.bullet
    const position = data.position;
    if (players[position] && players[position].balance >= bullet.bet) {
        players[position].balance -= bullet.bet; // Deduct the bet from the player's balance
        const fishes = data.fishes;
        if (fishes !== undefined) {
            const numOfFishes = fishes.length;
            const betPerFish = bullet.bet / numOfFishes;
            let fishResults = [];
            let winAmount = 0;
            for (let fish of fishes) {
                const result = hitResult(fish, betPerFish, position);
                winAmount += result.win;
                fishResults.push(result);
            }
            let resultMessage = {
                result: {
                    //Time with UTC format
                    time: new Date().toUTCString(),
                    hit: winAmount > 0,
                    transaction: {id: "TRX" + generateRandomString(6), bet: bullet.bet, win: winAmount},
                    fishes: fishResults,
                    bullet: bullet,
                    balance: players[position].balance,
                    position: position
                }
            };
            await pushData(resultMessage.result); // Save the result to the database
            //console.log(resultMessage)
            return resultMessage;
        }
    } else {
        //Error Handling
        console.log("Error: Player " + position + " does not have enough balance to bet " + bullet.bet);
        return null;
    }
}

function hitResult(fish, bet, position) {
    const fishIndex = fishTypes.indexOf(fish.type) + 1;
    const winMultiplier = (fishIndex * 2);
    const isCaught = Math.random() < 1 / winMultiplier;
    let winAmount = 0;
    if (isCaught) {
        winAmount = bet * winMultiplier;
        players[position].balance += winAmount; // Update the balance with the win amount
    }
    fish.win = winAmount;

    return fish
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

module.exports = {getFish, processHit, setBalance};