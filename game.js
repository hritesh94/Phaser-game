class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        // Load images
        this.load.image('track', 'track.png');
        this.load.image('car', 'resized_image_1_100x100-removebg-preview.png');
        this.load.image('pedestrian', 'pedestrian_resized_80x80-removebg-preview.png');
        this.load.image('policeCar', 'police_with_text_resized_100x100-removebg-preview.png');
        this.load.image('bullet', 'bullet.png');
        this.load.image('policeBullet', 'bullet_southward_resized_40x40-removebg-preview.png');

        // All audio loading lines are removed
    }

    create() {
        // Game config 
        this.width = this.game.config.width;
        this.height = this.game.config.height;

        // Player state
        this.score = 0;
        this.playerHealth = 100;
        this.heatLevel = 0;
        this.heatThreshold = 5; // After 5 pedestrians, police start appearing
        this.canFire = true;

        // Background color
        this.cameras.main.setBackgroundColor('#333');

        // Track
        this.track = this.add.image(this.width/2, this.height/2, 'track').setOrigin(0.5);
        const trackScale = Math.max(this.height / this.track.displayHeight, 1);
        this.track.setScale(trackScale);
        this.trackLeftBound = this.track.x - (this.track.displayWidth / 2);
        this.trackRightBound = this.track.x + (this.track.displayWidth / 2);

        // Player Car
        this.player = this.physics.add.image(this.width/2, this.height - 100, 'car').setScale(0.5);

        // Groups
        this.pedestrians = this.physics.add.group();
        this.police = this.physics.add.group();
        this.bullets = this.physics.add.group();
        this.policeBullets = this.physics.add.group();

        // Input
        this.cursors = this.input.keyboard.createCursorKeys();

        // Text
        this.scoreText = this.add.text(20, 20, 'Score: 0', { fontSize: '24px', fill: '#fff' });
        this.heatText = this.add.text(20, 50, 'Heat: 0', { fontSize: '24px', fill: '#fff' });
        this.healthText = this.add.text(20, 80, 'Health: 100', { fontSize: '24px', fill: '#fff' });

        // Audio references removed

        // Spawn pedestrians regularly
        this.time.addEvent({
            delay: 2000,
            callback: () => this.spawnPedestrian(),
            loop: true
        });

        // Collisions
        this.physics.add.overlap(this.bullets, this.pedestrians, this.hitPedestrian, null, this);
        this.physics.add.overlap(this.bullets, this.police, this.hitPolice, null, this);
        this.physics.add.overlap(this.player, this.policeBullets, this.playerHit, null, this);
        this.physics.add.overlap(this.player, this.pedestrians, this.runOverPedestrian, null, this);
        this.physics.add.overlap(this.player, this.police, this.playerCollidePolice, null, this);
    }

    update() {
        // Player Movement
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-300);
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(300);
        } else {
            this.player.setVelocityX(0);
        }

        // Shooting
        if (this.cursors.space.isDown && this.canFire) {
            this.fireBullet();
            this.canFire = false;
        } else if (this.cursors.space.isUp) {
            this.canFire = true;
        }

        // Check track boundaries (player should not leave track)
        if (this.player.x < this.trackLeftBound || this.player.x > this.trackRightBound) {
            this.gameOver('You drove off the track!');
        }
    }

    spawnPedestrian() {
        // Pedestrians appear on track and move downward
        let x = Phaser.Math.Between(this.trackLeftBound + 20, this.trackRightBound - 20);
        let p = this.pedestrians.create(x, -50, 'pedestrian').setScale(0.5);
        p.setVelocityY(100);
    }

    spawnPolice() {
        // Police appear once heat threshold is reached
        let x = Phaser.Math.Between(this.trackLeftBound + 20, this.trackRightBound - 20);
        let pol = this.police.create(x, -50, 'policeCar').setScale(0.5);
        pol.health = 3; // Police car health
        pol.setVelocityY(150);

        // Police shoot back periodically
        this.time.addEvent({
            delay: 2000,
            callback: () => {
                if (pol.active) {
                    this.firePoliceBullet(pol.x, pol.y);
                }
            },
            loop: true
        });
    }

    firePoliceBullet(x, y) {
        let bullet = this.policeBullets.create(x, y, 'policeBullet').setScale(0.5);
        bullet.setVelocityY(300);
        this.time.delayedCall(5000, () => {
            if (bullet.active) bullet.destroy();
        });
    }

    fireBullet() {
        let bullet = this.bullets.create(this.player.x, this.player.y - 20, 'bullet');
        bullet.setVelocityY(-400);
        this.time.delayedCall(3000, () => {
            if (bullet.active) bullet.destroy();
        });
    }

    hitPedestrian(bullet, pedestrian) {
        bullet.destroy();
        pedestrian.destroy();
        this.score += 10;
        this.heatLevel += 1;
        this.updateHUD();

        // If heat is high enough, spawn police
        if (this.heatLevel >= this.heatThreshold) {
            this.spawnPolice();
        }
    }

    runOverPedestrian(player, pedestrian) {
        pedestrian.destroy();
        this.score += 5;
        this.heatLevel += 1;
        this.updateHUD();

        if (this.heatLevel >= this.heatThreshold) {
            this.spawnPolice();
        }
    }

    hitPolice(bullet, policeCar) {
        bullet.destroy();
        policeCar.health -= 1;
        if (policeCar.health <= 0) {
            policeCar.destroy();
            this.score += 50;
            this.updateHUD();
        }
    }

    playerHit(player, bullet) {
        bullet.destroy();
        this.playerHealth -= 20;
        this.updateHUD();
        if (this.playerHealth <= 0) {
            this.gameOver('You were taken out by the police!');
        }
    }

    playerCollidePolice(player, policeCar) {
        policeCar.destroy();
        this.playerHealth -= 50;
        this.updateHUD();
        if (this.playerHealth <= 0) {
            this.gameOver('You crashed into the police!');
        }
    }

    updateHUD() {
        this.scoreText.setText(`Score: ${this.score}`);
        this.heatText.setText(`Heat: ${this.heatLevel}`);
        this.healthText.setText(`Health: ${this.playerHealth}`);
    }

    gameOver(reason) {
        // No audio stop, since no audio
        this.scene.pause();
        this.add.text(this.width/2, this.height/2, `GAME OVER\n${reason}`, 
            { fontSize: '48px', fill: '#ff0000', align: 'center' })
            .setOrigin(0.5)
            .setDepth(100);
    }
}

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'gameContainer',
    scene: [GameScene],
    physics: {
        default: "arcade",
        arcade: {
            gravity: { y: 0 },
            debug: false,
        },
    }
};

const game = new Phaser.Game(config);
