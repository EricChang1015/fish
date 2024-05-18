export let config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    betAmounts: [10, 20, 30, 40, 50, 100, 200, 300, 500, 1000],
    bulletSpeed: 600,
    bulletMass: 0.1,
    fishSpeed: 100,
    fishMass: 10,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: {y: 0},
            debug: false
        }
    },
    version: '2024.04.19.v03',
    backend: 'wss://uat.aspectgaming.com/fish',
    backend2: 'ws://uat.aspectgaming.com:8081',
    backendTest: 'ws://localhost:8080',
    release: true
};
