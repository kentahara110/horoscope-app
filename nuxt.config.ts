export default defineNuxtConfig({
  vite: {
    assetsInclude: ['**/*.wasm', '**/*.data'],
    optimizeDeps: {
      exclude: ['swisseph-wasm']
    }
  }
})