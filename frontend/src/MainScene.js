import {config} from './config.js';
import * as utils from './utility.js';

class MainScene extends Phaser.Scene {
    constructor() {
        super();

        this.path01 = [-10, 200, 164, 146, 274, 242, 412, 157, 522, 241, 664, 164, 810, 240, 1000, 240];
        this.path02 = [810, 340, 664, 464, 522, 341, 412, 457, 274, 342, 164, 446, -10, 350, -200, 350];
        this.path03 = [100, 0, 150, 100, 200, 250, 250, 400, 300, 450, 375, 470, 450, 450, 500, 400, 550, 250, 600, 100, 750, 0, 750, -200];
        this.path04 = [810, 500, 700, 300, 600, 200, 400, 100, 200, 200, 100, 300, -10, 500, -200, 500]

        // 预定义的路径
        this.paths = {
            p01: new Phaser.Curves.Path(this.path01[0], this.path01[1]).splineTo(this.path01.slice(2)),
            p02: new Phaser.Curves.Path(this.path02[0], this.path02[1]).splineTo(this.path02.slice(2)),
            p03: new Phaser.Curves.Path(this.path03[0], this.path03[1]).splineTo(this.path03.slice(2)),
            p04: new Phaser.Curves.Path(this.path04[0], this.path04[1]).splineTo(this.path04.slice(2)),
        };
    }

    preload() {
        this.load.image('undersea', 'public/assets/img/bg.jpg');
        this.load.image('coral', 'public/assets/img/seabed.png');
        this.load.image('cannon_head', 'public/assets/img/cannon_head.png');
        this.load.image('cannon_body', 'public/assets/img/cannon_body.png');
        this.load.image('cursor', 'public/assets/img/cursor.png');
        this.load.image('aim', 'public/assets/img/aim.png');
        this.load.image('bullet', 'public/assets/img/bullet.png');
        this.load.audioSprite('sfx', 'public/assets/audio/fx_mixdown.json', [
            'public/assets/audio/fx_mixdown.ogg',
            'public/assets/audio/fx_mixdown.mp3'// for iphone
        ]);

        // 加载鱼的动画
        this.load.atlas('sea', 'public/assets/animations/seacreatures_json.png', 'public/assets/animations/seacreatures_json.json');
        // 加载爆炸动画
        this.load.spritesheet('boom', 'public/assets/animations/explosion.png', { frameWidth: 64, frameHeight: 64, endFrame: 23 });

        this.load.on('loaderror', (file) => {
            console.error('Error loading:', file.key);
        });
    }

    create() {
        this.sound.volume = 0.05;//降低音量
        this.add.image(400, 300, 'undersea');
        this.add.image(0, 466, 'coral').setOrigin(0);
        // for aimed object.
        this.customCursor = this.add.sprite(0, 0, 'aim').setScale(1).setDepth(1000).setVisible(false);
        this.input.setDefaultCursor(`url('public/assets/img/cursor.png'), pointer`);

        // 初始化炮台，鱼，和子弹的组
        this.cannon1Head = this.add.image(100, config.height - 48, 'cannon_head').setDepth(1);
        this.cannon2Head = this.add.image(config.width - 100, config.height - 48, 'cannon_head').setDepth(1);
        this.add.image(100, config.height, 'cannon_body').setDepth(1);
        this.add.image(config.width - 100, config.height, 'cannon_body').setDepth(1);

        this.playerPosition = 1; // 玩家位置：0为左侧，1为右侧
        this.cannon = this.cannon2Head; // 初始炮台位置
        this.cannonOpposite = this.cannon1Head;

        this.cannon1Balance = 0;
        this.cannon2Balance = 0;
        this.cannonBalanceText = [
            this.add.text(150, 560, `Balance: ${this.cannon1Balance}`, this.getTextStyle()),
            this.add.text(500, 560, `Balance: ${this.cannon2Balance}`, this.getTextStyle())
        ];
        this.RoomText = this.add.text(0, 0, `RoomId: `, this.getTextStyle(false));
        this.add.text(0, 20, `F Version: ${config.version}`, this.getTextStyle(false));
        this.add.text(0, 40, `B Version: `, this.getTextStyle(false));

        this.fishes = this.physics.add.group();
        this.bullets = this.physics.add.group();
        this.lastFired = 0;

        this.input.on('pointermove', (pointer) => {
            this.cannon = this.playerPosition === 0 ? this.cannon1Head : this.cannon2Head;
            this.cannon.rotation = Phaser.Math.Angle.BetweenPoints(this.cannon, pointer);
        });

        this.betAmountIndex = 0; // Ensure this is set before using in updateBetDisplay
        this.betAmountText = this.add.text(300, 40, `Bet: ${config.betAmounts[this.betAmountIndex]}`,this.getTextStyle());

        this.createAnimations();
        this.drawRoutes()
        this.createControlButtons();

        this.boom = this.add.sprite(0, 0, 'boom').setScale(1).setVisible(false);

        this.input.on('pointerdown', (pointer, gameObjects) => {
            if (gameObjects.length > 0 && gameObjects[0].getData('isFish') === true) {
                let fish = gameObjects[0]; // Get the first clicked object which should be a fish
                if (this.autoShootEnabled) {
                    this.fishes.getChildren().forEach(fish => fish.setData('autoShoot', false));
                    console.log('auto shoot enabled fish.id:' + fish.getData('id'));
                    fish.setData('autoShoot', true);
                } else {
                    this.lastFired = this.time.now;
                    this.shootBullet(pointer, fish);
                }
            } else {
                // 避免click 到toggle button發射子彈
                if (gameObjects.length === 0) {
                    this.lastFired = this.time.now;
                    this.shootBullet(pointer);
                }
            }
        });
        this.websocketHandler();
    }

