// Global variables
let players = [];
let isSpinning = false;
let currentRotation = 0;
let canvas, ctx;
let wheelContainer, wheelWrapper;
let results = []; // Lưu lịch sử kết quả
let slowSpinAnimation = null; // Animation quay chậm

const SPLIT_STORAGE_KEY = 'lucky-spin-split-store';
const MAIN_STORAGE_KEY = 'lucky-spin-store';
function useSplitStorage() {
    const p = (window.location.pathname || '').replace(/\/+$/, '');
    return p === '/split';
}

// Load: /split → localStorage; trang chính → API, nếu API lỗi (Vercel static) → localStorage
async function loadData() {
    if (useSplitStorage()) {
        try {
            const raw = localStorage.getItem(SPLIT_STORAGE_KEY);
            if (raw) {
                const data = JSON.parse(raw);
                if (Array.isArray(data.players)) players = data.players;
                if (Array.isArray(data.results)) results = data.results;
            }
        } catch (e) {
            console.warn('Không đọc được dữ liệu từ localStorage (split):', e.message);
        }
        return;
    }
    try {
        const res = await fetch('/api/data');
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.players)) players = data.players;
            if (Array.isArray(data.results)) results = data.results;
            return;
        }
    } catch (e) {
        /* API không có (Vercel static) → bỏ qua */
    }
    try {
        const raw = localStorage.getItem(MAIN_STORAGE_KEY);
        if (raw) {
            const data = JSON.parse(raw);
            if (Array.isArray(data.players)) players = data.players;
            if (Array.isArray(data.results)) results = data.results;
        }
    } catch (e) {
        console.warn('Không đọc được dữ liệu từ localStorage:', e.message);
    }
}

// Save: /split → localStorage; trang chính → API, nếu API lỗi → localStorage (Vercel static)
function saveData() {
    if (useSplitStorage()) {
        try {
            localStorage.setItem(SPLIT_STORAGE_KEY, JSON.stringify({ players, results }));
        } catch (e) {
            console.warn('Lưu dữ liệu vào localStorage (split) thất bại:', e.message);
        }
        return;
    }
    fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players, results }),
    })
        .then((res) => {
            if (!res.ok) throw new Error('API failed');
        })
        .catch(() => {
            try {
                localStorage.setItem(MAIN_STORAGE_KEY, JSON.stringify({ players, results }));
            } catch (e) {
                console.warn('Lưu dữ liệu vào localStorage thất bại:', e.message);
            }
        });
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    canvas = document.getElementById('wheelCanvas');
    ctx = canvas.getContext('2d');
    wheelContainer = document.getElementById('wheelContainer');
    wheelWrapper = document.getElementById('wheelWrapper');

    // Gọi ngay lần đầu (có thể wrapper chưa có kích thước cuối → lệch tâm)
    setCanvasSize();

    document.getElementById('fileInput').addEventListener('change', handleFileImport);
    const btnParticipant = document.getElementById('btnParticipant');
    const participantPopup = document.getElementById('participantPopup');
    const btnImportParticipant = document.getElementById('btnImportParticipant');
    const btnDownloadTemplate = document.getElementById('btnDownloadTemplate');
    if (btnParticipant && participantPopup) {
        btnParticipant.addEventListener('click', (e) => {
            e.stopPropagation();
            participantPopup.classList.toggle('is-open');
        });
        document.addEventListener('click', (e) => {
            if (participantPopup.classList.contains('is-open') &&
                !participantPopup.contains(e.target) && !btnParticipant.contains(e.target)) {
                participantPopup.classList.remove('is-open');
            }
        });
    }
    if (btnImportParticipant && participantPopup) {
        btnImportParticipant.addEventListener('click', () => {
            participantPopup.classList.remove('is-open');
            document.getElementById('fileInput').click();
        });
    }
    if (btnDownloadTemplate && participantPopup) {
        btnDownloadTemplate.addEventListener('click', () => {
            participantPopup.classList.remove('is-open');
            downloadTemplate();
        });
    }
    document.getElementById('playButton').addEventListener('click', startSpin);
    document.getElementById('closePopup').addEventListener('click', closePopup);
    document.getElementById('shareBtn').addEventListener('click', closePopup);
    document.getElementById('resultBtn').addEventListener('click', showResults);
    document.getElementById('deleteResult').addEventListener('click', deleteLastResult);

    await loadData();
    drawWheel();

    // Sửa lệch tâm: chạy lại sau khi layout xong (wrapper đã có offsetWidth/offsetHeight đúng)
    function layoutReady() {
        setCanvasSize();
        drawWheel();
        logWheelLayout();
    }
    requestAnimationFrame(() => {
        requestAnimationFrame(layoutReady);
    });
    window.addEventListener('load', layoutReady);

    // Cập nhật khi kích thước wrapper thay đổi (resize, font load, iframe...)
    if (typeof ResizeObserver !== 'undefined' && wheelWrapper) {
        const ro = new ResizeObserver(() => {
            setCanvasSize();
            drawWheel();
        });
        ro.observe(wheelWrapper);
    }

    updatePlayerCounter();
    updateResultCounter();
    startSlowSpin();

    // Chỉ khi ở split path (?split=1): nền trong suốt để thấy background trang split, thêm nút "Đập trứng" vào toolbar
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('split') === '1') {
        document.body.classList.add('split-embed');
        const menubarButtons = document.querySelector('.menubar-buttons');
        if (menubarButtons) {
            const btnEgg = document.createElement('button');
            btnEgg.type = 'button';
            btnEgg.className = 'menubar-btn';
            btnEgg.id = 'btnEggInToolbar';
            btnEgg.innerHTML = '<span class="btn-text">Đập trứng</span>';
            btnEgg.addEventListener('click', () => {
                if (window.parent !== window) {
                    window.parent.postMessage({ type: 'OPEN_SPLIT_VIEW' }, '*');
                }
            });
            menubarButtons.appendChild(btnEgg);
        }
    }
});

