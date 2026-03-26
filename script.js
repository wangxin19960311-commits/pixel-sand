// 画布设置
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// 状态变量
let isRunning = false;
let particles = [];
let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;
let prevMouseX = mouseX;
let mouseVelocityX = 0;
let currentColor = '#8B4513';
let grid = {};
const gridSize = 4;
let animationId;

// 48色美术调色板
const colors = [
    // 红色系
    '#DC143C', '#B22222', '#8B0000', '#CD5C5C', '#F08080', '#FA8072',
    // 橙色系
    '#FF4500', '#FF6347', '#FF7F50', '#FFA07A', '#FF8C00', '#FFA500',
    // 黄色系
    '#FFD700', '#FFFF00', '#F0E68C', '#BDB76B', '#EEE8AA', '#F5F5DC',
    // 绿色系
    '#228B22', '#32CD32', '#90EE90', '#98FB98', '#00FA9A', '#00FF7F',
    // 青色系
    '#20B2AA', '#48D1CC', '#40E0D0', '#00CED1', '#5F9EA0', '#008B8B',
    // 蓝色系
    '#4169E1', '#0000FF', '#1E90FF', '#00BFFF', '#87CEEB', '#87CEFA',
    // 紫色系
    '#9370DB', '#8A2BE2', '#9400D3', '#9932CC', '#BA55D3', '#DDA0DD',
    // 棕色/灰色系
    '#8B4513', '#A0522D', '#D2691E', '#696969', '#808080', '#A9A9A9'
];

// 珍惜光阴的诗词
const poems = [
    "一寸光阴一寸金，寸金难买寸光阴",
    "少壮不努力，老大徒伤悲",
    "黑发不知勤学早，白首方悔读书迟",
    "盛年不重来，一日难再晨",
    "及时当勉励，岁月不待人",
    "花有重开日，人无再少年",
    "光阴似箭，日月如梭",
    "莫等闲，白了少年头，空悲切",
    "少年易老学难成，一寸光阴不可轻",
    "未觉池塘春草梦，阶前梧叶已秋声",
    "流光容易把人抛，红了樱桃，绿了芭蕉",
    "年年岁岁花相似，岁岁年年人不同",
    "劝君莫惜金缕衣，劝君惜取少年时",
    "明日复明日，明日何其多",
    "我生待明日，万事成蹉跎",
    "人生天地之间，若白驹过隙，忽然而已",
    "逝者如斯夫，不舍昼夜",
    "天可补，海可填，南山可移，日月既往，不可复追",
    "落日无边江不尽，此身此日更须忙",
    "志士惜年，贤人惜日，圣人惜时"
];

