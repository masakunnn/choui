const CONFIG = {
    marginRatio: 0.90,
    aspectRatio: 16/9,
    animDuration: 700,
    fontName: "'RodinNTLG-DB', 'RodinNTLG-B', sans-serif"
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

// 複数プロキシを順番に試す堅牢な fetch 関数
async function fetchWithProxy(targetUrl) {
    const proxies = [
        url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
        url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
    ];

    for (const proxyGen of proxies) {
        try {
            const pUrl = proxyGen(targetUrl);
            const res = await fetch(pUrl);
            if (res.ok) {
                const text = await res.text();
                if (text && text.length > 500) return text;
            }
        } catch (e) {}
    }
    return null;
}

async function fetchRankingData(mode) {
    try {
        const targetUrl = `https://weather.yahoo.co.jp/weather/amedas/ranking/?rank=${mode}`;
        const text = await fetchWithProxy(targetUrl);
        if (!text) return [];
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const rows = doc.querySelectorAll('tr');
        
        const dataList = [];
        rows.forEach(row => {
            const cols = row.querySelectorAll('td');
            if (cols.length >= 4) {
                const rankVal = cols[0].textContent.trim();
                if (!/^\d+$/.test(rankVal)) return;
                
                const aTag = cols[1].querySelector('a');
                if (!aTag) return;
                
                const fullText = aTag.textContent.trim();
                const prefSpan = aTag.querySelector('span');
                const pref = prefSpan ? prefSpan.textContent.trim().replace(/[（）]/g, '') : '';
                const name = fullText.replace(prefSpan ? prefSpan.textContent.trim() : '', '').trim();
                
                const valText = cols[2].textContent.trim().replace('mm', '').replace('℃', '').trim();
                const val = parseFloat(valText);
                
                const timeRaw = cols[3].textContent.trim();
                const timeStart = timeRaw.split('〜')[0];
                const [t_h, t_m] = timeStart.split(':').map(Number);
                
                dataList.push({ rank: rankVal, pref, name, value: val, time_h: t_h, time_m: t_m });
            }
        });
        return dataList.slice(0, 8);
    } catch (e) {
        return [];
    }
}

function loadImage(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
    });
}