// Tải file template Excel (Mã nhân viên, Tên nhân viên)
function downloadTemplate() {
    if (typeof XLSX === 'undefined') {
        console.warn('Thư viện XLSX chưa load.');
        return;
    }
    const data = [
        ['Mã nhân viên', 'Tên nhân viên'],
        ['NV001', 'Nguyễn Văn A'],
        ['NV002', 'Trần Thị B'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Danh sách');
    XLSX.writeFile(wb, 'template.xlsx');
}

// Handle file import
function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

            // Convert to JSON with header
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

            // Mapping theo file "DANH SÁCH THAM GIA": hàng 0 = header, cột A (index 0) = Mã nhân viên, cột B (index 1) = Tên nhân viên
            players = [];
            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                const code = (row && (row[0] !== undefined && row[0] !== null ? row[0] : row['A']) !== undefined)
                    ? String(row[0] !== undefined && row[0] !== null ? row[0] : row['A'] || '').trim() : '';
                const name = (row && (row[1] !== undefined && row[1] !== null ? row[1] : row['B']) !== undefined)
                    ? String(row[1] !== undefined && row[1] !== null ? row[1] : row['B'] || '').trim() : '';
                const full = code && name ? code + ' - ' + name : (name || code);
                if (full !== '') {
                    players.push(full);
                }
            }

            if (players.length === 0) {
                alert('Không tìm thấy dữ liệu. Cần cột A: Mã nhân viên, cột B: Tên nhân viên (hàng đầu = header).');
                return;
            }

            updatePlayerCounter();
            drawWheel();
            saveData();

            if (!isSpinning) {
                startSlowSpin();
            }
        } catch (error) {
            alert('Lỗi khi đọc file Excel: ' + error.message);
        }
    };
    reader.readAsArrayBuffer(file);
}

// Lấy chữ cái đầu mỗi từ (viết tắt), ví dụ "Nguyễn Văn A" → "NVA"
function getInitials(name) {
    if (!name || typeof name !== 'string') return '';
    return name
        .trim()
        .split(/\s+/)
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 6);
}

