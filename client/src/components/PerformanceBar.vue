<template>
  <div v-if="performance" class="perf-bar">
    <span v-for="(val, key) in performance" :key="key" class="perf-item">
      <span class="perf-label">{{ formatLabel(key) }}</span>
      <span class="perf-value">{{ formatTime(val) }}</span>
    </span>
  </div>
</template>

<script>
export default {
  name: 'PerformanceBar',

  props: {
    performance: { type: Object, default: null },
  },

  methods: {
    formatLabel(key) {
      return key.replace(/_/g, ' ')
    },
    formatTime(seconds) {
      if (typeof seconds !== 'number') return seconds
      return seconds < 1
        ? `${(seconds * 1000).toFixed(0)}ms`
        : `${seconds.toFixed(2)}s`
    },
  },
}
</script>

<style scoped>
.perf-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 8px;
  font-size: 12px;
}

.perf-item {
  display: flex;
  gap: 4px;
  align-items: center;
}

.perf-label {
  color: #888;
  text-transform: capitalize;
}

.perf-value {
  font-weight: 600;
  color: #555;
  font-family: monospace;
}
</style>
