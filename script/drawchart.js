// 重い通信と補間計算の結果を保持するキャッシュマップ
const chartDataCache = new Map();

async function getPreparedChartData(stInfo, yyyy, yyyymmdd, mmdd) {
    if (chartDataCache.has(stInfo.jmaCode)) {
        return chartDataCache.get(stInfo.jmaCode);
    }

    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    
    const format = d => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const urls = [
        `https://www.jma.go.jp/bosai/tidelevel/data/tide/tide_obs_${format(yesterday)}_${stInfo.jmaCode}.json`,
        `https://www.jma.go.jp/bosai/tidelevel/data/tide/tide_obs_${format(now)}_${stInfo.jmaCode}.json`,
        `https://www.jma.go.jp/bosai/tidelevel/const/tide_astro/tide_astro_${yyyy}_${stInfo.jmaCode}.json`
    ];

    const [resYesterday, resToday, resAstro] = await Promise.all(
        urls.map(url => fetch(url).then(r => r.ok ? r.json() : null))
    );

    const baseDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (resYesterday ? 1 : 0), 0, 0, 0, 0);

    const eightHoursAgo = new Date(now.getTime() - 8 * 3600 * 1000);
    const startTime = new Date(
        eightHoursAgo.getFullYear(),
        eightHoursAgo.getMonth(),
        eightHoursAgo.getDate(),
        eightHoursAgo.getHours(),
        0, 0, 0
    );

    const startDiffSec = Math.floor((startTime.getTime() - baseDate.getTime()) / 1000);
    const startIdx = Math.floor(startDiffSec / 15);

    const currentDiffSec = Math.floor((now.getTime() - baseDate.getTime()) / 1000);
    const currentIdx = Math.floor(currentDiffSec / 15);

    const thresholds = await getStationThresholds(stInfo.jmaCode);

    const getAstroArray = (d) => resAstro?.tide[String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0')] || [];
    const combinedAstroRaw = [...getAstroArray(yesterday), ...getAstroArray(now), ...getAstroArray(tomorrow)];

    const interpolateAstro = (raw) => {
        const interpolated = [];
        for (let i = 0; i < raw.length - 1; i++) {
            for (let j = 0; j < 240; j++) {
                interpolated.push(raw[i] + (raw[i + 1] - raw[i]) * (j / 240));
            }
        }
        return interpolated;
    };
    const fullAstro = interpolateAstro(combinedAstroRaw);

    const compareValues = [
        ...(resYesterday?.tide || []), 
        ...(resToday?.tide || []),
        ...fullAstro
    ];

    if (thresholds) {
        if (thresholds.level4 !== null) compareValues.push(thresholds.level4);
        if (thresholds.level5 !== null) compareValues.push(thresholds.level5);
        if (thresholds.maxLevel !== null) compareValues.push(thresholds.maxLevel);
    }

    const allData = compareValues.filter(v => v !== null && v !== undefined && typeof v === 'number');

    const minVal = Math.min(...allData);
    const maxVal = Math.max(...allData);

    const steps = [100, 200, 500];
    const range = maxVal - minVal;
    const stepSize = steps.find(s => s >= range / 5) || 500; 

    const yMin = Math.floor(minVal / stepSize) * stepSize;
    const yMax = Math.ceil(maxVal / stepSize) * stepSize + stepSize;

    const totalPoints = 2880;
    const endIdx = startIdx + totalPoints;

    const combinedTideRaw = (resYesterday?.tide || []).concat(resToday?.tide || []);
    const slicedTide = combinedTideRaw.slice(startIdx, currentIdx + 1);
    const dataForTide = [...slicedTide];
    while (dataForTide.length <= totalPoints) {
        dataForTide.push(null);
    }

    const slicedAstro = fullAstro.slice(startIdx, endIdx + 1);
    const paddedLabels = Array.from({ length: totalPoints + 1 }, (_, i) => i);

    const prepared = {
        startTime,
        thresholds,
        yMin,
        yMax,
        stepSize,
        totalPoints,
        paddedLabels,
        dataForTide,
        slicedAstro
    };

    chartDataCache.set(stInfo.jmaCode, prepared);
    return prepared;
}