// Debug: log kích thước và vị trí để kiểm tra lệch tâm (bật bằng window.WHEEL_DEBUG = true)
function logWheelLayout() {
    if (typeof window !== 'undefined' && !window.WHEEL_DEBUG) return;
    if (!wheelWrapper || !canvas) return;
    const wrap = wheelWrapper.getBoundingClientRect();
    const btn = document.getElementById('playButton');
    const btnRect = btn ? btn.getBoundingClientRect() : null;
    const wrapperCenterX = wrap.left + wrap.width / 2;
    const wrapperCenterY = wrap.top + wrap.height / 2;
    const btnCenterX = btnRect ? btnRect.left + btnRect.width / 2 : 0;
    const btnCenterY = btnRect ? btnRect.top + btnRect.height / 2 : 0;
    const offsetPx = btnRect
        ? { x: Math.round(btnCenterX - wrapperCenterX), y: Math.round(btnCenterY - wrapperCenterY) }
        : null;
    console.log('[Wheel debug]', {
        wrapper: { w: wheelWrapper.offsetWidth, h: wheelWrapper.offsetHeight, left: wrap.left, top: wrap.top },
        canvas: { w: canvas.width, h: canvas.height, styleW: canvas.style.width, styleH: canvas.style.height },
        wrapperCenter: { x: wrapperCenterX, y: wrapperCenterY },
        buttonCenter: { x: btnCenterX, y: btnCenterY },
        offsetPx: offsetPx,
    });
}

// Cập nhật kích thước canvas theo devicePixelRatio (canvas rõ nét trên Retina)
function setCanvasSize() {
    if (!canvas || !wheelWrapper || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const size = Math.min(wheelWrapper.offsetWidth, wheelWrapper.offsetHeight);
    if (size <= 0) {
        if (typeof window !== 'undefined' && window.WHEEL_DEBUG) console.warn('[Wheel] setCanvasSize bỏ qua: wrapper size =', size);
        return;
    }
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx.scale(dpr, dpr);
    logWheelLayout();
}

// Update player counter and show/hide play button
function updatePlayerCounter() {
    const counter = document.getElementById('playerCounter');
    counter.textContent = players.length;

    // Show/hide play button based on whether players list is empty
    const playButton = document.getElementById('playButton');
    if (players.length === 0) {
        playButton.style.display = 'none';
    } else {
        playButton.style.display = 'flex';
    }
}

// Draw wheel (dùng kích thước logic vì context đã scale theo devicePixelRatio)
function drawWheel() {
    if (!ctx || !canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const size = canvas.width / dpr;

    if (players.length === 0) {
        ctx.clearRect(0, 0, size, size);
        ctx.fillStyle = '#f0f0f0';
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2 - 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#999';
        const emptyFontSize = Math.max(14, Math.min(20, size / 45));
        ctx.font = `${emptyFontSize}px Inter`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Chưa có dữ liệu người tham gia', size / 2, size / 2);
        return;
    }

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 10;
    const anglePerPlayer = (Math.PI * 2) / players.length;

    ctx.clearRect(0, 0, size, size);

    // Draw segments with Vintage Christmas theme
    // Ensure first and last segments have different colors
    players.forEach((player, index) => {
        const startAngle = index * anglePerPlayer;
        const endAngle = (index + 1) * anglePerPlayer;

        // Determine color: alternate colors, but ensure first and last are different
        let isRedSegment;

        // Segment đầu (index 0) luôn là đỏ
        if (index === 0) {
            isRedSegment = true;
        }
        // Segment cuối (index length-1) phải khác màu với segment đầu
        else if (index === players.length - 1) {
            // Segment đầu là đỏ (index 0), nên segment cuối phải là beige
            isRedSegment = false;
        }
        // Các segment khác: alternation bình thường
        else {
            isRedSegment = index % 2 === 0;
        }

        // Create gradient for segment
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);

        if (isRedSegment) {
            // Sector A: Deep Red with gradient (#7A1417 -> #921A1D)
            gradient.addColorStop(0, '#7A1417'); // Center (darker)
            gradient.addColorStop(1, '#921A1D'); // Edge (lighter)
        } else {
            // Sector B: Creamy Beige (#F5E6BE)
            gradient.addColorStop(0, '#F5E6BE');
            gradient.addColorStop(1, '#F5E6BE');
        }

        ctx.fillStyle = gradient;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fill();

        // Draw text with appropriate color based on background
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(startAngle + anglePerPlayer / 2);
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        // Text color: Cream white on red, Dark brown on beige
        ctx.fillStyle = isRedSegment ? '#FFFDD0' : '#4A2C2A';

        // Luôn hiển thị full text; giảm cỡ chữ theo từng segment để vừa ô
        const textRadius = radius * 0.85;
        const segmentArcLength = textRadius * anglePerPlayer;
        const maxTextWidth = segmentArcLength * 0.92;

        let fontSize = 24;
        ctx.font = `bold ${fontSize}px Inter`;
        while (fontSize >= 3 && ctx.measureText(player).width > maxTextWidth) {
            fontSize -= 1;
            ctx.font = `bold ${fontSize}px Inter`;
        }

        ctx.fillText(player, textRadius, 0);
        ctx.restore();
    });

    // Draw dividing lines between segments (draw from inner radius to avoid overlap with segments)
    ctx.strokeStyle = 'rgba(194, 155, 109, 0.6)'; // #C29B6D with 60% opacity
    ctx.lineWidth = 1.5;
    const innerRadius = 60; // Start line from inner radius (center button area)
    // Only draw lines from index 1 to index (length - 1) to avoid double line at 0/360
    // Line at index 0 and index (length) are the same (0° = 360°), so skip one
    for (let i = 1; i < players.length; i++) {
        const angle = i * anglePerPlayer;
        ctx.beginPath();
        const lineStartX = centerX + Math.cos(angle) * innerRadius;
        const lineStartY = centerY + Math.sin(angle) * innerRadius;
        const lineEndX = centerX + Math.cos(angle) * radius;
        const lineEndY = centerY + Math.sin(angle) * radius;
        ctx.moveTo(lineStartX, lineStartY);
        ctx.lineTo(lineEndX, lineEndY);
        ctx.stroke();
    }

    // Draw outer border with Dark Gold (#A67C00)
    ctx.strokeStyle = '#A67C00';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Draw center circle (will be covered by button)
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 60, 0, Math.PI * 2);
    ctx.fill();
}

