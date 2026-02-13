(function () {
    var body = document.body;
    var resultPopup = document.getElementById('resultPopup');
    var btnEggInPopup = document.getElementById('btnEggInPopup');

    if (btnEggInPopup && resultPopup) {
        btnEggInPopup.addEventListener('click', function () {
            resultPopup.classList.remove('show');
            body.classList.remove('popup-open');
            document.getElementById('playButton').classList.remove('disabled');
            window.unifiedOnEggPopupClose = function () {
                body.classList.remove('view-egg');
                resultPopup.classList.add('show');
                body.classList.add('popup-open');
                window.unifiedOnEggPopupClose = null;
            };
            body.classList.add('view-egg');
        });
    }
})();

(function () {
    // 21 quả trứng, thứ tự quà xáo ngẫu nhiên
    var TOTAL = 21;
    var EGG_STORAGE_KEY = 'egg-game-state';
    var GIFT_LIST = [
        'Quạt hộp Senko', 'Quạt hộp Senko', 'Quạt hộp Senko',
        'Bếp ga đơn Duxton', 'Bếp ga đơn Duxton', 'Bếp ga đơn Duxton',
        'Nồi lẩu điện sunhouse', 'Nồi lẩu điện sunhouse', 'Nồi lẩu điện sunhouse',
        'Bộ 3 nồi inox Green Cook', 'Bộ 3 nồi inox Green Cook',
        'Bộ 3 nồi inox Sunhouse',
        'Quạt lửng Senko', 'Quạt lửng Senko', 'Quạt lửng Senko',
        'Nồi cơm Sunhouse 1.8 lít', 'Nồi cơm Sunhouse 1.8 lít', 'Nồi cơm Sunhouse 1.8 lít',
        'Bàn ủi khô Philips', 'Bàn ủi khô Philips', 'Bàn ủi khô Philips'
    ];

    function shuffleArray(arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = a[i];
            a[i] = a[j];
            a[j] = t;
        }
        return a;
    }

    function loadEggState() {
        try {
            var raw = localStorage.getItem(EGG_STORAGE_KEY);
            if (raw) {
                var data = JSON.parse(raw);
                if (Array.isArray(data.opened) && data.opened.length === TOTAL &&
                    Array.isArray(data.giftOrder) && data.giftOrder.length === TOTAL) {
                    return {
                        opened: data.opened,
                        giftOrder: data.giftOrder
                    };
                }
            }
        } catch (e) {
            console.warn('Không đọc được trạng thái đập trứng từ localStorage:', e.message);
        }
        return null;
    }

    function saveEggState(opened, giftOrder) {
        try {
            localStorage.setItem(EGG_STORAGE_KEY, JSON.stringify({
                opened: opened,
                giftOrder: giftOrder
            }));
        } catch (e) {
            console.warn('Lưu trạng thái đập trứng vào localStorage thất bại:', e.message);
        }
    }

    var savedState = loadEggState();
    var FIXED_GIFTS;
    var opened;
    if (savedState) {
        FIXED_GIFTS = savedState.giftOrder.map(function (title) { return { title: title }; });
        opened = savedState.opened.slice();
    } else {
        var shuffled = shuffleArray(GIFT_LIST);
        FIXED_GIFTS = shuffled.map(function (title) { return { title: title }; });
        opened = new Array(TOTAL).fill(false);
        saveEggState(opened, shuffled);
    }

    var board = document.getElementById('eggBoard');
    var overlay = document.getElementById('eggOverlay');
    var popupTitle = document.getElementById('eggPopupTitle');
    var prizeName = document.getElementById('eggPrizeName');
    var popupEggImg = document.getElementById('eggPopupEggImg');
    var popupGiftImg = document.getElementById('eggPopupGiftImg');
    var popupGiftText = document.getElementById('eggPopupGiftText');
    var confetti = document.getElementById('eggConfetti');
    var eggPopup = document.getElementById('eggPopup');
    if (!board || !overlay) return;
    var eggPrize = new Array(TOTAL).fill(null);
    for (var i = 0; i < TOTAL; i++) {
        if (opened[i]) {
            eggPrize[i] = FIXED_GIFTS[i];
        }
    }
    var revealTimer = null;

    function renderBoard() {
        board.innerHTML = '';
        for (var i = 0; i < TOTAL; i++) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'egg' + (opened[i] ? ' is-opened' : '');
            btn.dataset.index = String(i);
            btn.setAttribute('aria-label', 'Trứng số ' + (i + 1));
            var shape = document.createElement('div');
            shape.className = 'egg-shape';
            var eggBase = document.createElement('img');
            eggBase.className = 'egg-base';
            eggBase.alt = opened[i] ? 'Trứng đã đập' : 'Trứng chưa đập';
            eggBase.src = opened[i] ? '/images/egg-png/opened.png' : '/images/egg-png/closed.png';
            var num = document.createElement('div');
            num.className = 'egg-number';
            num.textContent = String(i + 1);
            shape.appendChild(eggBase);
            shape.appendChild(num);
            btn.appendChild(shape);
            if (opened[i]) {
                var giftText = document.createElement('div');
                giftText.className = 'egg-gift-text';
                giftText.textContent = FIXED_GIFTS[i].title;
                btn.appendChild(giftText);
            }
            (function (idx) { btn.addEventListener('click', function () { onEggClick(idx); }); })(i);
            board.appendChild(btn);
        }
    }
    function pickPrizeForEgg(i) {
        if (eggPrize[i]) return eggPrize[i];
        eggPrize[i] = FIXED_GIFTS[i];
        return FIXED_GIFTS[i];
    }
    function spawnConfetti() {
        var colors = ['#a31c1e', '#7a1417', '#a67c00', '#fffdd0', '#1b4d3e', '#ffffff'];
        for (var i = 0; i < 46; i++) {
            var p = document.createElement('div');
            p.className = 'confetti-piece';
            p.style.background = colors[Math.floor(Math.random() * colors.length)];
            p.style.left = (Math.random() * 100) + '%';
            p.style.top = (-10 - Math.random() * 30) + '%';
            p.style.setProperty('--x0', (Math.random() * 40 - 20) + 'px');
            p.style.setProperty('--y0', (Math.random() * 20) + 'px');
            p.style.setProperty('--x1', (Math.random() * 520 - 260) + 'px');
            p.style.setProperty('--y1', (420 + Math.random() * 380) + 'px');
            p.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
            p.style.animationDelay = (Math.random() * 160) + 'ms';
            p.style.animationDuration = (900 + Math.random() * 700) + 'ms';
            confetti.appendChild(p);
        }
        setTimeout(function () { confetti.innerHTML = ''; }, 2200);
    }
    function openOverlay(i) {
        overlay.classList.add('show');
        popupTitle.textContent = 'Đang mở quà...';
        prizeName.textContent = '---';
        prizeName.classList.remove('show');
        if (popupGiftImg) { popupGiftImg.removeAttribute('src'); popupGiftImg.classList.remove('show'); }
        if (popupGiftText) { popupGiftText.textContent = ''; popupGiftText.classList.remove('show'); }
        popupEggImg.src = '/images/egg-png/closed.png';
        popupEggImg.classList.add('is-shaking');
        confetti.innerHTML = '';
        if (revealTimer) clearTimeout(revealTimer);
        revealTimer = setTimeout(function () {
            var gift = pickPrizeForEgg(i);
            popupTitle.textContent = 'Chúc mừng!';
            popupEggImg.classList.remove('is-shaking');
            popupEggImg.src = '/images/egg-png/opened.png';
            if (popupGiftImg) popupGiftImg.classList.remove('show');
            if (popupGiftText) {
                popupGiftText.textContent = gift.title;
                popupGiftText.classList.add('show');
            }
            spawnConfetti();
        }, 5000);
    }
    function closeOverlay() {
        if (window.unifiedOnEggPopupClose) {
            window.unifiedOnEggPopupClose();
            window.unifiedOnEggPopupClose = null;
        }
        overlay.classList.remove('show');
        if (revealTimer) { clearTimeout(revealTimer); revealTimer = null; }
        confetti.innerHTML = '';
        if (popupGiftImg) popupGiftImg.classList.remove('show');
        if (popupGiftText) popupGiftText.classList.remove('show');
        popupEggImg.classList.remove('is-shaking');
    }
    function onEggClick(i) {
        if (opened[i]) return;
        opened[i] = true;
        saveEggState(opened, FIXED_GIFTS.map(function (g) { return g.title; }));
        renderBoard();
        openOverlay(i);
    }
    overlay.addEventListener('click', closeOverlay);
    if (eggPopup) eggPopup.addEventListener('click', function (e) { e.stopPropagation(); closeOverlay(); });
    renderBoard();
})();
