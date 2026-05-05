<script setup>
import { onMounted, ref } from 'vue'
import { SwissEph } from 'swisseph-wasm'

const result = ref(null)

onMounted(async () => {
  const swe = new SwissEph({
    locateFile: (file) => `/swisseph.wasm`
  })

  await swe.init()

  // 1995/6/15 14:30 JST → UTC
  const jd = swe.julday(1995, 6, 15, 14.5 - 9)

  const sun = swe.calc_ut(jd, swe.SE_SUN)
  const moon = swe.calc_ut(jd, swe.SE_MOON)

  result.value = {
    sun: sun.longitude,
    moon: moon.longitude
  }
})
</script>

<template>
  <div>
    <h1>Swiss Ephemeris WASM テスト</h1>

    <div v-if="result">
      <p>太陽: {{ result.sun.toFixed(2) }}°</p>
      <p>月: {{ result.moon.toFixed(2) }}°</p>
    </div>

    <div v-else>
      読み込み中...
    </div>
  </div>
</template>