// Calculate zoom scale to show 50% of top wheel height in viewport
function calculateZoomScale() {
    const viewportHeight = window.innerHeight;
    const wheelRect = wheelContainer.getBoundingClientRect();
    const wheelHeight = wheelRect.height;
    const wheelCenterY = wheelRect.top + wheelHeight / 2;

    // Yêu cầu: 50% chiều cao mặt trên vòng quay nằm trong màn hình
    // Nghĩa là sau khi zoom, phần trên cùng (50% chiều cao) của vòng quay phải nằm trong viewport

    // Sau khi zoom với transform-origin center:
    // newTop = wheelCenterY - wheelHeight * scale / 2
    // newHeight = wheelHeight * scale

    // Yêu cầu: 50% chiều cao mặt trên nằm trong màn hình
    // newTop + newHeight * 0.5 <= viewportHeight
    // wheelCenterY - wheelHeight * scale / 2 + wheelHeight * scale * 0.5 <= viewportHeight
    // wheelCenterY <= viewportHeight

    // Để đảm bảo 50% chiều cao mặt trên nằm trong màn hình hiển thị:
    // Ta muốn: newTop + newHeight * 0.5 = viewportHeight * 0.5 (hoặc gần đó)
    // wheelCenterY - wheelHeight * scale / 2 + wheelHeight * scale * 0.5 = viewportHeight * 0.5
    // wheelCenterY = viewportHeight * 0.5

    // Vì wheel center không đổi khi zoom (transform-origin center),
    // ta dùng scale cố định 2.0 để zoom đủ lớn và dễ nhìn
    // Scale này đảm bảo wheel đủ lớn để thấy rõ khi quay

    const baseScale = 2.0;

    // Kiểm tra xem sau khi zoom, top 50% có nằm trong viewport không
    const newTop = wheelCenterY - wheelHeight * baseScale / 2;
    const top50PercentEnd = newTop + wheelHeight * baseScale * 0.5;

    // Nếu vượt quá viewport, điều chỉnh scale
    if (top50PercentEnd > viewportHeight) {
        // Tính scale để top50PercentEnd <= viewportHeight
        // wheelCenterY - wheelHeight * scale / 2 + wheelHeight * scale * 0.5 <= viewportHeight
        // wheelCenterY <= viewportHeight
        // Nếu wheelCenterY > viewportHeight, không thể đạt được yêu cầu
        // Trong trường hợp này, dùng scale nhỏ hơn
        const maxScale = (viewportHeight - newTop) / (wheelHeight * 0.5);
        return Math.max(1.5, Math.min(baseScale, maxScale));
    }

    return baseScale;
}

