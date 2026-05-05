<script setup>
import { ref, onMounted } from 'vue'

const birthDate = ref('1993-01-10')
const birthTime = ref('11:26')
const birthLocation = ref('tokyo')

const locationData = {
    tokyo: {
        name: 'Tokyo',
        lat: 35.68,
        lon: 139.76,
        tz: 'Asia/Tokyo'
    },
    montreal: {
        name: 'Montreal',
        lat: 45.5017,
        lon: -73.5673,
        tz: 'America/Toronto'
    }
}

const positions = ref({})
const aspectLines = ref([])
const isReady = ref(false)

const zodiac = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓']

const cx = 200
const cy = 200

// ハウス
const houses = ref([])
const angles = ref({})

const rotation = ref(0)

const planetList = ref([])
const houseList = ref([])

const aspectList = ref([])
const aspectDict = {}
const fullReading = ref('')

const majorAspects = ['conjunction', 'opposition', 'trine', 'square', 'sextile']

const orbLimit = {
    conjunction: 8,
    opposition: 8,
    trine: 6,
    square: 6,
    sextile: 4
}

const aspectMeaning = {
    conjunction: 'intensify each other',
    opposition: 'create tension and require balance',
    trine: 'flow naturally and bring ease',
    square: 'create challenges and growth',
    sextile: 'bring opportunities with effort'
}

const planetMeaning = {
    '☉': 'identity and purpose',
    '☽': 'emotions',
    '☿': 'thinking',
    '♀': 'love',
    '♂': 'action',
    '♃': 'growth',
    '♄': 'restriction',
    '♅': 'change',
    '♆': 'intuition',
    '♇': 'transformation'
}

const planetName = {
    '☉': 'Sun',
    '☽': 'Moon',
    '☿': 'Mercury',
    '♀': 'Venus',
    '♂': 'Mars',
    '♃': 'Jupiter',
    '♄': 'Saturn',
    '♅': 'Uranus',
    '♆': 'Neptune',
    '♇': 'Pluto'
}

const zodiacName = [
    'Aries', 'Taurus', 'Gemini', 'Cancer',
    'Leo', 'Virgo', 'Libra', 'Scorpio',
    'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
]

const aspectLabel = {
    conjunction: 'conjunct',
    opposition: 'opposes',
    trine: 'trines',
    square: 'squares',
    sextile: 'sextiles'
}

const aspectText = {
    trine: 'creates a natural flow between',
    sextile: 'opens opportunities between',
    square: 'creates tension between',
    opposition: 'brings a need to balance',
    conjunction: 'intensifies the connection between'
}

const planetTheme = {
    '☉': 'your sense of identity',
    '☽': 'your emotional world',
    '☿': 'your thinking style',
    '♀': 'your relationships',
    '♂': 'your drive and action',
    '♃': 'growth and expansion',
    '♄': 'discipline and responsibility',
    '♅': 'your need for change and individuality',
    '♆': 'your dreams and intuition',
    '♇': 'your transformation and inner power'
}

function getOffset(tz, year, month, day, hour, minute) {
    const date = new Date(Date.UTC(year, month - 1, day, hour, minute))

    const utc = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }))
    const target = new Date(date.toLocaleString('en-US', { timeZone: tz }))

    return (target - utc) / (1000 * 60 * 60)
}

function aspectSentence(a, b, type, degA, degB) {
    const fa = formatDegree(degA)
    const fb = formatDegree(degB)

    const houseA = getHouse(degA)
    const houseB = getHouse(degB)

    return `${planetName[a]} in ${fa.signName} (${houseA}th house) ${aspectLabel[type]} ${planetName[b]} in ${fb.signName} (${houseB}th house)`
}


function polarToCartesian(cx, cy, r, angle) {
    const rad = (rotation.value - angle - 90) * Math.PI / 180
    return {
        x: cx + r * Math.cos(rad),
        y: cy + r * Math.sin(rad)
    }
}

function getPlanetColor(name) {
    switch (name) {
        case '☉': return 'gold'
        case '☽': return '#bbb'
        case '♂': return 'red'
        case '♀': return 'green'
        case '☿': return 'purple'
        case '♃': return 'orange'
        case '♄': return 'brown'
        case '♅': return '#00bfff'   // 天王星（電気っぽい青）
        case '♆': return '#4169e1'   // 海王星（深い青）
        case '♇': return '#222'      // 冥王星（暗め）

        default: return 'blue'
    }
}

