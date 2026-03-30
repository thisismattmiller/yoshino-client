<template>
  <div class="similar-page">
    <router-link to="/" class="back-link">&#8592; Back</router-link>
    <header class="similar-header">
      <h1>Find Similar Records</h1>
      <p class="subtitle">Enter an LCCN to find similar items in the collection</p>
    </header>

    <div class="search-area">
      <input
        ref="input"
        v-model="lccn"
        type="text"
        class="lccn-input"
        placeholder="Enter LCCN (e.g. 78535933)"
        @keydown.enter="onSearch"
      />
      <button class="search-btn" :disabled="!lccn.trim() || loading" @click="onSearch">
        <span v-if="loading" class="spinner"></span>
        {{ loading ? stepText : 'Find Similar' }}
      </button>
    </div>

    <div v-if="error" class="error">{{ error }}</div>

    <!-- Record info -->
    <div v-if="recordLabel" class="record-info">
      <h2>{{ recordLabel }}</h2>
      <a :href="'https://lccn.loc.gov/' + lccn.trim()" target="_blank" rel="noopener" class="lccn-link">
        LCCN: {{ lccn.trim() }}
      </a>
      <span v-if="bibId" class="bib-id">Bib ID: {{ bibId }}</span>
    </div>

    <!-- Progress -->
    <div v-if="step === 'covers'" class="loading-text">Loading covers...</div>

    <!-- Similar results -->
    <div v-if="results.length" class="results-section">
      <h2>{{ results.length }} Similar Records</h2>
      <div class="results-grid">
        <div v-for="item in results" :key="item.key || item.lc_001" class="result-card">
          <div class="card-cover">
            <img
              v-if="covers[itemId(item)]"
              :src="covers[itemId(item)]"
              class="cover-img"
            />
            <div v-else class="cover-placeholder">
              <img
                v-if="item.metadata && item.metadata.MT"
                :src="asset('/' + item.metadata.MT + '.svg')"
                class="mt-icon"
              />
            </div>
          </div>
          <div class="card-body">
            <h3 class="card-title">{{ item.metadata && item.metadata.Title || 'Untitled' }}</h3>
            <p v-if="item.metadata && item.metadata.Creator" class="card-creator">{{ item.metadata.Creator }}</p>
            <div class="card-meta">
              <span class="score">{{ (item.score * 100).toFixed(1) }}%</span>
              <span v-if="item.metadata && item.metadata.LCC" class="lcc-tag">{{ item.metadata.LCC }}</span>
              <span v-if="item.metadata && item.metadata.MT" class="mt-tag">{{ item.metadata.MT }}</span>
            </div>
            <a
              v-if="item.metadata && item.metadata.LCCN"
              :href="'https://lccn.loc.gov/' + item.metadata.LCCN"
              target="_blank"
              rel="noopener"
              class="card-lccn"
              @click.stop
            >LCCN: {{ item.metadata.LCCN }}</a>
            <div v-if="item.metadata && item.metadata.Subjects && item.metadata.Subjects.length" class="card-subjects">
              <a
                v-for="s in item.metadata.Subjects.slice(0, 3)"
                :key="s"
                :href="s.includes('--') ? subjectSearchUrl(s) : undefined"
                :target="s.includes('--') ? '_blank' : undefined"
                rel="noopener"
                class="subject-tag"
                :class="{ clickable: s.includes('--') }"
                @click.stop
              >{{ s }}</a>
              <span v-if="item.metadata.Subjects.length > 3" class="more-subjects">+{{ item.metadata.Subjects.length - 3 }} more</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { apiCall } from '../api.js'
import { lccn2bibid } from '../lccn2bibid.js'
import { asset } from '../assets.js'

export default {
  name: 'SimilarPage',

  data() {
    return {
      lccn: '',
      loading: false,
      step: null,
      error: null,
      recordLabel: '',
      bibId: '',
      results: [],
      covers: {},
    }
  },

  computed: {
    stepText() {
      if (this.step === 'lccn') return 'Looking up LCCN...'
      if (this.step === 'similar') return 'Finding similar...'
      if (this.step === 'covers') return 'Loading covers...'
      return 'Working...'
    },
  },

  mounted() {
    this.$refs.input.focus()
    // Check for LCCN in route query
    if (this.$route.query.lccn) {
      this.lccn = this.$route.query.lccn
      this.onSearch()
    }
  },

  methods: {
    asset,
    itemId(item) {
      return (item.metadata && item.metadata['001']) || item.key || item.lc_001
    },

    subjectSearchUrl(subject) {
      const normalized = subject.replace(/\s*--\s*/g, '--')
      const encoded = encodeURIComponent(`subjects.value==/string "${normalized}"`)
      return `https://search.catalog.loc.gov/search?option=query&pageNumber=1&query=${encoded}&recordsPerPage=25`
    },

    async onSearch() {
      const lccn = this.lccn.trim()
      if (!lccn) return

      this.loading = true
      this.error = null
      this.recordLabel = ''
      this.bibId = ''
      this.results = []
      this.covers = {}

      try {
        // Step 1: Resolve LCCN to bib ID (client-side, prefers preprod)
        this.step = 'lccn'
        const lookup = await lccn2bibid(lccn)

        if (!lookup.found) {
          // Fall back to server-side API
          const serverLookup = await apiCall('lccn2bibid', { lccn })
          if (!serverLookup.found) {
            this.error = `LCCN "${lccn}" not found`
            return
          }
          this.bibId = serverLookup.bib_id
          this.recordLabel = serverLookup.label || ''
        } else {
          this.bibId = lookup.bib_id
          this.recordLabel = lookup.label || ''
        }

        // Step 2: Find similar records using the bib ID
        this.step = 'similar'
        const simData = await apiCall('find_similar', {
          record_id: this.bibId,
          top_k: 20,
        })

        if (!simData.found) {
          this.error = 'Record not found in vector index'
          return
        }

        this.results = simData.results || []

        // Step 3: Fetch covers
        this.step = 'covers'
        await this.fetchCovers()
      } catch (err) {
        this.error = err.message
      } finally {
        this.loading = false
        this.step = null
      }
    },

    async fetchCovers() {
      const isbnMap = {}
      for (const r of this.results) {
        const id = this.itemId(r)
        const isbns = r.metadata && r.metadata.ISBNS
        if (id && isbns && isbns.length) isbnMap[id] = isbns
      }
      if (!Object.keys(isbnMap).length) return

      try {
        const data = await apiCall('isbn2covers', { isbn_map: isbnMap })
        const coverMap = data.covers || data
        const newCovers = {}
        for (const [id, url] of Object.entries(coverMap)) {
          if (url) newCovers[id] = url
        }
        this.covers = newCovers
      } catch {
        // ignore
      }
    },
  },
}
</script>