// Zoom in wheel
function zoomIn() {
    // Get current position before changing to fixed
    const rect = wheelContainer.getBoundingClientRect();
    const currentCenterX = rect.left + rect.width / 2;
    const currentCenterY = rect.top + rect.height / 2;

    // Calculate final position: lower on screen
    // Position wheel lower (90% from top = near bottom of screen)
    const finalY = window.innerHeight * 0.90; // 90% from top = lower position
    const finalX = window.innerWidth / 2;

    // First, set position fixed at current location to maintain position
    wheelContainer.style.position = 'fixed';
    wheelContainer.style.top = `${rect.top}px`;
    wheelContainer.style.left = `${rect.left}px`;
    wheelContainer.style.width = `${rect.width}px`;
    wheelContainer.style.height = `${rect.height}px`;

    // Force reflow
    wheelContainer.offsetHeight;

    // Now calculate transform to move to final position and zoom
    const scale = 2;
    const translateX = finalX - currentCenterX;
    const translateY = finalY - currentCenterY;

    // Apply transform to zoom and move to final position
    wheelContainer.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    wheelContainer.style.transformOrigin = 'center center';

    wheelContainer.classList.add('zoomed');
}

// Zoom out wheel
function zoomOut() {
    wheelContainer.classList.remove('zoomed');
    wheelContainer.style.position = '';
    wheelContainer.style.top = '';
    wheelContainer.style.left = '';
    wheelContainer.style.width = '';
    wheelContainer.style.height = '';
    wheelContainer.style.transform = '';
    wheelContainer.style.transformOrigin = '';
}

// Start slow spin animation
function startSlowSpin() {
    if (slowSpinAnimation) {
        cancelAnimationFrame(slowSpinAnimation);
    }

    if (isSpinning || players.length === 0) {
        return;
    }

    let slowRotation = currentRotation;
    const slowSpeed = 0.05; // Độ quay mỗi frame (rất chậm)

    function slowAnimate() {
        if (isSpinning) {
            return; // Dừng nếu đang quay thực sự
        }

        slowRotation += slowSpeed;
        currentRotation = slowRotation;
        wheelWrapper.style.transform = `rotate(${slowRotation}deg)`;

        slowSpinAnimation = requestAnimationFrame(slowAnimate);
    }

    slowAnimate();
}

// Stop slow spin animation
function stopSlowSpin() {
    if (slowSpinAnimation) {
        cancelAnimationFrame(slowSpinAnimation);
        slowSpinAnimation = null;
    }
}

