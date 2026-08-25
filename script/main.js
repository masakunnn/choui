const CONFIG = {
    marginRatio: 0.90,
    aspectRatio: 16/9,
    animDuration: 700,
    fontName: "sans-serif"
};

const targetStationNames = ["青森", "青森港", "八戸港", "下北", "深浦", "竜飛", "むつ小川原", "秋田", "宮古", "大船渡", "釜石", "久慈", "石巻", "仙台新港", "鮎川", "酒田", "小名浜"];
let expandedElement = null;
let placeholderElement = null;
let isAnimating = false;

const ALL_AREA_CODES = [
    '01', '02', '03', '04', '05', '06', '07', '08', '12', '13', '14', '15',
    '16', '17', '18', '22', '23', '24', '26', '27', '28', '30', '31', '32',
    '33', '34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44',
    '45', '46', '47'
];

const REGION_ORDER = ['北海道', '東北', '関東甲信越', '北陸', '東海', '近畿', '中国', '四国', '九州', '沖縄'];

// PC以外の端末（スマホ・タブレット）判定とメッセージオーバーレイ表示
function checkDeviceAndShowOverlay() {
    const isMobileOrTablet = window.innerWidth <= 1024 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    let overlay = document.getElementById('pc-only-overlay');

    if (isMobileOrTablet) {
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'pc-only-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background-color: rgba(0, 0, 0, 0.95);
                z-index: 999999;
                display: flex;
                justify-content: center;
                align-items: center;
                text-align: center;
                padding: 20px;
                box-sizing: border-box;
            `;

            const message = document.createElement('div');
            message.style.cssText = `
                color: #ffffff;
                font-size: clamp(28px, 7vw, 72px);
                font-weight: bold;
                line-height: 1.4;
                word-break: break-all;
                font-family: sans-serif;
            `;
            message.textContent = 'PCで開いてね！！！！！！！！！';

            overlay.appendChild(message);
            document.body.appendChild(overlay);
        } else {
            overlay.style.display = 'flex';
        }
    } else {
        if (overlay) {
            overlay.style.display = 'none';
            overlay.style.pointerEvents = 'none';
        }
    }
}

function getRegionNameFromAreaCode(areaCode) {
    if (!areaCode) return 'その他';
    const c = areaCode.substring(0, 2);
    if (c === '01') return '北海道';
    if (['02', '03', '04', '05', '06', '07'].includes(c)) return '東北';
    if (['08', '12', '13', '14', '15'].includes(c)) return '関東甲信越';
    if (['16', '17', '18'].includes(c)) return '北陸';
    if (['22', '23', '24'].includes(c)) return '東海';
    if (['26', '27', '28', '30'].includes(c)) return '近畿';
    if (['31', '32', '33', '34', '35'].includes(c)) return '中国';
    if (['36', '37', '38', '39'].includes(c)) return '四国';
    if (['40', '41', '42', '43', '44', '45', '46'].includes(c)) return '九州';
    if (c === '47') return '沖縄';
    return 'その他';
}

function getAreaNameFromCodes(codes) {
    if (!codes || !Array.isArray(codes) || codes.length === 0 || codes.length > 10) return '全国';
    const map = {
        '01': '北海道',
        '02': '東北', '03': '東北', '04': '東北', '05': '東北', '06': '東北', '07': '東北',
        '08': '関東甲信越', '12': '関東甲信越', '13': '関東甲信越', '14': '関東甲信越', '15': '関東甲信越',
        '16': '北陸', '17': '北陸', '18': '北陸',
        '22': '東海', '23': '東海', '24': '東海',
        '26': '近畿', '27': '近畿', '28': '近畿', '30': '近畿',
        '31': '中国', '32': '中国', '33': '中国', '34': '中国', '35': '中国',
        '36': '四国', '37': '四国', '38': '四国', '39': '四国',
        '40': '九州', '41': '九州', '42': '九州', '43': '九州', '44': '九州', '45': '九州', '46': '九州',
        '47': '沖縄',
    };
    return map[codes[0]] || '全国';
}

// 画面最上部にヘッダーを横幅いっぱいに固定表示（左右隙間なし）する処理
function adjustHeaderPosition() {
    const container = document.getElementById('header-image-container');
    if (!container) return;

    if (container.style.display === 'none') {
        container.style.pointerEvents = 'none';
    } else {
        container.style.pointerEvents = 'none';
    }

    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = 'auto';
    container.style.transform = 'none';
    container.style.marginTop = '0px';
    container.style.zIndex = '9999';

    const img = document.getElementById('header-img');
    if (img) {
        img.style.width = '100%';
        img.style.height = 'auto';
        img.style.objectFit = 'fill';
        img.style.pointerEvents = 'none';
        if (img.style.display === 'none') {
            img.style.pointerEvents = 'none';
        }
    }

    const grid = document.getElementById('tohoku-grid');
    if (grid) {
        const calculatedHeaderBarHeight = Math.max(40, Math.round(window.innerWidth * (65 / 1920)));
        grid.style.marginTop = `${calculatedHeaderBarHeight}px`;
    }
}

// 画面上部にヘッダー画像（header_全国.png など）を表示・更新する処理
function updateHeaderImage(selectedAreaCodes) {
    const areaName = getAreaNameFromCodes(selectedAreaCodes);
    let container = document.getElementById('header-image-container');

    if (!container) {
        container = document.createElement('div');
        container.id = 'header-image-container';
        container.style.cssText = 'width: 100%; position: fixed; top: 0; left: 0; z-index: 9999; pointer-events: none;';
        const grid = document.getElementById('tohoku-grid');
        if (grid && grid.parentNode) {
            grid.parentNode.insertBefore(container, grid);
        } else if (document.body && document.body.firstChild) {
            document.body.insertBefore(container, document.body.firstChild);
        } else if (document.body) {
            document.body.appendChild(container);
        }
    } else {
        if (container.style.display === 'none') {
            container.style.pointerEvents = 'none';
        }
    }

    const paths = [
        `Image/Header/header_${areaName}.png`,
        `Image/header_${areaName}.png`,
        `header_${areaName}.png`,
        `Image/Header/header_${areaName}.PNG`,
        `Image/header_${areaName}.PNG`,
        `header_${areaName}.PNG`,
        `Image/Header/header.png`,
        `Image/header.png`,
        `header.png`
    ];

    let pathIdx = 0;
    container.innerHTML = `<img id="header-img" src="${paths[0]}" alt="ヘッダー ${areaName}" style="width: 100%; height: auto; object-fit: fill; pointer-events: none; display: block;">`;

    const img = document.getElementById('header-img');
    if (img) {
        img.onload = function() {
            adjustHeaderPosition();
        };
        img.onerror = function() {
            pathIdx++;
            if (pathIdx < paths.length) {
                this.src = paths[pathIdx];
            } else {
                this.onerror = null;
            }
        };
    }

    adjustHeaderPosition();
}

// housou.png の最前面配置・不透明領域クリック判定・全画面化＆housoumode.png表示処理
function updateHousouImage() {
    let container = document.getElementById('housou-image-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'housou-image-container';
        container.style.cssText = 'width: 100%; position: fixed; top: 0; left: 0; z-index: 10000; pointer-events: none;';
        document.body.appendChild(container);
    } else {
        if (container.style.display === 'none') {
            container.style.pointerEvents = 'none';
        }
    }

    const paths = [
        'Image/Header/housou.png',
        'Image/housou.png',
        'housou.png',
        'Image/Header/housou.PNG',
        'Image/housou.PNG',
        'housou.PNG'
    ];

    let pathIdx = 0;
    const img = new Image();
    img.crossOrigin = 'anonymous';

    function tryNextPath() {
        if (pathIdx < paths.length) {
            img.src = paths[pathIdx];
        }
    }

    img.onerror = function() {
        pathIdx++;
        tryNextPath();
    };

    img.onload = function() {
        setupHousouCanvas(img, container);
    };

    tryNextPath();
}

function setupHousouCanvas(img, container) {
    container.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.id = 'housou-canvas';
    canvas.style.cssText = 'width: 100%; height: auto; display: block; pointer-events: none; cursor: pointer;';

    const renderWidth = img.naturalWidth || 1920;
    const renderHeight = img.naturalHeight || 1080;
    canvas.width = renderWidth;
    canvas.height = renderHeight;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, renderWidth, renderHeight);

    container.appendChild(canvas);

    function checkOpacityAndSetPointerEvents(clientX, clientY) {
        if (container.style.display === 'none' || canvas.style.display === 'none') {
            canvas.style.pointerEvents = 'none';
            container.style.pointerEvents = 'none';
            return false;
        }

        const rect = canvas.getBoundingClientRect();
        if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
            canvas.style.pointerEvents = 'none';
            return false;
        }

        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = Math.floor((clientX - rect.left) * scaleX);
        const y = Math.floor((clientY - rect.top) * scaleY);

        let isOpaque = false;
        try {
            const pixel = ctx.getImageData(x, y, 1, 1).data;
            if (pixel[3] > 10) {
                isOpaque = true;
            }
        } catch (err) {
            isOpaque = false;
        }

        if (isOpaque) {
            canvas.style.pointerEvents = 'auto';
            return true;
        } else {
            canvas.style.pointerEvents = 'none';
            return false;
        }
    }

    window.addEventListener('pointermove', (e) => {
        checkOpacityAndSetPointerEvents(e.clientX, e.clientY);
    }, { passive: true });

    canvas.addEventListener('click', (e) => {
        const isOpaque = checkOpacityAndSetPointerEvents(e.clientX, e.clientY);
        if (isOpaque) {
            e.stopPropagation();
            triggerHousouMode();
        } else {
            canvas.style.pointerEvents = 'none';
            const underlyingEl = document.elementFromPoint(e.clientX, e.clientY);
            if (underlyingEl) {
                underlyingEl.click();
            }
        }
    });
}

// 全画面状態の変化を監視し、全画面時は header と housou.png を非表示＆当たり判定0にする処理
function handleFullscreenChange() {
    const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
    const headerContainer = document.getElementById('header-image-container');
    const housouContainer = document.getElementById('housou-image-container');

    if (headerContainer) {
        if (isFullscreen) {
            headerContainer.style.display = 'none';
            headerContainer.style.pointerEvents = 'none';
        } else {
            headerContainer.style.display = 'block';
            headerContainer.style.pointerEvents = 'none';
        }
    }

    if (housouContainer) {
        if (isFullscreen) {
            housouContainer.style.display = 'none';
            housouContainer.style.pointerEvents = 'none';
        } else {
            housouContainer.style.display = 'block';
        }
    }

    adjustHeaderPosition();
}

function triggerHousouMode() {
    // 全画面表示に移行
    if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else if (document.documentElement.webkitRequestFullscreen) {
            document.documentElement.webkitRequestFullscreen();
        }
    }

    let modeOverlay = document.getElementById('housoumode-overlay');
    if (!modeOverlay) {
        modeOverlay = document.createElement('div');
        modeOverlay.id = 'housoumode-overlay';
        modeOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: 100000;
            pointer-events: none;
            display: flex;
            justify-content: center;
            align-items: center;
            opacity: 0;
            transition: opacity 0.5s ease;
            background-color: transparent;
        `;

        const paths = [
            'Image/Header/housoumode.png',
            'Image/housoumode.png',
            'housoumode.png',
            'Image/Header/housoumode.PNG',
            'Image/housoumode.PNG',
            'housoumode.PNG'
        ];

        let pathIdx = 0;
        const img = document.createElement('img');
        img.style.cssText = 'width: 100%; height: 100%; object-fit: contain; display: block; pointer-events: none;';
        img.src = paths[0];
        img.onerror = function() {
            pathIdx++;
            if (pathIdx < paths.length) {
                this.src = paths[pathIdx];
            } else {
                this.onerror = null;
            }
        };

        modeOverlay.appendChild(img);
        document.body.appendChild(modeOverlay);
    }

    // 0.5秒フェードイン -> 2.0秒表示 -> 0.5秒フェードアウト（合計3秒）
    modeOverlay.style.display = 'flex';
    modeOverlay.style.pointerEvents = 'none';
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            modeOverlay.style.opacity = '1';
        });
    });

    setTimeout(() => {
        modeOverlay.style.opacity = '0';
        modeOverlay.style.pointerEvents = 'none';
    }, 2300);

    setTimeout(() => {
        modeOverlay.style.display = 'none';
        modeOverlay.style.pointerEvents = 'none';
    }, 3000);
}