    getTextStyle(background = true) {
        return {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#ffffff',
            padding: {left: 10, right: 10, top: 5, bottom: 5},
            backgroundColor: background ? '#00aaff' : undefined
        };
    }

    createAnimations() {
        this.anims.create({ key: 'Fish_001', frames: this.anims.generateFrameNames('sea', { prefix: 'blueJellyfish', end: 32, zeroPad: 4 }), repeat: -1 });
        this.anims.create({ key: 'Fish_002', frames: this.anims.generateFrameNames('sea', { prefix: 'crab1', end: 25, zeroPad: 4 }), repeat: -1 });
        this.anims.create({ key: 'Fish_003', frames: this.anims.generateFrameNames('sea', { prefix: 'octopus', end: 24, zeroPad: 4 }), repeat: -1 });
        this.anims.create({ key: 'Fish_004', frames: this.anims.generateFrameNames('sea', { prefix: 'purpleFish', end: 20, zeroPad: 4 }), repeat: -1 });
        this.anims.create({ key: 'Fish_005', frames: this.anims.generateFrameNames('sea', { prefix: 'stingray', end: 23, zeroPad: 4 }), repeat: -1 });
        this.anims.create({ key: 'explode', frames: 'boom', frameRate: 20, showOnStart: true, hideOnComplete: true});
    }

    drawRoutes() {
        const graphics = this.add.graphics();
        graphics.lineStyle(1, 0xffffff, 1);

        if (config.physics.arcade.debug) {
            ['p01', 'p02', 'p03', 'p04'].forEach(path => this.paths[path].draw(graphics, 128));
        }
    }

    createControlButtons() {
        this.autoShootEnabled = false;
        const button = this.add.text(300, 20, 'Auto Shoot: OFF', this.getTextStyle()).setOrigin(0.5).setInteractive({useHandCursor: true});
        button.on('pointerdown', () => {
            this.autoShootEnabled = !this.autoShootEnabled;
            button.setText(`Auto Shoot: ${this.autoShootEnabled ? 'ON' : 'OFF'}`);
            if (this.autoShootEnabled) {
                this.startAutoShooting();
            } else {
                this.autoShootTimer.remove(false);
            }
        });
        button.setData('button', true);

        this.bulletType = 'bullet';
        const toggleBulletTypeButton = this.add.text(500, 20, 'Change Bullet: NORMAL', this.getTextStyle()).setInteractive({useHandCursor: true}).setOrigin(0.5);
        toggleBulletTypeButton.on('pointerdown', () => {
            const bulletTypes = ['bullet', 'laser', 'missile']; // Add 'missile' as a new type
            let currentIndex = bulletTypes.indexOf(this.bulletType);
            this.bulletType = bulletTypes[(currentIndex + 1) % bulletTypes.length]; // Cycle through bullet types
            toggleBulletTypeButton.setText(`Change Bullet: ${this.bulletType.toUpperCase()}`);
        });
        toggleBulletTypeButton.setData('button', true);

        // Decrease bet button
        const decreaseBetButton = this.add.text(230, 40, '-', this.getTextStyle()).setInteractive({useHandCursor: true});
        decreaseBetButton.on('pointerdown', () => {
            if (this.betAmountIndex === 0) {
                this.betAmountIndex = config.betAmounts.length - 1; // Loop to the last amount
            } else {
                this.betAmountIndex--;
            }
            this.updateBetDisplay();
        });

        // Increase bet button
        const increaseBetButton = this.add.text(260, 40, '+', this.getTextStyle()).setInteractive({useHandCursor: true});
        increaseBetButton.on('pointerdown', () => {
            if (this.betAmountIndex === config.betAmounts.length - 1) {
                this.betAmountIndex = 0; // Loop back to the first amount
            } else {
                this.betAmountIndex++;
            }
            this.updateBetDisplay();
        });
    }

