<template>
  <div class="home-page">
    <a class="sandbox-badge" href="https://staff.loc.gov/wikis/display/DIGS/Digital+Strategy+Directorate+and+Artificial+Intelligence" target="_blank" rel="noopener"><img :src="sparkleUrl" class="sparkle-icon" /> A Staff AI Sandbox Experiment</a>
    <LogoScene />
    <div class="resource-status"><span class="status-dot"></span>Searching 20.3 Million Embeddings (data cutoff: mid-2025)</div>
    <SearchBox @search="onSearch" />
    <div class="home-nav-corner">
      <router-link to="/classify" class="nav-link">Classification Tool</router-link>
      <span class="nav-sep">|</span>
      <router-link to="/similar" class="nav-link">Find Similar by LCCN</router-link>
    </div>
  </div>
</template>

<script>
import LogoScene from '../components/LogoScene.vue'
import SearchBox from '../components/SearchBox.vue'
import { asset } from '../assets.js'

export default {
  name: 'HomePage',

  components: { LogoScene, SearchBox },

  data() {
    return {
      sparkleUrl: asset('/sparkle.svg'),
    }
  },

  methods: {
    onSearch({ query, raw, filter, top_k }) {
      const routeQuery = { q: query, raw: raw ? '1' : '0' }
      if (filter) routeQuery.filter = JSON.stringify(filter)
      if (top_k) routeQuery.top_k = top_k
      this.$router.push({ path: '/results', query: routeQuery })
    },
  },
}
</script>

<style scoped>
.home-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  min-height: 100vh;
  padding-top: 40px;
  position: relative;
}

.sandbox-badge {
  position: absolute;
  top: 14px;
  left: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  text-decoration: none;
  background: #e0f2fe;
  color: #0369a1;
  padding: 5px 10px;
  border-radius: 6px;
  border: 1px solid #bae6fd;
  transition: background 0.2s;
}

.sandbox-badge:hover {
  background: #bae6fd;
}

.sparkle-icon {
  width: 16px;
  height: 16px;
}

.resource-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #888;
  margin-top: 12px;
  margin-bottom: 4px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
  flex-shrink: 0;
}

.home-nav-corner {
  position: absolute;
  top: 14px;
  right: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-link {
  font-size: 14px;
  color: #888;
  border-bottom: 1px solid transparent;
  transition: color 0.2s, border-color 0.2s;
}

.nav-link:hover {
  color: #1a1a2e;
  border-bottom-color: #1a1a2e;
}

.nav-sep {
  color: #ddd;
  margin: 0 4px;
}
</style>