function getAngleDiff(a, b) {
    let diff = Math.abs(a - b) % 360
    if (diff > 180) diff = 360 - diff
    return diff
}

function getAspect(a, b) {
    const diff = getAngleDiff(a, b)

    const aspects = [
        { type: 'conjunction', angle: 0, orb: 10 },
        { type: 'opposition', angle: 180, orb: 10 },
        { type: 'trine', angle: 120, orb: 8 },
        { type: 'square', angle: 90, orb: 8 },
        { type: 'sextile', angle: 60, orb: 6 },
        { type: 'quincunx', angle: 150, orb: 3 },
        { type: 'sesqui-square', angle: 135, orb: 3 },
        { type: 'semi-square', angle: 45, orb: 3 },
        { type: 'semi-sextile', angle: 30, orb: 3 }
    ]

    let best = null
    let minDiff = Infinity

    for (const asp of aspects) {
        const d = Math.abs(diff - asp.angle)
        if (d < asp.orb && d < minDiff) {
            best = {
                type: asp.type,
                orb: d,
                maxOrb: asp.orb
            }
            minDiff = d
        }
    }

    return best
}


function getAspectColor(type) {
    switch (type) {
        case 'trine': return 'blue'
        case 'sextile': return 'green'
        case 'square': return 'red'
        case 'opposition': return 'orange'
        case 'conjunction': return 'purple'
        case 'quincunx': return '#999'
        case 'semi-square': return '#cc6666'
        case 'sesqui-square': return '#cc4444'
        case 'semi-sextile': return '#66cc99'
        default: return 'gray'
    }
}

function getAspectOpacity(orb, maxOrb) {
    const strength = 1 - (orb / maxOrb)
    return 0.05 + strength * 0.95
}

function formatDegree(deg) {
    const signIndex = Math.floor(deg / 30)
    const signDeg = deg % 30

    const d = Math.floor(signDeg)
    const m = Math.floor((signDeg - d) * 60)

    return {
        sign: zodiac[signIndex],
        signName: zodiacName[signIndex], // ←追加
        degree: d,
        minute: m,
        text: `${zodiac[signIndex]} ${d}°${m.toString().padStart(2, '0')}'`
    }
}

function planetSentence(name, deg) {
    const f = formatDegree(deg)
    const house = getHouse(deg)

    return `${planetName[name]} in ${f.signName} (${house}th house)`
}

function aspectSymbol(type) {
    switch (type) {
        case 'conjunction': return '☌'
        case 'opposition': return '☍'
        case 'trine': return '△'
        case 'square': return '□'
        case 'sextile': return '✶'
        default: return type
    }
}

function interpretAspect(a, b, type) {
    const key1 = `${a}-${b}-${type}`
    const key2 = `${b}-${a}-${type}`

    return (
        aspectDict[key1] ||
        aspectDict[key2] ||
        generateInterpretation(a, b, type)
    )
}

function generateInterpretation(a, b, type) {
    return `${planetMeaning[a].charAt(0).toUpperCase() + planetMeaning[a].slice(1)} interacts with ${planetMeaning[b]} and tends to ${aspectMeaning[type]}.`
}

function getHouse(deg) {
    for (let i = 0; i < 12; i++) {
        const start = houses.value[i + 1]
        const end = houses.value[i + 2] || houses.value[1]

        if (start < end) {
            if (deg >= start && deg < end) return i + 1
        } else {
            // 0°跨ぎ（12室→1室）
            if (deg >= start || deg < end) return i + 1
        }
    }
}


function aspectSummaryText() {
    if (!aspectList.value.length) return ''

    const top = aspectList.value.slice(0, 2)

    return top.map(a =>
        `${interpretAspectNatural(a.planetA, a.planetB, a.type)}`
    ).join(' ')
}

function toneSummary() {
    const hasHard = aspectList.value.some(a =>
        ['square', 'opposition'].includes(a.type)
    )

    const hasSoft = aspectList.value.some(a =>
        ['trine', 'sextile'].includes(a.type)
    )

    if (hasHard && hasSoft) {
        return 'Your chart shows both ease and challenge, suggesting growth through experience.'
    }

    if (hasHard) {
        return 'Challenges in your chart point to important lessons and personal development.'
    }

    if (hasSoft) {
        return 'There is a natural sense of flow and support in your chart.'
    }

    return ''
}