    updateBetDisplay() {
        if (this.betAmountText) { // Check if betAmountText is initialized
            this.betAmountText.setText(`Bet: ${config.betAmounts[this.betAmountIndex]}`);
        } else {
            console.error('betAmountText is not initialized');
        }
    }

    websocketHandler() {
        let _this = this;
        const backend = config.release === true ? config.backend : config.backendTest;
        let ws = new WebSocket(backend);
        ws.onopen = function () {
            console.log('WebSocket connection established');
        };
        ws.onmessage = function (event) {
            let data = JSON.parse(event.data);
            if (data.result !== undefined) {
                if (data.result.hit) {
                    // 從fishes群組中獲取所有魚的數組
                    let fishesArray = _this.fishes.getChildren();
                    for (let hitFish of data.result.fishes) {
                        // 查找id匹配的魚
                        let foundFish = fishesArray.find(fish => fish.getData('id') === hitFish.id);
                        if (foundFish) {
                            // 播放音效
                            _this.sound.playAudioSprite('sfx', 'death');
                            // 显示获胜金额
                            let winText = _this.add.text(foundFish.x, foundFish.y, `+${data.result.transaction.win}`, {
                                fontSize: '20px',
                                fill: '#dabb0d'
                            });
                            winText.setOrigin(0.5, 0.5); // 使文本居中显示
                            // 使文本在一段时间后消失
                            _this.tweens.add({
                                targets: winText,
                                alpha: {from: 1, to: 0},
                                ease: 'Linear', // 线性变化
                                duration: 1000, // 持续时间为1000毫秒
                                onComplete: () => {
                                    winText.destroy(); // 文本消失后销毁文本对象
                                }
                            });
                            _this.showCaptureAnimation(foundFish);
                        } else {
                            // 如果沒有找到匹配的魚
                            console.log('mismatch');
                        }
                    }

                }
                // update balance of player
                {
                    let position = data.result.position;
                    let balance = data.result.balance;
                    _this[`cannon${position === 0 ? '1' : '2'}Balance`] = balance;
                    _this.cannonBalanceText[position].setText(`Balance: ${balance}`);
                }
                return;
            }
            switch (data.action) {
                case 'setPosition':
                    //{"action":"setPosition","room":0,"position":0,"balance":1000}
                    const positionKey = data.position === 0 ? '1' : '2';
                    _this.RoomText.setText(`RoomId: ${data.room}`);
                    _this.playerPosition = data.position;
                    _this.cannon = this[`cannon${positionKey}Head`];
                    _this.cannonOpposite = this[`cannon${positionKey === '1' ? '2' : '1'}Head`];
                    _this[`cannon${positionKey}Balance`] = data.balance;
                    _this.cannonBalanceText[data.position].setText(`Balance: ${data.balance}`);
                    break;
                case 'fireBullet': { // 接收新的炮弹数据并添加到bullets数组中
                    // here, only show other's bullet
                    if (data.position !== _this.playerPosition) {
                        _this.showBullet(data, data.bullet.targetFishId);
                    }
                }
                    break;
                case 'fish': // 添加鱼到数组
                    _this.addFleet(data.fish);
                    break;

                case 'error':
                    alert(data.message); // 显示错误消息
                    break;
            }
        };
        this.ws = ws;
    }

