<script setup>
import { ref, onMounted } from 'vue'

const positions = ref({})
const aspectLines = ref([])
const isReady = ref(false)

const zodiac = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓']

const cx = 200
const cy = 200

function polarToCartesian(cx, cy, r, angle) {
    const rad = (angle - 90) * Math.PI / 180
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

onMounted(async () => {
    const SwissEph = (await import('swisseph-wasm')).default

    const swe = new SwissEph({
        locateFile: (file) => `/${file}`
    })

    await swe.initSwissEph()

    const jd = swe.julday(1993, 1, 10, 11 + 26 / 60 - 9)

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


    const p1 = polarToCartesian(cx, cy, 100, displayPositions[nameA])
    const p2 = polarToCartesian(cx, cy, 100, displayPositions[nameB])

    // 基本の太さ
    let width = 0.5 + strength * 2

    // ② メジャーアスペクト強調（ここ！）
    if (['trine','square','opposition','conjunction'].includes(type)) {
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
}


        }
    }

    aspectLines.value = aspectLinesData
    isReady.value = true
})
</script>

<template>
    <ClientOnly>
        <div style="text-align:center">

            <h2>ホロスコープ</h2>

            <svg width="400" height="400">

                <!-- 外円 -->
                <circle :cx="cx" :cy="cy" r="180" stroke="black" fill="none" />
                <circle :cx="cx" :cy="cy" r="140" stroke="#aaa" fill="none" />

                <!-- 星座区切り -->
                <g>
                    <line v-for="i in 12" :key="i" :x1="cx" :y1="cy" :x2="polarToCartesian(cx, cy, 180, i * 30).x"
                        :y2="polarToCartesian(cx, cy, 180, i * 30).y" stroke="#ddd" />
                </g>

                <!-- 星座 -->
                <g>
                    <text v-for="i in 12" :key="'z' + i" :x="polarToCartesian(cx, cy, 165, i * 30 + 15).x"
                        :y="polarToCartesian(cx, cy, 165, i * 30 + 15).y" text-anchor="middle"
                        alignment-baseline="middle" font-size="16">
                        {{ zodiac[i - 1] }}
                    </text>
                </g>

                <!-- アスペクト -->
                <g v-if="isReady">
                    <line v-for="(line, i) in aspectLines" :key="i" :x1="line.x1" :y1="line.y1" :x2="line.x2"
                        :y2="line.y2" :stroke="line.color" stroke-linecap="round"
                        :opacity="line.opacity" :stroke-width="line.width" />
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

            </svg>

        </div>
    </ClientOnly>
</template>