async function startApp(areaCodes, areaName) {
    const menu = document.getElementById('selection-menu');
    if (menu) menu.style.display = 'none';
    const grid = document.getElementById('tohoku-grid');
    if (grid) grid.style.display = 'grid';
    
    await init(areaCodes.split(','));
}

function updateScales() {
    requestAnimationFrame(() => {
        document.querySelectorAll('.graph-box').forEach(box => {
            if (!box.classList.contains('expanded')) {
                const scale = box.offsetWidth / 3840;
                const layer = box.querySelector('.scaling-layer');
                if (layer) {
                    layer.style.transform = `scale(${scale})`;
                }
            } else if (expandedElement) {
                const finalWidth = CONFIG.fixedWidth || (window.innerWidth * CONFIG.marginRatio);
                const viewportWidth = document.documentElement.clientWidth;
                const viewportHeight = window.innerHeight;
                const finalHeight = finalWidth / CONFIG.aspectRatio;
                
                expandedElement.style.top = (viewportHeight - finalHeight) / 2 + 'px';
                expandedElement.style.left = (viewportWidth - finalWidth) / 2 + 'px';
                
                const layer = expandedElement.querySelector('.scaling-layer');
                if (layer) layer.style.transform = `scale(${finalWidth / 3840})`;
            }
        });
    });
}