    update() {
        // Existing update logic...
        const pointer = this.input.activePointer;
        if (pointer.isDown) {
            let time = this.time.now;
            const delayTime = this.bulletType === 'laser' ? 20 : (this.bulletType === 'bullet' ? 200 : 1500);
            // 如果鼠标按下，发射子弹, 最快每秒5次
            if (time - this.lastFired > delayTime) { // 200ms between shots, so 5 shots per second
                let needFire = true;
                this.children.list.forEach((child) => {
                    if (needFire === true && child.getBounds && pointer.isDown) {
                        const bounds = child.getBounds();
                        if (bounds.contains(pointer.x, pointer.y)) {
                            if (child.getData('isFish')) {
                                this.shootBullet(pointer, child);
                                needFire = false;
                            } else if (child.getData('button')){
                                needFire = false
                            }
                        }
                    }
                });
                if (needFire) this.shootBullet(pointer);
                this.lastFired = time;
            }
        } else if (this.autoShootEnabled && this.fishes.getChildren().length > 0) {
            // 鎖定魚隻, 只取一隻
            let target = this.fishes.getChildren().find(fish => fish.getData('autoShoot'));
            if (target) {
                let positionX = target.x;
                let positionY = target.y;
                // if target fish not in active window, then set autoShoot to false
                if (target && (positionX <= 10 || positionX >= config.width - 10 || positionY <= 10 || positionY >= config.height - 10)) {
                    target.setData('autoShoot', false);
                    this.customCursor.setVisible(false);
                } else {
                    this.customCursor.setPosition(positionX, positionY);
                    this.customCursor.setDepth(1000);
                    this.customCursor.setVisible(true);
                    this.cannon.rotation = Phaser.Math.Angle.Between(this.cannon.x, this.cannon.y, positionX, positionY);
                }
            } else {
                this.customCursor.setVisible(false);
            }
        }

        this.updateBullets();

        for (const fish of this.fishes.getChildren()) {
            if (Date.now() >= fish.getData('timestamp') + fish.getData('durationMS') && fish.active) {
                if (fish.getData('autoShoot')) {
                    this.customCursor.setVisible(false);
                }
                fish.destroy();
            }
        }
    }

    showCaptureAnimation(fish) {
        fish.stopFollow(); // 停止沿路径移动
        //this.boom.setDepth(999).copyPosition(fish.body.position).play('explode');
        this.fishes.remove(fish);
        this.tweens.add({
            targets: fish, // 目标是被击中的鱼
            scale: {from: fish.scale, to: fish.scale * 1.5},
            alpha: {from: 1, to: 0},
            ease: 'Linear',
            duration: 100, // 持续时间100毫秒
            repeat: 3, // 重复5次，总共闪烁5次
            yoyo: true, // 完成一个动画周期后，再反向运行回到初始状态，实现闪烁
            onComplete: () => {
                if (fish.getData('autoShoot')) {
                    this.customCursor.setVisible(false);
                }
                fish.destroy(); // 所有闪烁完成后，销毁鱼对象
            }
        });
    }

    // 當需要添加一組魚時
    addFleet(data) {
        // random number from 3 to 10
        let weight = 1;
        switch (data.type) {
            case 'Fish_001':
                weight = 5;
                break;
            case 'Fish_002':
                weight = 4;
                break;
            case 'Fish_003':
                weight = 3;
                break;
            case 'Fish_004':
                weight = 2;
                break;
            case 'Fish_005':
                weight = 1;
                break;
        }
        const min = 3;
        const max = weight * 2 + min;
        const fleetSize = utils.pseudoRandom(min, max, data.id);
        for (let i = 1; i <= fleetSize; i++) {
            this.addFish(data, i);
        }
    }