// Calculate winner based on current rotation
function calculateWinnerFromRotation(rotation) {
    if (players.length === 0) return null;

    // Normalize rotation to 0-360 range
    let normalizedRotation = rotation % 360;
    if (normalizedRotation < 0) normalizedRotation += 360;

    // Reverse the calculation from startSpin():
    // In startSpin(), we calculate: targetRotation = (270 - segmentCenterAngle) mod 360
    // Where segmentCenterAngle = randomIndex * anglePerPlayer + anglePerPlayer/2
    //
    // So: targetRotation = (270 - (randomIndex * anglePerPlayer + anglePerPlayer/2)) mod 360
    //     = (270 - randomIndex * anglePerPlayer - anglePerPlayer/2) mod 360
    //
    // To reverse this, we have: normalizedRotation = (270 - segmentCenterAngle) mod 360
    // So: segmentCenterAngle = (270 - normalizedRotation) mod 360

    const anglePerPlayer = 360 / players.length;

    // Calculate the center angle of the segment currently at the pointer
    // When wheel rotates by 'rotation' (CSS counter-clockwise), in canvas it rotates clockwise
    // So if segment center was at 'a', after rotation it's at (a + rotation) mod 360
    // We want to find which segment center is now at 270° (pointer position)
    // So: (a + rotation) mod 360 = 270
    //     a = (270 - rotation) mod 360

    const segmentCenterAngle = (270 - normalizedRotation + 360) % 360;

    // Now find which segment has this center angle
    // Segment i has center at: i * anglePerPlayer + anglePerPlayer/2
    // So we solve: i * anglePerPlayer + anglePerPlayer/2 = segmentCenterAngle
    //     i = (segmentCenterAngle - anglePerPlayer/2) / anglePerPlayer

    let segmentIndex = (segmentCenterAngle - anglePerPlayer / 2) / anglePerPlayer;

    // Round to nearest integer and handle edge cases
    segmentIndex = Math.round(segmentIndex);

    // Handle negative values and wrap around
    while (segmentIndex < 0) {
        segmentIndex += players.length;
    }
    segmentIndex = segmentIndex % players.length;

    return players[segmentIndex];
}

// Start spin
function startSpin() {
    if (isSpinning || players.length === 0) {
        if (players.length === 0) {
            alert('Vui lòng import danh sách người chơi trước!');
        }
        return;
    }

    // Stop slow spin first and wait a bit to ensure it's stopped
    stopSlowSpin();

    // Normalize currentRotation before starting new spin
    currentRotation = currentRotation % 360;
    if (currentRotation < 0) currentRotation += 360;

    // Set spinning state
    isSpinning = true;
    document.getElementById('playButton').classList.add('disabled');

    // Calculate random result
    const randomIndex = Math.floor(Math.random() * players.length);
    const winner = players[randomIndex];

    // Calculate rotation
    // Pointer is at top of wheel (270° in canvas coordinates)
    // In canvas: 0° = right (3 o'clock), 90° = bottom, 180° = left, 270° = top (where pointer is)
    // CSS transform rotates counter-clockwise (positive rotation = counter-clockwise)

    const anglePerPlayer = 360 / players.length;

    // Calculate the center angle of the selected segment in canvas coordinates
    // Segment 0 starts at 0° (right/3 o'clock), so center is at anglePerPlayer/2
    const segmentCenterAngle = randomIndex * anglePerPlayer + anglePerPlayer / 2;

    // When we rotate the wheel by 'rotation' degrees (CSS, counter-clockwise),
    // the canvas angle of each point increases by 'rotation' degrees (clockwise in canvas)
    // So after rotation, segment center will be at: (segmentCenterAngle + rotation) mod 360

    // We want the segment center to be at 270° (top, where pointer is)
    // So: (segmentCenterAngle + rotation) mod 360 = 270
    // Therefore: rotation = (270 - segmentCenterAngle) mod 360

    let targetRotation = (270 - segmentCenterAngle + 360) % 360;

    // Add multiple full rotations for effect (5 full rotations)
    const totalRotation = 360 * 5 + targetRotation;

    // Animate
    const startTime = Date.now();
    const duration = 10000; // 10 seconds
    const startRotation = currentRotation; // Use normalized rotation
    let hasZoomed = false; // Flag to track if zoom has occurred

    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const remainingTime = duration - elapsed;

        // Zoom in when 5 seconds remaining (at 5 seconds elapsed)
        if (!hasZoomed && elapsed >= 5000) {
            zoomIn();
            hasZoomed = true;
        }

        // Easing function (ease-out)
        const easeOut = 1 - Math.pow(1 - progress, 3);

        currentRotation = startRotation + totalRotation * easeOut;
        wheelWrapper.style.transform = `rotate(${currentRotation}deg)`;

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            // Animation complete - calculate actual winner from final rotation
            const actualWinner = calculateWinnerFromRotation(currentRotation);
            setTimeout(() => {
                showResult(actualWinner || winner); // Fallback to original winner if calculation fails
            }, 500);
        }
    }

    animate();
}