function handleCardClick(el) {
    if (expandedElement || isAnimating) return;
    expandCard(el);
}

function expandCard(el) {
    isAnimating = true;
    expandedElement = el;
    const scrim = document.getElementById('scrim');
    const rect = el.getBoundingClientRect();
    
    placeholderElement = document.createElement('div');
    placeholderElement.className = 'placeholder';
    el.parentNode.insertBefore(placeholderElement, el);

    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight;
    
    let finalWidth = viewportWidth * CONFIG.marginRatio;
    if (finalWidth / CONFIG.aspectRatio > viewportHeight * CONFIG.marginRatio) {
        finalWidth = viewportHeight * CONFIG.marginRatio * CONFIG.aspectRatio;
    }
    const finalHeight = finalWidth / CONFIG.aspectRatio;

    el.style.transition = 'none';
    el.style.position = 'fixed';
    el.style.top = rect.top + 'px';
    el.style.left = rect.left + 'px';
    el.style.width = rect.width + 'px';
    el.style.height = rect.height + 'px';
    el.style.margin = '0';
    el.style.zIndex = '2000';

    el.offsetHeight; 

    scrim.style.display = 'block';
    el.classList.add('expanded');

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            scrim.style.opacity = '1';
            const duration = `${CONFIG.animDuration}ms`;
            const easing = 'cubic-bezier(0.2, 1, 0.01, 1)';

            el.style.transition = `all ${duration} ${easing}`;
            scrim.style.transition = `opacity ${duration} ${easing}`;

            const layer = el.querySelector('.scaling-layer');
            if (layer) {
                layer.style.transition = `transform ${duration} ${easing}`;
                layer.style.transform = `scale(${finalWidth / 3840})`;
            }

            el.style.top = (viewportHeight - finalHeight) / 2 + 'px';
            el.style.left = (viewportWidth - finalWidth) / 2 + 'px';
            el.style.width = finalWidth + 'px';
            el.style.height = finalHeight + 'px';

            if (layer) layer.style.transform = `scale(${finalWidth / 3840})`;

            setTimeout(() => {
                isAnimating = false; 
            }, CONFIG.animDuration);
            
        });
    });
}