    addFish(data, fleetId = 1) {
        // 根據 data 中的 pathId 選擇路徑
        let path = this.paths[data.pathId];
        let fishId = data.id + '.' + fleetId;
        if (!path) {
            console.error(`Path ${data.pathId} not found.`);
            return;
        }
        // 計算魚的初始位置和角度
        let offsetX = this.paths[data.pathId].startPoint.x, offsetY = this.paths[data.pathId].startPoint.y;
        let radius = 50; // 圍繞中心魚的半徑
        if (fleetId > 3) {
            radius += 50;
        }
        if (fleetId !== 1) { // 不是中心魚時，計算偏移
            // Random angle
            let angle = Phaser.Math.DegToRad(utils.pseudoRandom(0, 360, fishId));
            offsetX += Math.cos(angle) * radius;
            offsetY += Math.sin(angle) * radius;
        }

        // 創建帶有動畫的魚
        let fish = this.add.follower(path, offsetX, offsetY, 'seacreatures');
        let randomScale = utils.pseudoRandom(4, 8, fishId)
        fish.scale = randomScale / 10;

        // 向右移動
        if ((data.pathId === 'p01') || (data.pathId === 'p03')) {
            fish.scaleX *= -1;
        }

        fish.startFollow({
            positionOnPath: false, //需要設定初始位置
            duration: data.durationMS, // 鱼沿着路径移动所需的时间（毫秒）
            yoyo: false, // 如果想要鱼移动到路径末端然后返回，设置为 true
            rotateToPath: false, // 自动旋转鱼以匹配路径方向
            verticalAdjust: true, // 如果需要，可以调整鱼的垂直对齐
            repeat: 0, // 重复0次
            onComplete: () => {
                if (fish.getData('autoShoot')) {
                    this.customCursor.setVisible(false);
                }
                fish.destroy(); // 所有闪烁完成后，销毁鱼对象
            }
        }).play(data.type);

        fish.setInteractive();
        fish.on('pointerover', () => {
            fish.setTint(0xff0000);
        });
        fish.on('pointerout', () => {
            fish.clearTint();
        });

        this.fishes.add(fish);
        fish.setData('isFish', true);
        fish.setData('type', data.type);
        fish.setData('speed', data.speed);
        fish.setData('id', fishId); // 使用 fleetId 修改 ID
        fish.setData('previousX', data.x);
        fish.setData('previousY', data.y);
        fish.setData('timestamp', data.timestamp);
        fish.setData('durationMS', data.durationMS);
        fish.setData('pathId', data.pathId);
        fish.body.mass = config.fishMass;
        fish.body.setSize(1, 1);
        fish.body.onWorldBounds = true;
    }

    startAutoShooting() {
        console.log('start auto shooting');
        this.autoShootTimer = this.time.addEvent({
            delay: 10, // 200 ms between shots
            callback: () => {
                let time = this.time.now;
                const delayTime = this.bulletType === 'bullet' ? 200 : 20;
                // 如果鼠标按下，发射子弹, 最快每秒5次
                if (time - this.lastFired < delayTime) {
                    return;
                }
                if (!this.autoShootEnabled) {
                    console.log('stop auto shooting')
                    this.autoShootTimer.remove(false);
                    return;
                }
                let target = this.fishes.getChildren().find(fish => fish.getData('autoShoot'));
                if (target !== undefined) {
                    this.lastFired = time;
                    this.shootBullet(target, target);
                }
            },
            loop: true
        });
    }