<style scoped>
.similar-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  position: relative;
}

.back-link {
  position: absolute;
  top: 20px;
  left: 20px;
  font-size: 14px;
  color: #888;
  text-decoration: none;
  transition: color 0.2s;
}

.back-link:hover {
  color: #1a1a2e;
}

.similar-header {
  text-align: center;
  margin-bottom: 24px;
}

.similar-header h1 {
  font-size: 22px;
  color: #1a1a2e;
}

.subtitle {
  font-size: 14px;
  color: #888;
  margin-top: 4px;
}

.search-area {
  display: flex;
  gap: 10px;
  max-width: 500px;
  margin: 0 auto 24px;
}

.lccn-input {
  flex: 1;
  padding: 12px 18px;
  font-size: 16px;
  border: 1px solid #ddd;
  border-radius: 12px;
  outline: none;
  transition: border-color 0.2s;
}

.lccn-input:focus {
  border-color: #999;
}

.search-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  border-radius: 12px;
  background: #1a1a2e;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s;
}

.search-btn:hover {
  background: #2d2d4e;
}

.search-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error {
  padding: 16px;
  background: #fff5f5;
  color: #c53030;
  border-radius: 8px;
  margin-bottom: 16px;
  text-align: center;
}

.record-info {
  text-align: center;
  margin-bottom: 24px;
  padding: 16px;
  background: #fafafa;
  border-radius: 10px;
  border: 1px solid #eee;
}

.record-info h2 {
  font-size: 18px;
  margin-bottom: 6px;
}

.lccn-link {
  font-size: 14px;
  color: #0369a1;
  text-decoration: underline;
}

.lccn-link:hover {
  color: #0c4a6e;
}

.bib-id {
  font-size: 13px;
  color: #aaa;
  margin-left: 12px;
  font-family: monospace;
}

.loading-text {
  text-align: center;
  color: #999;
  font-size: 14px;
  padding: 12px 0;
}

.results-section {
  margin-top: 16px;
}

.results-section h2 {
  font-size: 16px;
  margin-bottom: 14px;
  color: #555;
}

.results-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-card {
  display: flex;
  gap: 16px;
  padding: 16px;
  border: 1px solid #eee;
  border-radius: 10px;
  transition: box-shadow 0.2s;
}

.result-card:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.card-cover {
  flex-shrink: 0;
}

.cover-img {
  width: 80px;
  height: 110px;
  object-fit: cover;
  border-radius: 4px;
}

.cover-placeholder {
  width: 80px;
  height: 110px;
  background: #f0f0f0;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mt-icon {
  width: 32px;
  height: 32px;
  opacity: 0.35;
}

.card-body {
  flex: 1;
  min-width: 0;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.3;
  margin-bottom: 2px;
}

.card-creator {
  font-size: 14px;
  color: #666;
  margin-bottom: 6px;
}

.card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 6px;
}

.score {
  font-size: 13px;
  font-weight: 700;
  color: #2d6a4f;
  background: #e6f4ea;
  padding: 2px 8px;
  border-radius: 5px;
}

.lcc-tag, .mt-tag {
  font-size: 12px;
  padding: 2px 8px;
  background: #f5f5f5;
  border-radius: 5px;
  color: #555;
}

.card-lccn {
  font-size: 13px;
  color: #0369a1;
  text-decoration: underline;
  display: inline-block;
  margin-bottom: 6px;
}

.card-lccn:hover {
  color: #0c4a6e;
}

.card-subjects {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.subject-tag {
  font-size: 12px;
  padding: 2px 8px;
  background: #eef2ff;
  color: #3730a3;
  border-radius: 4px;
  text-decoration: none;
  cursor: default;
}

.subject-tag.clickable {
  cursor: pointer;
}

.subject-tag.clickable:hover {
  background: #dbeafe;
  text-decoration: underline;
}

.more-subjects {
  font-size: 11px;
  color: #999;
}
</style>