async function drawChart(stInfo, yyyy, yyyymmdd, mmdd) {
    try {
        const prepared = await getPreparedChartData(stInfo, yyyy, yyyymmdd, mmdd);
        const { startTime, thresholds, yMin, yMax, stepSize, totalPoints, paddedLabels, dataForTide, slicedAstro } = prepared;

        const plotStart = 0;
        const plotEnd = totalPoints;
        const annotations = {};

        annotations.xAxisLine = { 
            type: 'line', yMin: yMin, yMax: yMin, xMin: plotStart, xMax: plotEnd, 
            borderColor: '#ffffff', borderWidth: 8 
        };
        if (thresholds?.level4 !== null && thresholds?.level4 !== undefined) {
            annotations.l_danger = { 
                type: 'line', yMin: thresholds.level4, yMax: thresholds.level4, 
                xMin: plotStart, xMax: plotEnd, borderColor: '#AA01A5', borderWidth: 8 
            };
        }
        if (thresholds?.level5 !== null && thresholds?.level5 !== undefined) {
            annotations.l_special = { 
                type: 'line', yMin: thresholds.level5, yMax: thresholds.level5, 
                xMin: plotStart, xMax: plotEnd, borderColor: '#BFC1BF', borderWidth: 8 
            };
        }
        if (thresholds?.maxLevel !== null && thresholds?.maxLevel !== undefined) {
            annotations.l_record = { 
                type: 'line', yMin: thresholds.maxLevel, yMax: thresholds.maxLevel, 
                xMin: plotStart, xMax: plotEnd, borderColor: '#E18003', borderWidth: 8, borderDash: [15, 10] 
            };
        }

        const canvas = document.getElementById(`chart-${stInfo.jmaCode}`);
        if (!canvas) return null;
        const ctx = canvas.getContext('2d');

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: paddedLabels,
                datasets: [
                    {                     
                        label: '実況',
                        data: dataForTide,
                        borderColor: '#46ecf1',
                        borderWidth: 8,
                        pointRadius: 0,
                        fill: false,
                        tension: 0.4,
                        cubicInterpolationMode: 'monotone',
                        borderCapStyle: 'round',
                        borderJoinStyle: 'round',
                        spanGaps: false
                    },
                    { 
                        label: '天文', 
                        data: slicedAstro,
                        borderColor: '#00c602', 
                        borderWidth: 8, 
                        pointRadius: 0, 
                        pointHitRadius: 0, 
                        fill: false, 
                        tension: 0.4, 
                        cubicInterpolationMode: 'monotone' 
                    }
                ]
            },
            options: {
                devicePixelRatio: 1,
                responsive: false,
                maintainAspectRatio: false,
                animation: false,
                layout: { padding: { bottom: 250 } },
                plugins: {
                    legend: { display: false },
                    annotation: { annotations: annotations }
                },
                onHover: (event, chartElement, chart) => {
                    const container = chart.canvas.closest('.graph-box');
                    const tooltipEl = document.getElementById(`tooltip-${stInfo.jmaCode}`);

                    if (!container || !container.classList.contains('expanded') || isAnimating || !tooltipEl) {
                        if (tooltipEl) { tooltipEl.style.display = 'none'; tooltipEl.classList.remove('show'); }
                        return;
                    }

                    if (!tooltipEl) return;

                    const { left, right, top, bottom } = chart.chartArea;
                    const isInside = event.x >= (left + 82) && event.x <= (right - 90) && event.y >= top && event.y <= (bottom - 15);

                    if (!isInside) {
                        tooltipEl.style.display = 'none';
                        tooltipEl.classList.remove('show');
                        chart.draw(); 
                        return;
                    }

                    const timeVal = chart.scales.x.getValueForPixel(event.x);

                    const getValOnLine = (datasetIndex) => {
                        const idx = Math.floor(timeVal);
                        const data = chart.data.datasets[datasetIndex].data;
                        return (data && data[idx] !== undefined) ? data[idx] : null;
                    };

                    const obsValAtLine = getValOnLine(0);   
                    const astroValAtLine = getValOnLine(1); 

                    let rows = [];
                    if (thresholds && thresholds.level5 !== null && thresholds.level5 !== undefined) rows.push({ val: thresholds.level5, html: `<div class="tooltip-row"><div class="tooltip-color-box" style="background:#BFC1BF;"></div>高潮特別警報</div><div class="tooltip-value-container"><span class="tooltip-value">${thresholds.level5}</span><span class="tooltip-unit">cm</span></div>` });
                    if (thresholds && thresholds.level4 !== null && thresholds.level4 !== undefined) rows.push({ val: thresholds.level4, html: `<div class="tooltip-row"><div class="tooltip-color-box" style="background:#AA01A5;"></div>高潮危険警報</div><div class="tooltip-value-container"><span class="tooltip-value">${thresholds.level4}</span><span class="tooltip-unit">cm</span></div>` });
                    if (thresholds && thresholds.maxLevel !== null && thresholds.maxLevel !== undefined) rows.push({ val: thresholds.maxLevel, html: `<div class="tooltip-row"><div class="tooltip-color-box dashed" style="border-color:#E18003;"></div>過去最高</div><div class="tooltip-value-container"><span class="tooltip-value">${thresholds.maxLevel}</span><span class="tooltip-unit">cm</span></div>` });
                    if (astroValAtLine !== null && astroValAtLine !== undefined) rows.push({ val: Math.round(astroValAtLine), html: `<div class="tooltip-row"><div class="tooltip-color-box" style="background:#00c602;"></div>天文潮位</div><div class="tooltip-value-container"><span class="tooltip-value">${Math.round(astroValAtLine)}</span><span class="tooltip-unit">cm</span></div>` });
                    if (obsValAtLine !== null && obsValAtLine !== undefined) rows.push({ val: Math.round(obsValAtLine), html: `<div class="tooltip-row"><div class="tooltip-color-box" style="background:#46ecf1;"></div>潮位</div><div class="tooltip-value-container"><span class="tooltip-value">${Math.round(obsValAtLine)}</span><span class="tooltip-unit">cm</span></div>` });
                    
                    const targetDate = new Date(startTime.getTime() + timeVal * 15 * 1000);
                    const timeStr = `${targetDate.getMonth() + 1}月${targetDate.getDate()}日${targetDate.getHours()}時${String(targetDate.getMinutes()).padStart(2, '0')}分`;

                    rows.sort((a, b) => b.val - a.val);
                    tooltipEl.innerHTML = `<div class="tooltip-time">${timeStr}</div>` + rows.map(r => r.html).join('');
                    tooltipEl.style.display = 'block';
                    tooltipEl.classList.add('show');
                    tooltipEl.style.left = (event.x + 330) + 'px'; 
                    tooltipEl.style.top = '655px';

                    chart.draw();
                    const ctx = chart.ctx;
                    ctx.save();

                    ctx.beginPath(); ctx.lineWidth = 8; ctx.strokeStyle = '#ffffff'; 
                    ctx.moveTo(event.x, top); ctx.lineTo(event.x, bottom); ctx.stroke();

                    const drawCircle = (val, color, forceDisplay = false) => {
                        if (val === null || val === undefined || isNaN(val)) return;
                        const yPixel = chart.scales.y.getPixelForValue(val);
                        if (!forceDisplay && (yPixel < top || yPixel > bottom)) return; 
                        ctx.beginPath(); ctx.arc(event.x, yPixel, 18, 0, Math.PI * 2);
                        ctx.fillStyle = '#ffffff'; ctx.fill();
                        ctx.beginPath(); ctx.arc(event.x, yPixel, 12, 0, Math.PI * 2);
                        ctx.fillStyle = color; ctx.fill();
                    };

                    drawCircle(obsValAtLine, '#46ecf1', false);
                    drawCircle(astroValAtLine, '#00c602', false);
                    if (thresholds?.level5 !== null && thresholds?.level5 !== undefined) drawCircle(thresholds.level5, '#BFC1BF', true);
                    if (thresholds?.level4 !== null && thresholds?.level4 !== undefined) drawCircle(thresholds.level4, '#AA01A5', true);
                    if (thresholds?.maxLevel !== null && thresholds?.maxLevel !== undefined) drawCircle(thresholds.maxLevel, '#E18003', true);

                    ctx.restore();
                },
                scales: {
                    x: {
                        type: 'linear',
                        min: 0,
                        max: totalPoints + 120,
                        offset: false,
                        afterFit: function(axis) {
                            axis.paddingLeft = 0;
                            axis.paddingRight = 0;
                        },
                        grid: { color: 'rgba(255,255,255,0.1)', lineWidth: 8, drawTicks: true, tickColor: '#ffffff', tickLength: 30, tickWidth: 8 }, 
                        border: { display: true, color: '#ffffff', width: 8, dash: [15, 15], drawOnChartArea: true, hideOnEnd: true, z: 1 }, 
                        ticks: { 
                            color: '#ffffff', 
                            font: { size: 70, family: CONFIG.fontName, weight: 'normal' }, 
                            stepSize: 240, 
                            padding: 25, 
                            includeBounds: false,
                            callback: function(v, index, ticks) {
                                const pointTime = new Date(startTime.getTime() + v * 15 * 1000);
            
                                const d = pointTime.getDate();
                                const displayHour = pointTime.getHours();

                                if (index === 0 || displayHour === 0) {
                                    return [displayHour + '時', d + '日'];
                                }
            
                                return displayHour + '時';
                            }
                        }
                    },
                    y: { 
                        min: yMin, max: yMax, 
                        afterFit: function(axis) {
                            axis.width = 250;
                        },
                        grid: { color: 'rgba(255,255,255,0.15)', lineWidth: 8, drawTicks: true, tickColor: '#ffffff', tickLength: 20, tickWidth: 8 }, 
                        border: { display: true, color: '#ffffff', width: 8, z: 1 }, 
                        ticks: { 
                            color: '#ffffff', 
                            font: { size: 70, family: CONFIG.fontName }, 
                            stepSize: stepSize, 
                            padding: 20,
                            callback: function(value, index, values) {
                                if (value === yMax) {
                                    return null;
                                }
                                return value;
                            }
                        }
                    }
                }
            }
        });

        canvas.addEventListener('mouseleave', () => {
            const tooltipEl = document.getElementById(`tooltip-${stInfo.jmaCode}`);
            if (tooltipEl) { 
                tooltipEl.style.display = 'none'; 
                tooltipEl.classList.remove('show'); 
            }
            chart.draw();
        });

        return chart;
    } catch (e) {
        console.error(`Error drawing ${stInfo.name}:`, e);
        return null;
    }
}

async function getStationThresholds(jmaCode) {
    try {
        const url = "https://www.jma.go.jp/bosai/tidelevel/const/tide_area.json";
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        
        for (const areaCode in data) {
            const area = data[areaCode];
            if (Array.isArray(area.class30s)) {
                for (const class30 of area.class30s) {
                    const station = Array.isArray(class30.stations) 
                        ? class30.stations.find(s => s.code === jmaCode) 
                        : null;
                    
                    if (station) {
                        return {
                            level4: class30.standard?.level4 ?? null,
                            level5: class30.standard?.level5 ?? null,
                            maxLevel: station.max?.level ?? null
                        };
                    }
                }
            }
        }
    } catch (e) {
        console.warn(`Thresholds fetch failed for ${jmaCode}`);
    }
    return null;
}