    shootBullet(pointer, targetFish = null) {
        const betAmount = config.betAmounts[this.betAmountIndex];
        if (!this.hasSufficientBalance(betAmount)) return;
        this.deductBetAmount(betAmount)

        const bulletId = utils.generateRandomString(12);
        let bullet = this.bullets.create(this.cannon.x, this.cannon.y, 'bullet');
        let targetX = pointer.x;
        let targetY = pointer.y;

        if (this.bulletType === 'missile') {
            bullet.setDisplaySize(200, 200);
            if (targetFish) {
                // 如果有目标鱼，则飞向目标鱼
                targetX = targetFish.x;
                targetY = targetFish.y;
                this.physics.moveToObject(bullet, targetFish, config.bulletSpeed);
            } else {
                // 没有目标鱼，则飞向点击位置
                let target = new Phaser.GameObjects.Sprite(this, pointer.x, pointer.y);
                this.physics.moveToObject(bullet, target, config.bulletSpeed);
                target.destroy();
            }

            // 设置一个定时器来模拟导弹飞行时间并在到达后爆炸
            this.time.delayedCall(500, () => {
                this.explosionEffect(bullet, targetX, targetY);
            }, [], this);
        } else if (this.bulletType === 'laser') {
            bullet.setTint(0x00ff00);
            bullet.setDisplaySize(50, 50);
        } else {
            bullet.setDisplaySize(100, 100);
        }
        // set the rotation of the bullet to pointer
        bullet.rotation = this.physics.moveToObject(bullet, { x: targetX, y: targetY }, config.bulletSpeed);
        bullet.body.mass = config.bulletMass;
        bullet.setData('id', bulletId);
        bullet.setData('betAmount', betAmount); // Store the bet amount with the bullet
        bullet.setData('position',this.playerPosition);
        const bulletLifetime = 5000; // 5 seconds
        bullet.setData('lifetime', this.time.now + bulletLifetime);
        // 子弹的碰撞检测
        if (this.bulletType !== 'missile') {
            this.physics.add.collider(bullet, this.fishes, this.hitFish, null, this);
        }

        // 播放音效
        this.sound.playAudioSprite('sfx', 'shot');

        let data = {
            type: this.bulletType,
            x: targetX,
            y: targetY,
            angle: bullet.rotation,
            speed: config.bulletSpeed,
            timestamp: Date.now(),
            id: bulletId
        };
        if (targetFish !== null && targetFish !== undefined) {
            bullet.targetFish = targetFish;  // 将目标鱼设置为子弹的属性
            data.targetFishId = targetFish.getData('id');
        }
        this.ws.send(JSON.stringify({action: 'fireBullet', bullet: data, position: this.playerPosition,}));
    }

    hasSufficientBalance(betAmount) {
        const currentBalance = this.playerPosition === 0 ? this.cannon1Balance : this.cannon2Balance;
        if (currentBalance < betAmount) {
            console.log('Insufficient balance to fire bullet.');
            return false;
        }
        return true;
    }

    deductBetAmount(betAmount) {
        // Pre-deduct the bet amount from the player's balance
        if (this.playerPosition === 0) {
            this.cannon1Balance -= betAmount;
            this.cannonBalanceText[0].setText(`Balance: ${this.cannon1Balance}`);
        } else {
            this.cannon2Balance -= betAmount;
            this.cannonBalanceText[1].setText(`Balance: ${this.cannon2Balance}`);
        }
    }

    // Add a method to periodically check for bullets that have not hit and are no longer active
    updateBullets() {
        this.bullets.getChildren().forEach(bullet => {
            if (bullet.targetFish) {
                let targetFish = this.fishes.getChildren().find(fish => fish.getData('id') === bullet.targetFish.getData('id'));
                // 检查目标鱼是否已经不存在
                if (targetFish == null) {
                    bullet.targetFish = null;  // 目标丢失，子弹恢复默认行为
                } else {
                    this.physics.moveToObject(bullet, bullet.targetFish, config.bulletSpeed);
                }
            }

            // Check if the bullet has exceeded its lifetime or has moved off-screen
            const isOffScreen = bullet.x < 0 || bullet.x > config.width || bullet.y < 0 || bullet.y > config.height;
            if (this.time.now > bullet.getData('lifetime') || isOffScreen) {
                bullet.active = false; // Manually set the bullet to inactive
            }

            // Now, check the bullet's custom active state for refund logic
            if (!bullet.active) {
                // Refund logic...
                const betAmount = bullet.getData('betAmount');
                if (this.playerPosition === 0) {
                    this.cannon1Balance += betAmount;
                    this.cannonBalanceText[0].setText(`Balance: ${this.cannon1Balance}`);
                } else {
                    this.cannon2Balance += betAmount;
                    this.cannonBalanceText[1].setText(`Balance: ${this.cannon2Balance}`);
                }
                bullet.destroy(); // Remove the bullet from the game
            }
        });
    }

    explosionEffect(bullet, x, y, shoot = true) {
        // 爆炸效果
        const radius = 100;
        const affectedFishes = this.fishes.getChildren().filter(fish => {
            return Phaser.Math.Distance.Between(fish.x, fish.y, x, y) <= radius;
        });

        if (shoot) {
            this.hitFishes(bullet, affectedFishes);
        } else {
            bullet.destroy();
        }
        // 播放爆炸动画
        this.add.sprite(x, y, 'boom').setScale(5).play('explode');
    }