function coreSummary() {
    const sun = planetList.value.find(p => p.name === '☉')
    const moon = planetList.value.find(p => p.name === '☽')

    if (!sun || !moon) return ''

    return `Your identity is strongly influenced by ${sun.sentence}, while your emotional world is shaped by ${moon.sentence}.`
}

function generateFullReading() {
    return [
        coreSummary(),
        aspectSummaryText(),
        toneSummary()
    ].join(' ')
}



function interpretAspectNatural(a, b, type) {
    return `${aspectText[type]} ${planetTheme[a]} and ${planetTheme[b]}.`
}

async function calculateChart() {
    const [year, month, day] = birthDate.value.split('-').map(Number)
    const [hour, minute] = birthTime.value.split(':').map(Number)

    // 👇 ここに移動
    const loc = locationData[birthLocation.value]

    const lat = loc.lat
    const lon = loc.lon

    const offset = getOffset(
        loc.tz,
        year,
        month,
        day,
        hour,
        minute
    )

    const utcHour = hour + minute / 60 - offset

    const SwissEph = (await import('swisseph-wasm')).default
    const aspectListData = []

    const swe = new SwissEph({
        locateFile: (file) => `/${file}`
    })

    await swe.initSwissEph()

    // 日本なら -9（UTC）
    const jd = swe.julday(year, month, day, utcHour)

    const housesRes = swe.houses(jd, lat, lon, 'P')

    angles.value = {
        ASC: housesRes.ascmc[0],
        MC: housesRes.ascmc[1]
    }
    rotation.value = angles.value.ASC - 90

    const planets = [
        { name: '☉', id: swe.SE_SUN },
        { name: '☽', id: swe.SE_MOON },
        { name: '☿', id: swe.SE_MERCURY },
        { name: '♀', id: swe.SE_VENUS },
        { name: '♂', id: swe.SE_MARS },
        { name: '♃', id: swe.SE_JUPITER },
        { name: '♄', id: swe.SE_SATURN },
        { name: '♅', id: swe.SE_URANUS },
        { name: '♆', id: swe.SE_NEPTUNE },
        { name: '♇', id: swe.SE_PLUTO }
    ]

    // ===== 正確な位置（計算用）=====
    const rawPositions = {}

    planets.forEach(p => {
        const res = swe.calc_ut(jd, p.id, swe.SEFLG_SWIEPH)
        let deg = res[0]
        if (deg < 0) deg += 360
        rawPositions[p.name] = deg
    })

    // ===== 表示用（衝突回避）=====
    function resolveCollisions(rawPositions) {
        const entries = Object.entries(rawPositions)
            .sort((a, b) => a[1] - b[1]) // 角度順に並べる

        const result = {}
        const threshold = 5 // 5度以内は衝突とみなす

        let group = []

        function flushGroup() {
            if (group.length === 0) return

            if (group.length === 1) {
                result[group[0][0]] = group[0][1]
            } else {
                const spread = 6 // 全体で広げる角度
                const step = spread / (group.length - 1)

                group.forEach(([name, deg], i) => {
                    const offset = -spread / 2 + step * i
                    result[name] = (deg + offset + 360) % 360
                })
            }

            group = []
        }

        for (let i = 0; i < entries.length; i++) {
            const current = entries[i]

            if (group.length === 0) {
                group.push(current)
                continue
            }

            const prev = group[group.length - 1]
            const diff = getAngleDiff(prev[1], current[1])

            if (diff < threshold) {
                group.push(current)
            } else {
                flushGroup()
                group.push(current)
            }
        }

        flushGroup()

        return result
    }

    const displayPositions = resolveCollisions(rawPositions)


    positions.value = displayPositions

    // ===== アスペクト生成 =====
    const aspectLinesData = []
    const entries = Object.entries(rawPositions)

    for (let i = 0; i < entries.length; i++) {
        for (let j = i + 1; j < entries.length; j++) {

            const [nameA, degA] = entries[i]
            const [nameB, degB] = entries[j]

            const aspectData = getAspect(degA, degB)

            if (aspectData) {
                const { type, orb, maxOrb } = aspectData

                const strength = 1 - (orb / maxOrb)


                const p1 = polarToCartesian(cx, cy, 100, degA)
                const p2 = polarToCartesian(cx, cy, 100, degB)

                // 基本の太さ
                let width = 0.5 + strength * 2

                // ② メジャーアスペクト強調（ここ！）
                if (['trine', 'square', 'opposition', 'conjunction'].includes(type)) {
                    width *= 1.3
                }

                aspectLinesData.push({
                    x1: p1.x,
                    y1: p1.y,
                    x2: p2.x,
                    y2: p2.y,
                    color: getAspectColor(type),
                    opacity: getAspectOpacity(orb, maxOrb),
                    width
                })

                if (
                    aspectData &&
                    majorAspects.includes(type) &&
                    orb <= orbLimit[type]
                ) {
                    aspectListData.push({
                        planetA: nameA,
                        planetB: nameB,
                        type,
                        orb: orb.toFixed(2),
                        angle: getAngleDiff(degA, degB).toFixed(2),
                        color: getAspectColor(type),
                        interpretation: interpretAspect(nameA, nameB, type),
                    })
                }
                aspectListData.sort((a, b) => a.orb - b.orb)

            }


        }
    }

    // 👇 安全に配列化
    houses.value = Array.from(housesRes.cusps)

    houseList.value = houses.value
        .slice(1)
        .map((deg, i) => ({
            house: i + 1,
            deg,
            ...formatDegree(deg)
        }))

    // onMounted の最後あたりで
    planetList.value = Object.entries(rawPositions).map(([name, deg]) => {
        const f = formatDegree(deg)
        return {
            name,
            deg,
            house: getHouse(deg),
            sentence: planetSentence(name, deg), // ←追加
            ...f
        }
    })

    aspectList.value = aspectListData.map(a => ({
        ...a,
        sentence: aspectSentence(
            a.planetA,
            a.planetB,
            a.type,
            rawPositions[a.planetA],
            rawPositions[a.planetB]
        )
    }))


    fullReading.value = generateFullReading()
    aspectLines.value = aspectLinesData
    isReady.value = true
}