// Show result popup
function showResult(winner) {
    results.push({
        winner: winner,
        timestamp: new Date().toLocaleString('vi-VN')
    });
    updateResultCounter();
    saveData();

    // Show winner popup
    const popupContent = document.querySelector('.popup-content');
    popupContent.classList.remove('show-results'); // Bỏ class để giữ width mặc định

    document.getElementById('popupTitle').textContent = 'Kết quả vòng quay';
    document.getElementById('congratulationsText').style.display = 'block';
    document.getElementById('congratulationsText').textContent = 'Chúc mừng';
    document.getElementById('winnerName').textContent = winner;
    document.getElementById('winnerName').style.display = 'block';
    document.getElementById('resultsList').style.display = 'none';
    document.getElementById('shareBtn').style.display = 'none';
    document.getElementById('deleteResult').classList.remove('hidden'); // Hiển thị button delete
    document.getElementById('resultPopup').classList.add('show');
    document.body.classList.add('popup-open');

    // Reset spinning state immediately
    isSpinning = false;

    // Normalize currentRotation to 0-360 range to avoid issues
    currentRotation = currentRotation % 360;
    if (currentRotation < 0) currentRotation += 360;
}

// Update result counter
function updateResultCounter() {
    const counter = document.getElementById('resultCounter');
    if (counter) {
        counter.textContent = results.length;
    }
}

// Show results history
function showResults() {
    if (results.length === 0) {
        alert('Chưa có kết quả nào!');
        return;
    }

    // Show results list popup
    const popupContent = document.querySelector('.popup-content');
    popupContent.classList.add('show-results'); // Thêm class để tăng width

    document.getElementById('popupTitle').textContent = 'Kết quả vòng quay';
    document.getElementById('congratulationsText').style.display = 'none';
    document.getElementById('winnerName').style.display = 'none';
    document.getElementById('resultsList').style.display = 'flex'; // Đổi thành flex
    document.getElementById('shareBtn').style.display = 'none'; // Bỏ button đóng
    document.getElementById('deleteResult').classList.add('hidden'); // Ẩn button delete trong popup lịch sử

    // Build results list HTML
    const resultsList = document.getElementById('resultsList');
    resultsList.innerHTML = '';

    results.forEach((result, index) => {
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item no-hover'; // Thêm class no-hover để bỏ hiệu ứng
        resultItem.textContent = result.winner; // Bỏ STT
        resultsList.appendChild(resultItem);
    });

    document.getElementById('resultPopup').classList.add('show');
    document.body.classList.add('popup-open');
}

// Delete last result (không lưu kết quả)
function deleteLastResult() {
    if (results.length > 0) {
        results.pop();
        updateResultCounter();
        saveData();
        closePopup();
    }
}

// Close popup and zoom out
function closePopup() {
    document.getElementById('resultPopup').classList.remove('show');
    document.body.classList.remove('popup-open');
    zoomOut();
    document.getElementById('playButton').classList.remove('disabled');

    // Ensure isSpinning is false and normalize rotation
    isSpinning = false;
    currentRotation = currentRotation % 360;
    if (currentRotation < 0) currentRotation += 360;

    // Resume slow spin after closing popup
    setTimeout(() => {
        if (!isSpinning) {
            startSlowSpin();
        }
    }, 500);
}

// Handle window resize
window.addEventListener('resize', () => {
    if (wheelWrapper && canvas) {
        setCanvasSize();
        drawWheel();
    }
});