function closeExpanded() {
    if (!expandedElement || isAnimating) return;
    isAnimating = true;

    const el = expandedElement;
    const scrim = document.getElementById('scrim');
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const rect = placeholderElement.getBoundingClientRect();

    const duration = `${CONFIG.animDuration}ms`;
    const easing = 'cubic-bezier(0.2, 1, 0.01, 1)';

    el.style.transition = 'none';
    const currentTop = parseFloat(el.style.top);
    const currentLeft = parseFloat(el.style.left);

    el.style.position = 'absolute';
    el.style.top = (currentTop + scrollTop) + 'px';
    el.style.left = currentLeft + 'px';

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            el.style.transition = `all ${duration} ${easing}`;
            scrim.style.transition = `opacity ${duration} ${easing}`;

            const layer = el.querySelector('.scaling-layer');
            if (layer) {
                layer.style.transition = `transform ${duration} ${easing}`;
                layer.style.transform = `scale(${rect.width / 3840})`;
            }

            el.style.top = (rect.top + scrollTop) + 'px';
            el.style.left = rect.left + 'px';
            el.style.width = rect.width + 'px';
            el.style.height = rect.height + 'px';

            scrim.style.opacity = '0';
        });
    });

    setTimeout(() => {
        isAnimating = false;
        el.classList.remove('expanded');
        
        el.style.position = '';
        el.style.top = ''; 
        el.style.left = ''; 
        el.style.width = ''; 
        el.style.height = ''; 
        el.style.zIndex = '';
        
        if (placeholderElement) {
            placeholderElement.parentNode.replaceChild(el, placeholderElement);
            placeholderElement = null;
        }
        scrim.style.display = 'none';
        expandedElement = null;
    }, CONFIG.animDuration);
}