onMounted(async () => {
    calculateChart()
})
</script>

<template>
    <ClientOnly>
        <div style="text-align:center">
            <div class="wrapper">
                <h2>Horoscope</h2>

                <div class="input-panel">
                    <input type="date" v-model="birthDate" />
                    <input type="time" v-model="birthTime" />
                    <select v-model="birthLocation">
                        <option value="tokyo">Tokyo</option>
                        <option value="montreal">Montreal</option>
                    </select>
                    <button @click="calculateChart">Calculate</button>
                </div>

                <svg width="375" height="375">

                    <!-- 外円 -->
                    <circle :cx="cx" :cy="cy" r="174" stroke="black" fill="none" />
                    <circle :cx="cx" :cy="cy" r="140" stroke="#aaa" fill="none" />

                    <!-- 星座区切り -->
                    <g>
                        <line v-for="i in 12" :key="i" :x1="cx" :y1="cy" :x2="polarToCartesian(cx, cy, 174, i * 30).x"
                            :y2="polarToCartesian(cx, cy, 174, i * 30).y" stroke="#ddd" />
                    </g>

                    <!-- 星座 -->
                    <g>
                        <text v-for="i in 12" :key="'z' + i" :x="polarToCartesian(cx, cy, 155, i * 30 + 15 - 30).x"
                            :y="polarToCartesian(cx, cy, 155, i * 30 + 15 - 30).y" text-anchor="middle"
                            alignment-baseline="middle" font-size="16">
                            {{ zodiac[i - 1] }}
                        </text>
                    </g>

                    <!-- アスペクト -->
                    <g v-if="isReady">
                        <line v-for="(line, i) in aspectLines" :key="i" :x1="line.x1" :y1="line.y1" :x2="line.x2"
                            :y2="line.y2" :stroke="line.color" stroke-linecap="round" :opacity="line.opacity"
                            :stroke-width="line.width" />
                    </g>

                    <!-- 惑星 -->
                    <g v-if="isReady">
                        <g v-for="(deg, name) in positions" :key="name">

                            <circle :cx="polarToCartesian(cx, cy, 120, deg).x" :cy="polarToCartesian(cx, cy, 120, deg).y"
                                r="4" :fill="getPlanetColor(name)" />

                            <text :x="polarToCartesian(cx, cy, 130, deg).x" :y="polarToCartesian(cx, cy, 130, deg).y"
                                text-anchor="middle" alignment-baseline="middle" font-size="14">
                                {{ name }}
                            </text>

                        </g>
                    </g>

                    <g v-if="isReady">
                        <line v-for="(deg, i) in houses.slice(1)" :key="'house' + i" :x1="cx" :y1="cy"
                            :x2="polarToCartesian(cx, cy, 174, deg).x" :y2="polarToCartesian(cx, cy, 174, deg).y"
                            stroke="#666" stroke-width="1.5" />
                    </g>

                    <g v-if="isReady">

                        <!-- ASC -->
                        <text :x="polarToCartesian(cx, cy, 187, angles.ASC).x"
                            :y="polarToCartesian(cx, cy, 187, angles.ASC).y" text-anchor="middle" font-size="12">
                            ASC
                        </text>

                        <!-- MC -->
                        <text :x="polarToCartesian(cx, cy, 187, angles.MC).x"
                            :y="polarToCartesian(cx, cy, 187, angles.MC).y" text-anchor="middle" font-size="12">
                            MC
                        </text>

                    </g>


                </svg>

                <div v-if="isReady" class="panel">
                    <div class="col">
                        <h3>Planets</h3>
                        <div v-for="p in planetList" :key="p.name"
                        class="planets-item">
                            <div><p class="desc">{{ p.sentence }}</p></div>
                            <p class="deg">
                                {{ p.text }}
                            </p>
                        </div>
                    </div>
        
                    <div class="col">
                        <h3>Houses</h3>
                        <div v-for="h in houseList" :key="h.house" class="house">
                            <span class="name">{{ h.house }}</span>
                            <span class="deg">{{ h.text }}</span>
                        </div>
                    </div>
        
                </div>
        
                <div v-if="isReady" class="aspect-panel">
                    <h3>Aspects</h3>
        
                    <div v-for="(a, i) in aspectList" :key="i" class="aspect-row">
                        <div>
                            {{ a.planetA }} {{ aspectSymbol(a.type) }} {{ a.planetB }}
                        </div>
                        <div class="orb">orb: {{ a.orb }}°</div>
                        <div class="interp">
                            {{ a.interpretation }}
                        </div>
                    </div>
                </div>
        
                <h3>
                    Reading
                </h3>
                <div class="reading">
                    {{ fullReading }}
                </div>
            </div>

        </div>

    </ClientOnly>