// 初始化画布
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// 粒子类
class Particle {
    constructor(x, y, color, windX = 0) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 1.5 + windX * 0.5;
        this.vy = Math.random() * 1 + 1;
        this.color = color;
        this.size = gridSize;
        this.settled = false;
        this.life = 0;
    }

    // 获取指定列的高度（从当前位置向下数有多少个空位）
    getColumnHeight(gx, gy) {
        let height = 0;
        for (let y = gy; y < Math.floor(canvas.height / gridSize); y++) {
            if (grid[`${gx},${y}`]) {
                break;
            }
            height++;
        }
        return height;
    }

    update() {
        if (this.settled) return;

        this.life++;

        // 重力 - 逐渐加速
        this.vy += 0.25;
        if (this.vy > 8) this.vy = 8; // 终端速度限制

        // 空气阻力
        this.vx *= 0.995;

        // 更新位置
        this.x += this.vx;
        this.y += this.vy;

        // 边界检查 - 左右边界
        if (this.x < 0) {
            this.x = 0;
            this.vx *= -0.3;
        }
        if (this.x > canvas.width - this.size) {
            this.x = canvas.width - this.size;
            this.vx *= -0.3;
        }

        // 检查是否落地或碰到其他粒子
        const gridX = Math.floor(this.x / gridSize);
        const gridY = Math.floor(this.y / gridSize);

        // 检查底部
        if (this.y >= canvas.height - this.size) {
            this.y = canvas.height - this.size;
            this.settle(gridX, Math.floor((canvas.height - this.size) / gridSize));
            return;
        }

        // 检查下方是否有粒子
        if (grid[`${gridX},${gridY + 1}`]) {
            // 尝试向两侧滑动 - 优先滑向更低的一侧
            const leftHeight = this.getColumnHeight(gridX - 1, gridY);
            const rightHeight = this.getColumnHeight(gridX + 1, gridY);

            const leftEmpty = !grid[`${gridX - 1},${gridY}`] && !grid[`${gridX - 1},${gridY + 1}`];
            const rightEmpty = !grid[`${gridX + 1},${gridY}`] && !grid[`${gridX + 1},${gridY + 1}`];

            let slideDirection = 0;

            if (leftEmpty && rightEmpty) {
                // 两边都空，优先滑向更低的一侧
                if (leftHeight < rightHeight) {
                    slideDirection = -1;
                } else if (rightHeight < leftHeight) {
                    slideDirection = 1;
                } else {
                    // 一样高，根据速度或随机选择
                    if (this.vx < -0.1) slideDirection = -1;
                    else if (this.vx > 0.1) slideDirection = 1;
                    else slideDirection = Math.random() < 0.5 ? -1 : 1;
                }
            } else if (leftEmpty && leftHeight <= rightHeight + 2) {
                slideDirection = -1;
            } else if (rightEmpty && rightHeight <= leftHeight + 2) {
                slideDirection = 1;
            }

            if (slideDirection !== 0) {
                this.x = (gridX + slideDirection) * gridSize;
                this.vx = slideDirection * 0.8;
            } else {
                // 无法滑动，定居
                this.y = gridY * gridSize;
                this.settle(gridX, gridY);
            }
        }
    }

    settle(gx, gy) {
        // 寻找最低点 - 让像素铺得更平
        let finalGy = gy;

        // 向下查找是否有空位
        while (finalGy < Math.floor(canvas.height / gridSize) - 1 &&
               !grid[`${gx},${finalGy + 1}`]) {
            finalGy++;
        }

        // 如果当前位置下方有空位，继续向两侧寻找可以下落的位置
        if (finalGy > gy) {
            this.settled = true;
            this.vx = 0;
            this.vy = 0;
            this.x = gx * gridSize;
            this.y = finalGy * gridSize;
            grid[`${gx},${finalGy}`] = this.color;
            return;
        }

        // 如果下方被堵住，尝试向两侧滚动铺平
        // 优先向较低的一侧滚动
        let leftHeight = 0;
        let rightHeight = 0;

        // 计算左侧高度
        for (let i = 0; i < 5; i++) {
            if (grid[`${gx - 1 - i},${gy}`] || grid[`${gx - 1 - i},${gy + 1}`]) {
                leftHeight = 5 - i;
                break;
            }
        }

        // 计算右侧高度
        for (let i = 0; i < 5; i++) {
            if (grid[`${gx + 1 + i},${gy}`] || grid[`${gx + 1 + i},${gy + 1}`]) {
                rightHeight = 5 - i;
                break;
            }
        }

        // 向较低的一侧滚动
        let rollDirection = 0;
        if (leftHeight < rightHeight && !grid[`${gx - 1},${gy}`]) {
            rollDirection = -1;
        } else if (rightHeight < leftHeight && !grid[`${gx + 1},${gy}`]) {
            rollDirection = 1;
        } else if (!grid[`${gx - 1},${gy}`] && !grid[`${gx + 1},${gy}`]) {
            // 两边一样低，随机选择
            rollDirection = Math.random() < 0.5 ? -1 : 1;
        } else if (!grid[`${gx - 1},${gy}`]) {
            rollDirection = -1;
        } else if (!grid[`${gx + 1},${gy}`]) {
            rollDirection = 1;
        }

        if (rollDirection !== 0) {
            // 滚动到相邻位置
            let rollX = gx + rollDirection;
            let rollY = gy;

            // 在滚动方向上继续向下查找最低点
            while (rollY < Math.floor(canvas.height / gridSize) - 1 &&
                   !grid[`${rollX},${rollY + 1}`]) {
                rollY++;
            }

            this.settled = true;
            this.vx = 0;
            this.vy = 0;
            this.x = rollX * gridSize;
            this.y = rollY * gridSize;
            grid[`${rollX},${rollY}`] = this.color;
            return;
        }

        // 无法滚动，在当前位置定居
        this.settled = true;
        this.vx = 0;
        this.vy = 0;
        this.x = gx * gridSize;
        this.y = gy * gridSize;
        grid[`${gx},${gy}`] = this.color;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
    }
}