async function init(selectedAreaCodes = ALL_AREA_CODES) {
    try {
        checkDeviceAndShowOverlay();
        updateHeaderImage(selectedAreaCodes);
        updateHousouImage();

        if (!selectedAreaCodes || !Array.isArray(selectedAreaCodes) || selectedAreaCodes.length === 0) {
            selectedAreaCodes = ALL_AREA_CODES;
        }

        const [areaRes, nhkRes] = await Promise.allSettled([
            fetch('https://www.jma.go.jp/bosai/tidelevel/const/tide_area.json').then(r => r.json()),
            fetch('nhkname.json').then(r => r.ok ? r.json() : {})
        ]);

        const areaData = areaRes.status === 'fulfilled' ? areaRes.value : null;
        const nhkNames = nhkRes.status === 'fulfilled' ? nhkRes.value : {};
        const grid = document.getElementById('tohoku-grid');
        if (!grid) return;

        grid.innerHTML = '';

        const now = new Date();
        const yyyy = now.getFullYear();
        const yyyymmdd = yyyy + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
        const mmdd = String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');

        // 地盤変動による「ずれ」表示対象の観測所一覧
        const zureStations = ["久慈", "宮古", "釜石", "大船渡", "鮎川", "石巻", "仙台新港", "小名浜", "鹿島"];
        let stationsToRender = [];
        if (!areaData) throw new Error("気象庁データが取得できませんでした");
        
        for (const areaCode in areaData) {
            if (!selectedAreaCodes.some(code => areaCode.startsWith(code))) continue;
        
            const area = areaData[areaCode];
            if (!area.class30s) continue;
        
            for (const class30 of area.class30s) {
                if (!class30.stations) continue;
        
                for (const found of class30.stations) {
                    let rawAgency = found.typeName || class30.typeName || "";
                    rawAgency = rawAgency.replace(/[（\(].*?[）\)]/g, "");

                    let agencyName = (rawAgency === "" || rawAgency === "気象庁")
                        ? "気象庁"
                        : `気象庁・${rawAgency}`;

                    stationsToRender.push({
                        name: found.name,
                        jmaCode: found.code,
                        regionName: getRegionNameFromAreaCode(areaCode),
                        record: found.max?.level ?? null,
                        level4: class30.standard?.level4 ?? null,
                        level5: class30.standard?.level5 ?? null,
                        agency: agencyName
                    });
                }
            }
        }

        stationsToRender = Array.from(new Map(stationsToRender.map(s => [s.jmaCode, s])).values());
        
        stationsToRender.sort((a, b) => {
            const orderA = REGION_ORDER.indexOf(a.regionName);
            const orderB = REGION_ORDER.indexOf(b.regionName);
            if (orderA !== orderB) {
                return (orderA === -1 ? 999 : orderA) - (orderB === -1 ? 999 : orderB);
            }
            return parseInt(a.jmaCode) - parseInt(b.jmaCode);
        });

        const fragment = document.createDocumentFragment();
        let currentRegion = null;

        for (const stInfo of stationsToRender) {
            if (stInfo.regionName !== currentRegion) {
                currentRegion = stInfo.regionName;

                const mapCard = document.createElement('div');
                mapCard.className = 'graph-box image-box';
                mapCard.innerHTML = `<img src="Image/Area/${currentRegion}.png" alt="${currentRegion}広域図" onerror="this.style.display='none'">`;
                fragment.appendChild(mapCard);
            }

            const entry = Object.values(nhkNames).find(item => item.station_name === stInfo.name);
            const displayName = entry ? entry.nhk_name : stInfo.name;

            const box = document.createElement('div');
            box.className = 'graph-box';
            box.id = `container-${stInfo.jmaCode}`;
            box.onclick = () => handleCardClick(box);
            box._stInfo = stInfo;
            
            const useZure = zureStations.includes(stInfo.name);
            const legendHtml = useZure 
                ? `<img src="Image/hanrei.png" alt="凡例"><img src="Image/zure.png" class="zure-overlay" alt="偏差凡例" style="position: absolute; top: 0; left: 0; width: 100%; z-index: 21;">`
                : `<img src="Image/hanrei.png" alt="凡例">`;

            box.innerHTML = `
                <div class="scaling-layer">
                    <div class="station-label" style="font-family: sans-serif;">${displayName}</div>
                    <div class="agency-label" style="font-family: sans-serif;">${stInfo.agency}</div>
                    <div class="legend-box" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 100%; z-index: 20;">
                        ${legendHtml}
                    </div>
                    <div class="chart-layer"><canvas id="chart-${stInfo.jmaCode}"></canvas></div>
                    <div id="tooltip-${stInfo.jmaCode}" class="custom-tooltip" style="font-family: sans-serif;"></div>
                </div>`;

            fragment.appendChild(box);
        }
        
        grid.appendChild(fragment);

        // 画面入退出の監視と確実な再描画ロジック
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(async (entry) => {
                const box = entry.target;
                if (entry.isIntersecting) {
                    if (box._stInfo && !box._chartDrawn) {
                        box._chartDrawn = true;
                        box._chartInstance = await drawChart(box._stInfo, yyyy, yyyymmdd, mmdd);
                    }
                } else {
                    // 画面外に出たらChartを破棄し、canvas要素を完全初期化して次回表示に備える
                    if (box._chartDrawn) {
                        if (box._chartInstance) {
                            box._chartInstance.destroy();
                            box._chartInstance = null;
                        }
                        box._chartDrawn = false;
                        
                        // canvas要素を新品に置換することで次回表示時に確実に100%再描画されるようにする
                        const chartLayer = box.querySelector('.chart-layer');
                        if (chartLayer && box._stInfo) {
                            chartLayer.innerHTML = `<canvas id="chart-${box._stInfo.jmaCode}"></canvas>`;
                        }
                    }
                }
            });
        }, { rootMargin: '300px 0px' });

        document.querySelectorAll('.graph-box:not(.image-box)').forEach(box => {
            observer.observe(box);
        });

        updateScales(); 
        window.addEventListener('resize', () => {
            checkDeviceAndShowOverlay();
            adjustHeaderPosition();
            updateScales();
        });
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        setTimeout(updateScales, 100);
    } catch (e) {
        console.error("初期化中にエラーが発生しました:", e);
    }
}

