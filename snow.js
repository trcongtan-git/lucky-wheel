// Snow effect
(function() {
    const canvas = document.getElementById('snowCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let snowflakes = [];
    let animationId;
    
    // Set canvas size
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Snowflake class
    class Snowflake {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 3 + 1; // 1-4px
            this.speed = Math.random() * 2 + 0.5; // 0.5-2.5
            this.wind = Math.random() * 0.5 - 0.25; // -0.25 to 0.25
            this.opacity = Math.random() * 0.5 + 0.5; // 0.5-1
            this.rotation = Math.random() * Math.PI * 2;
            this.rotationSpeed = Math.random() * 0.02 - 0.01; // -0.01 to 0.01
        }
        
        update() {
            this.y += this.speed;
            this.x += this.wind;
            this.rotation += this.rotationSpeed;
            
            // Reset if off screen
            if (this.y > canvas.height) {
                this.y = -10;
                this.x = Math.random() * canvas.width;
            }
            
            // Wrap around horizontally
            if (this.x > canvas.width) {
                this.x = 0;
            } else if (this.x < 0) {
                this.x = canvas.width;
            }
        }
        
        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            ctx.globalAlpha = this.opacity;
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            
            // Draw snowflake shape (simple 6-pointed star)
            for (let i = 0; i < 6; i++) {
                ctx.lineTo(0, this.size);
                ctx.translate(0, this.size);
                ctx.rotate(Math.PI / 3);
                ctx.lineTo(0, -this.size * 0.5);
                ctx.translate(0, -this.size * 0.5);
                ctx.rotate(Math.PI / 3);
            }
            
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    }
    
    // Create snowflakes
    function createSnowflakes() {
        const count = Math.floor((canvas.width * canvas.height) / 8000); // Tăng độ dày tuyết (giảm divisor từ 15000 xuống 8000)
        snowflakes = [];
        for (let i = 0; i < count; i++) {
            snowflakes.push(new Snowflake());
        }
    }
    
    // Animation loop
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        snowflakes.forEach(snowflake => {
            snowflake.update();
            snowflake.draw();
        });
        
        animationId = requestAnimationFrame(animate);
    }
    
    // Initialize
    createSnowflakes();
    animate();
    
    // Recreate snowflakes on resize
    window.addEventListener('resize', () => {
        resizeCanvas();
        createSnowflakes();
    });
})();

