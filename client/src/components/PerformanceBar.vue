<template>
  <div v-if="performance" class="perf-bar">
    <div class="perf-timings">
      <span v-for="(val, key) in timings" :key="key" class="perf-item">
        <span class="perf-label">{{ formatLabel(key) }}</span>
        <span class="perf-value">{{ formatTime(val) }}</span>
      </span>
    </div>

    <div v-if="performance.tokens" class="perf-tokens">
      <div class="token-section">
        <span class="token-heading">Token Usage by Step</span>
        <div class="token-rows">
          <div v-for="(info, step) in performance.tokens.steps" :key="step" class="token-row">
            <span class="token-step">{{ formatLabel(step) }}</span>
            <span class="token-model">{{ shortModel(info.model) }}</span>
            <span class="token-count"><span class="tok-label">in:</span> {{ info.input_tokens.toLocaleString() }}</span>
            <span class="token-count"><span class="tok-label">out:</span> {{ info.output_tokens.toLocaleString() }}</span>
          </div>
        </div>
      </div>
      <div class="token-section">
        <span class="token-heading">Totals by Model</span>
        <div class="token-rows">
          <div v-for="(info, model) in performance.tokens.by_model" :key="model" class="token-row">
            <span class="token-model-name">{{ shortModel(model) }}</span>
            <span class="token-count"><span class="tok-label">in:</span> {{ info.input_tokens.toLocaleString() }}</span>
            <span class="token-count"><span class="tok-label">out:</span> {{ info.output_tokens.toLocaleString() }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PerformanceBar',

  props: {
    performance: { type: Object, default: null },
  },

  computed: {
    timings() {
      if (!this.performance) return {}
      const out = {}
      for (const [key, val] of Object.entries(this.performance)) {
        if (key !== 'tokens' && typeof val === 'number') out[key] = val
      }
      return out
    },
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
    shortModel(model) {
      if (!model) return ''
      // e.g. "us.anthropic.claude-haiku-4-5-20251001-v1:0" → "claude-haiku-4-5"
      const m = model.match(/claude-[a-z]+-[\d-]+(?=-\d{8})/)
      if (m) return m[0]
      // e.g. "amazon.titan-embed-text-v2:0" → "titan-embed-text-v2"
      const t = model.match(/titan-[a-z-]+-v\d+/)
      if (t) return t[0]
      return model.split('.').pop().replace(/:.*/, '')
    },
  },
}
</script>

<style scoped>
.perf-bar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 8px;
  font-size: 12px;
}

.perf-timings {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
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

.perf-tokens {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  border-top: 1px solid #e0e0e0;
  padding-top: 10px;
}

.token-section {
  flex: 1;
  min-width: 240px;
}

.token-heading {
  font-weight: 600;
  color: #666;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: block;
  margin-bottom: 6px;
}

.token-rows {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.token-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: monospace;
  font-size: 12px;
}

.token-step {
  color: #888;
  text-transform: capitalize;
  min-width: 80px;
}

.token-model,
.token-model-name {
  color: #7c3aed;
  font-size: 11px;
  min-width: 140px;
}

.token-count {
  color: #555;
  font-weight: 600;
  min-width: 70px;
}

.tok-label {
  color: #aaa;
  font-weight: 400;
  font-size: 11px;
}
</style>
