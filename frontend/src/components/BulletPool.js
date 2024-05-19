// 使用 BulletPool 管理子彈實例：
// 這樣可以避免在遊戲中頻繁創建和銷毀子彈對象，從而減少垃圾回收的壓力，提高性能。
// 要優化 `BulletPool` 和 `Quadtree` 的使用，我們可以採取以下步驟：
//
// 1. **使用 `BulletPool` 管理子彈實例：** 這樣可以避免在遊戲中頻繁創建和銷毀子彈對象，從而減少垃圾回收的壓力，提高性能。
// 2. **利用 `Quadtree` 進行高效的碰撞檢測：** `Quadtree` 是一種基於空間分割的數據結構，可以用來快速查詢在某個範圍內的對象。在遊戲中，我們可以使用它來優化碰撞檢測的過程，特別是當場景中有大量對象需要進行碰撞檢測時。
//
// 以下是具體的實現方案：
//
// ### 優化 `BulletPool`
//
// - 確保 `BulletPool` 在遊戲中只被實例化一次，並且可以全局訪問。
// - 在需要子彈時，從 `BulletPool` 中獲取一個非活動的子彈，而不是創建一個新的子彈。
// - 子彈使用完畢後，不要銷毀它，而是將其標記為非活動並返回到池中。
//
// ```javascript
// // 使用 BulletPool
// let bullet = bulletPool.get();
// bullet.setPosition(startX, startY);
// bullet.setActive(true);
// ```

class BulletPool {
    constructor(scene) {
        this.scene = scene;
        this.pool = [];
    }

    get() {
        let bullet = this.pool.find(b => !b.active);
        if (!bullet) {
            bullet = this.scene.add.sprite(0, 0, 'bullet');
            this.pool.push(bullet);
        }
        bullet.setActive(true).setVisible(true);
        return bullet;
    }

    release(bullet) {
        bullet.setActive(false).setVisible(false);
    }
}

export default BulletPool;