    showBullet(data, targetFishId = null) {
        let rotation = data.bullet.angle;
        let speed = config.bulletSpeed;
        this.cannonOpposite = this.playerPosition === 0 ? this.cannon2Head : this.cannon1Head;
        // 发射子弹
        let bullet = this.bullets.create(this.cannonOpposite.x, this.cannonOpposite.y, 'bullet');
        let targetX = data.bullet.x;
        let targetY = data.bullet.y;
        let targetFish = (targetFishId !== null) ? this.fishes.getChildren().find(fish => fish.getData('id') === targetFishId) : null;

        console.log('data.bullet.x:', data.bullet.x, 'data.bullet.y:', data.bullet.y);
        console.log('targetFish:', targetFish);

        if (data.bullet.type === 'missile') {
            bullet.setDisplaySize(200, 200);
            if (targetFish) {
                // 如果有目标鱼，则飞向目标鱼
                targetX = targetFish.x;
                targetY = targetFish.y;
                this.physics.moveToObject(bullet, targetFish, config.bulletSpeed);
            } else {
                // 没有目标鱼，则飞向点击位置
                let target = new Phaser.GameObjects.Sprite(this, targetX, targetY);
                this.physics.moveToObject(bullet, target, config.bulletSpeed);
                target.destroy();
            }
            // 设置一个定时器来模拟导弹飞行时间并在到达后爆炸
            this.time.delayedCall(500, () => {
                this.explosionEffect(bullet, targetX, targetY, false);
            }, [], this);
        } else  if (data.bullet.type === 'laser') {
            bullet.setTint(0x00ff00);
            bullet.setDisplaySize(50, 50);
        } else {
            bullet.setDisplaySize(100, 100);
        }
        bullet.time = Date.now();
        bullet.rotation = rotation;
        bullet.body.mass = config.bulletMass;
        bullet.setData('position', data.position);
        this.physics.velocityFromRotation(rotation, speed, bullet.body.velocity);
        this.cannonOpposite.rotation = rotation;
        this.sound.playAudioSprite('sfx', 'shot');

        if (data.bullet.type !== 'missile') {
            if (targetFish) {
                bullet.targetFish = targetFish;  // 将目标鱼设置为子弹的属性
                this.physics.moveToObject(bullet, targetFish, config.bulletSpeed);
            }
            // 子弹的碰撞检测
            this.physics.add.collider(bullet, this.fishes, this.showHitFish, null, this);
        }
    }

    showHitFish(bullet, fish) {
        fish.body.stop(); // 避免子彈打到後, 對路徑的影響
        bullet.destroy();
        // 播放音效
        this.sound.playAudioSprite('sfx', 'boss hit');
    }

    hitFish(bullet, fish) {
        fish.body.stop(); // 避免子彈打到後, 對路徑的影響
        const bulletId = bullet.getData('id');
        bullet.destroy();

        // 播放音效
        this.sound.playAudioSprite('sfx', 'boss hit');
        // 这里可以发送击中信息给服务器
        //{"action":"hit","fish":{"type":"Fish_001","id":"f01_vDQvbz"},"bullet":{"id":"x8gCEtet0qJO"}}
        let data = {
            action: 'hit',
            fishes: [{
                type: fish.getData('type'),
                id: fish.getData('id')
            }
            ],
            bullet: {
                id: bulletId,
                bet: config.betAmounts[this.betAmountIndex]
            },
            position: this.playerPosition
        };
        //console.log('hit:', data);
        this.ws.send(JSON.stringify(data));
    }

    hitFishes(bullet, fishes) {
        const bulletId = bullet.getData('id');
        bullet.destroy();
        let hitFishes = [];

        for (let fish of fishes) {
            fish.body.stop(); // 避免子彈打到後, 對路徑的影響
            hitFishes.push({
                type: fish.getData('type'),
                id: fish.getData('id')
            })
        }

        // 这里可以发送击中信息给服务器
        //{"action":"hit","fish":{"type":"Fish_001","id":"f01_vDQvbz"},"bullet":{"id":"x8gCEtet0qJO"}}
        let data = {
            action: 'hit',
            fishes: hitFishes,
            bullet: {
                id: bulletId,
                bet: hitFishes.length * config.betAmounts[this.betAmountIndex]
            },
            position: this.playerPosition
        };
        //console.log('hit:', data);
        this.ws.send(JSON.stringify(data));
    }
}

config.scene = MainScene;
const game = new Phaser.Game(config);