</template>

<style lang="scss">
p{
    margin: 0;
}
.input-panel{
    display: flex;
    gap: 8px;
}
.wrapper{
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
}
.panel {
    display: flex;
    gap: 20px;
    justify-content: center;
    margin-top: 20px;

    .col {
        width: 170px;
        .planets-item{
            padding: 6px 0;
            border-bottom: 1px solid #eee;
            text-align: left;
            .desc{
                font-size: 13px;
                line-height: 1.5em;
                font-weight: normal;
            }
            .deg{
                margin: 0;
                font-size: 12px;
                line-height: 1.5em;
                font-weight: normal;
                color:#888
            }
        }
        .house {
            display: flex;
            justify-content: space-between;
            border-bottom: 1px solid #eee;
            padding: 4px 0;
    
            .name {
                font-size: 13px;
            }
    
            .deg {
                width: 70px;
                font-family: monospace;
            }
    
            .house {
                font-size: 12px;
                color: #999;
                margin-left: 6px;
            }
        }
    }

}

.aspect-panel {
    width: 360px;
    text-align: left;
    .aspect-row {
        display: block;
        padding: 6px 0;
    }

    .orb {
        font-size: 13px;
        color: #999;
    }

    .interp {
        font-size: 12px;
        color: #666;
        margin-top: 2px;
    }

    .type {
        flex: 1;
        text-align: center;
    }
}

.p {
    width: 30px;
    text-align: center;
}


.reading {
    max-width: 360px;
    font-size: 13px;
    line-height: 1.6em;
    text-align: left;
}
</style>