// 生成粒子
function spawnParticle() {
    if (!isRunning) return;

    // 根据鼠标水平速度产生风力效果
    // 鼠标移动越快，粒子飘散越明显
    const windX = mouseVelocityX * 0.3;

    // 在鼠标位置生成，带一点随机偏移模拟发射口
    const x = mouseX + (Math.random() - 0.5) * 20;
    const y = mouseY + (Math.random() - 0.5) * 10;

    particles.push(new Particle(x, y, currentColor, windX));
}

// 动画循环
function animate() {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制已定居的粒子
    for (let key in grid) {
        const [gx, gy] = key.split(',').map(Number);
        ctx.fillStyle = grid[key];
        ctx.fillRect(gx * gridSize, gy * gridSize, gridSize, gridSize);
    }

    // 更新和绘制活动粒子
    particles = particles.filter(p => {
        if (!p.settled) {
            p.update();
            p.draw();
            return true;
        }
        return false;
    });

    // 生成新粒子 - 增加生成频率
    if (isRunning) {
        // 每次生成2-3个粒子，形成连续流
        const count = Math.floor(Math.random() * 2) + 2;
        for (let i = 0; i < count; i++) {
            if (Math.random() < 0.7) {
                spawnParticle();
            }
        }
    }

    // 鼠标速度衰减
    mouseVelocityX *= 0.9;

    animationId = requestAnimationFrame(animate);
}

// 初始化调色板
function initColorPalette() {
    const palette = document.getElementById('colorPalette');
    const currentColorEl = document.getElementById('currentColor');
    
    colors.forEach((color, index) => {
        const colorItem = document.createElement('div');
        colorItem.className = 'color-item';
        colorItem.style.backgroundColor = color;
        if (index === 0) colorItem.classList.add('active');
        
        colorItem.addEventListener('click', () => {
            document.querySelectorAll('.color-item').forEach(el => el.classList.remove('active'));
            colorItem.classList.add('active');
            currentColor = color;
            currentColorEl.style.backgroundColor = color;
        });
        
        palette.appendChild(colorItem);
    });
    
    currentColorEl.style.backgroundColor = colors[0];
}

// 诗词轮换
function initPoemRotation() {
    const poemText = document.getElementById('poemText');
    let currentIndex = 0;
    
    function showPoem() {
        poemText.classList.remove('show');
        
        setTimeout(() => {
            poemText.textContent = poems[currentIndex];
            poemText.classList.add('show');
            currentIndex = (currentIndex + 1) % poems.length;
        }, 1000);
    }
    
    // 初始显示
    showPoem();
    
    // 每30秒切换
    setInterval(showPoem, 30000);
}

// 事件监听
function initEvents() {
    // 鼠标移动
    window.addEventListener('mousemove', (e) => {
        // 计算鼠标水平速度
        mouseVelocityX = e.clientX - prevMouseX;
        prevMouseX = e.clientX;

        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    // 点击控制开始/停止
    window.addEventListener('click', (e) => {
        // 忽略点击工具栏
        if (e.target.closest('.toolbar')) return;
        
        isRunning = !isRunning;
        
        // 淡出提示
        const hint = document.getElementById('hint');
        hint.classList.add('fade-out');
    });

    // 窗口大小调整
    window.addEventListener('resize', resizeCanvas);

    // 下载功能
    document.getElementById('downloadBtn').addEventListener('click', () => {
        const link = document.createElement('a');
        link.download = `堆像素_${new Date().getTime()}.png`;
        link.href = canvas.toDataURL();
        link.click();
    });

    // 分享功能
    document.getElementById('shareBtn').addEventListener('click', async () => {
        try {
            canvas.toBlob(async (blob) => {
                const file = new File([blob], '堆像素作品.png', { type: 'image/png' });
                
                if (navigator.share && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        title: '我的堆像素作品',
                        text: '用时光堆叠的像素艺术',
                        files: [file]
                    });
                } else {
                    // 复制到剪贴板
                    const item = new ClipboardItem({ 'image/png': blob });
                    await navigator.clipboard.write([item]);
                    alert('作品已复制到剪贴板！');
                }
            });
        } catch (err) {
            console.error('分享失败:', err);
            alert('分享功能暂不可用，请使用下载功能保存作品');
        }
    });

    // 清空功能
    document.getElementById('clearBtn').addEventListener('click', () => {
        if (confirm('确定要清空画布吗？')) {
            particles = [];
            grid = {};
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    });
}

// 初始化
function init() {
    resizeCanvas();
    initColorPalette();
    initPoemRotation();
    initEvents();
    animate();
}

// 启动
init();