async function createRankingCardDataUrl(mode, titleType, updateTimeStr) {
    const dataList = await fetchRankingData(mode);
    if (!dataList || dataList.length === 0) return null;

    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');

    const templateImg = await loadImage('template.png');
    if (templateImg) {
        ctx.drawImage(templateImg, 0, 0, 1920, 1080);
    } else {
        ctx.fillStyle = '#282828';
        ctx.fillRect(0, 0, 1920, 1080);
    }

    let titleText = '', fillColor = '', unit = '';
    if (titleType === 'high') {
        titleText = `全国 きょうの最高気温 「高い順」 ${updateTimeStr}現在`;
        fillColor = 'rgb(200, 30, 30)';
        unit = '℃';
    } else if (titleType === 'low') {
        titleText = `全国 きょうの最低気温 「低い順」 ${updateTimeStr}現在`;
        fillColor = 'rgb(30, 80, 200)';
        unit = '℃';
    } else {
        titleText = `全国 きょうの一時間降水量 「多い順」 ${updateTimeStr}現在`;
        fillColor = 'rgb(30, 100, 210)';
        unit = 'mm';
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 80px ${CONFIG.fontName}`;
    ctx.fillText(titleText, 110, 130);

    const startX = 130, startY = 225, lineHeight = 103, maxGraphWidth = 1795;
    const topVal = dataList[0].value;

    for (let i = 0; i < dataList.length; i++) {
        const item = dataList[i];
        const y = startY + (i * lineHeight);

        let widthRatio = 0;
        if (titleType === 'high' || titleType === 'precip') {
            const maxRef = topVal > 0 ? topVal : 1.0;
            widthRatio = item.value / maxRef;
        } else {
            const lastVal = dataList[dataList.length - 1].value;
            let valRange = lastVal - topVal;
            if (valRange <= 0) valRange = 1.0;
            widthRatio = (lastVal - item.value) / valRange;
        }

        let width = Math.max(50, Math.min(Math.floor(widthRatio * maxGraphWidth), maxGraphWidth));

        ctx.fillStyle = fillColor;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(65, y - 6, width, 91, 8);
        else ctx.rect(65, y - 6, width, 91);
        ctx.fill();

        if (titleType === 'high') {
            const val = item.value;
            let iconNames = [];
            if (val >= 41.9) iconNames = ['酷暑.png', 'superhigh.png'];
            else if (val >= 40.0) iconNames = ['酷暑.png'];
            else if (val >= 35.0) iconNames = ['猛暑.png'];
            else if (val >= 30.0) iconNames = ['真夏.png'];
            else if (val >= 25.0) iconNames = ['夏.png'];

            for (const iconName of iconNames) {
                const iconImg = await loadImage(iconName);
                if (iconImg) ctx.drawImage(iconImg, 0, i * lineHeight);
            }
        }

        const h = String(item.time_h).padStart(2, '0');
        const m = String(item.time_m).padStart(2, '0');
        const mainText = `${item.rank}. ${item.pref} ${item.name} ${h}:${m}`;
        const valText = `${item.value}${unit}`;

        ctx.fillStyle = '#ffffff';
        ctx.font = `60px ${CONFIG.fontName}`;
        ctx.fillText(mainText, startX, y + 62);

        ctx.font = `bold 68px ${CONFIG.fontName}`;
        ctx.fillText(valText, 1550, y + 62);
    }

    return canvas.toDataURL('image/png');
}

async function init(selectedAreaCodes = ALL_AREA_CODES) {
    try {
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

            // 軽量HTML構造（観測所名、ラベル、凡例）は最初から生成しておく
            box.innerHTML = `
                <div class="scaling-layer">
                    <div class="station-label">${displayName}</div>
                    <div class="agency-label">${stInfo.agency}</div>
                    <div class="legend-box" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 100%; z-index: 20;">
                        ${legendHtml}
                    </div>
                    <div class="chart-layer"><canvas id="chart-${stInfo.jmaCode}"></canvas></div>
                    <div id="tooltip-${stInfo.jmaCode}" class="custom-tooltip"></div>
                </div>`;

            fragment.appendChild(box);
        }

        grid.appendChild(fragment);

        // 沖縄の後にランキングカードを挿入
        let updateTimeStr = "--:--";
        try {
            const timeTxt = await fetchWithProxy('https://www.jma.go.jp/bosai/amedas/data/latest_time.txt');
            if (timeTxt) updateTimeStr = timeTxt.trim().substring(11, 16);
        } catch (e) {}

        const rankingTasks = [
            { mode: 'high_temp', titleType: 'high', label: '最高気温', fallback: 'ranking_high.png' },
            { mode: 'low_temp', titleType: 'low', label: '最低気温', fallback: 'ranking_low.png' },
            { mode: 'precip', titleType: 'precip', label: '降水量', fallback: 'ranking_precip.png' }
        ];

        for (const task of rankingTasks) {
            let imgSrc = await createRankingCardDataUrl(task.mode, task.titleType, updateTimeStr);
            if (!imgSrc) imgSrc = task.fallback;

            const rankingCard = document.createElement('div');
            rankingCard.className = 'graph-box image-box';
            rankingCard.innerHTML = `<img src="${imgSrc}" alt="${task.label}ランキング" onerror="this.style.display='none'">`;
            rankingCard.onclick = () => handleCardClick(rankingCard);
            grid.appendChild(rankingCard);
        }

        // スマホ対策：重い Canvas (Chart.js) だけを画面の出入りに合わせて動的生成・破棄
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(async (entry) => {
                const box = entry.target;
                if (!box._stInfo) return;

                if (entry.isIntersecting) {
                    if (!box._chartDrawn) {
                        box._chartDrawn = true;
                        box._chartInstance = await drawChart(box._stInfo, yyyy, yyyymmdd, mmdd);
                    }
                } else {
                    // 画面外に出たら画素メモリ（Canvas）だけ破棄・リセット
                    if (box._chartDrawn) {
                        if (box._chartInstance) {
                            box._chartInstance.destroy();
                            box._chartInstance = null;
                        }
                        box._chartDrawn = false;
                        
                        const chartLayer = box.querySelector('.chart-layer');
                        if (chartLayer) {
                            chartLayer.innerHTML = `<canvas id="chart-${box._stInfo.jmaCode}"></canvas>`;
                        }
                    }
                }
            });
        }, { rootMargin: '400px 0px' });

        document.querySelectorAll('.graph-box:not(.image-box)').forEach(box => {
            observer.observe(box);
        });

        updateScales(); 
        window.addEventListener('resize', updateScales);
        setTimeout(updateScales, 100);
    } catch (e) {
        console.error("初期化中にエラーが発生しました:", e);
    }
}

window.addEventListener('DOMContentLoaded', async () => {
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