window.addEventListener('DOMContentLoaded', async () => {
    checkDeviceAndShowOverlay();
    await document.fonts.ready;
    
    const params = new URLSearchParams(window.location.search);
    const area = params.get('area');
    
    const areaMap = {
        'hokkaido': ['01'],
        'tohoku': ['02', '03', '04', '05', '06', '07'],
        'kanto': ['08', '12', '13', '14', '15'],
        'hokuriku': ['16', '17', '18'],
        'tokai': ['22', '23', '24'],
        'kinki': ['26', '27', '28', '30'],
        'chugoku': ['31', '32', '33', '34', '35'],
        'sikoku': ['36', '37', '38', '39'],
        'kyusyu': ['40', '41', '42', '43', '44', '45', '46'],
        'okinawa': ['47']
    };

    if (area && areaMap[area]) {
        init(areaMap[area]);
    } else {
        const allAreaCodes = Object.values(areaMap).flat();
        init(allAreaCodes);
    }
});

function getAreaNameFromCodes(codes) {
    if (!codes || !Array.isArray(codes) || codes.length === 0 || codes.length > 10) return '全国';
    const map = {
        '01': '北海道',
        '02': '東北', '03': '東北', '04': '東北', '05': '東北', '06': '東北', '07': '東北',
        '08': '関東甲信越', '12': '関東甲信越', '13': '関東甲信越', '14': '関東甲信越', '15': '関東甲信越',
        '16': '北陸', '17': '北陸', '18': '北陸',
        '22': '東海', '23': '東海', '24': '東海',
        '26': '近畿', '27': '近畿', '28': '近畿', '30': '近畿',
        '31': '中国', '32': '中国', '33': '中国', '34': '中国', '35': '中国',
        '36': '四国', '37': '四国', '38': '四国', '39': '四国',
        '40': '九州', '41': '九州', '42': '九州', '43': '九州', '44': '九州', '45': '九州', '46': '九州',
        '47': '沖縄',
    };
    return map[codes[0]] || '全国';
}