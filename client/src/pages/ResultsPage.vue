<template>
  <div class="results-page">
    <router-link to="/" class="back-link">&#8592; Back</router-link>
    <header class="results-header">
      <SearchBox
        :initialQuery="query"
        :initialRaw="raw"
        :searching="loading"
        @search="onSearch"
      />
    </header>

    <div class="results-body">
      <PetalLoader v-if="loading" />

      <div v-if="error" class="error">{{ error }}</div>

      <template v-if="!loading && !error && results">
        <div class="results-toolbar">
          <RatingWidget @rate="onRate" />
          <button class="tech-btn" @click="showTech = !showTech">
            {{ showTech ? 'Hide' : 'Show' }} Tech Details
          </button>
        </div>

        <div v-if="showTech" class="tech-details">
          <div class="tech-section">
            <h3>Performance</h3>
            <PerformanceBar :performance="performance" />
          </div>
          <div v-if="expandedQuery" class="tech-section">
            <h3>Expanded Query</h3>
            <pre class="expanded-query-pre">{{ expandedQuery }}</pre>
          </div>
          <div class="tech-section">
            <h3>Raw API Response</h3>
            <pre class="json-view">{{ JSON.stringify(rawResponse, null, 2) }}</pre>
          </div>
        </div>

        <ResultList
          :results="results"
          :expandedQuery="''"
          :covers="covers"
          @select="onSelectResult"
        />

        <div v-if="enrichSubjects.length || enrichClassifications.length" class="enrich-panel">
          <h3 class="enrich-title">Continue your Library of Congress search using these terms:</h3>
          <div v-if="enrichSubjects.length" class="enrich-section">
            <h4>Subject Headings</h4>
            <div class="enrich-tags">
              <a
                v-for="s in enrichSubjects"
                :key="s"
                :href="subjectSearchUrl(s)"
                target="_blank"
                rel="noopener"
                class="enrich-tag subject"
              >{{ s }}</a>
            </div>
          </div>
          <div v-if="enrichClassifications.length" class="enrich-section">
            <h4>Classifications</h4>
            <div class="enrich-tags">
              <span
                v-for="c in enrichClassifications"
                :key="c.portion"
                class="enrich-tag classification"
              >
                {{ c.portion }}
                <span v-if="c.hierarchy" class="enrich-hierarchy">{{ c.hierarchy.join(' > ') }}</span>
              </span>
            </div>
          </div>
          <div v-if="enrichErrors.length" class="enrich-errors">
            <span v-for="e in enrichErrors" :key="e" class="enrich-error">id.loc.gov error for {{ e }} (timeout)</span>
          </div>
        </div>
        <div v-if="enrichLoading" class="enrich-loading">Loading subject headings...</div>
      </template>
    </div>
  </div>
</template>

<script>
import { apiCall, submitRating } from '../api.js'
import { enrich } from '../enrich.js'
import SearchBox from '../components/SearchBox.vue'
import PetalLoader from '../components/PetalLoader.vue'
import ResultList from '../components/ResultList.vue'
import PerformanceBar from '../components/PerformanceBar.vue'
import RatingWidget from '../components/RatingWidget.vue'

export default {
  name: 'ResultsPage',

  components: { SearchBox, PetalLoader, ResultList, PerformanceBar, RatingWidget },

  data() {
    return {
      query: '',
      raw: false,
      filter: null,
      topK: 20,
      results: null,
      expandedQuery: '',
      performance: null,
      rawResponse: null,
      covers: {},
      loading: false,
      error: null,
      showTech: false,
      enrichLoading: false,
      enrichSubjects: [],
      enrichClassifications: [],
      enrichErrors: [],
    }
  },

  created() {
    this.query = this.$route.query.q || ''
    this.raw = this.$route.query.raw === '1'
    if (this.$route.query.filter) {
      try { this.filter = JSON.parse(this.$route.query.filter) } catch {}
    }
    if (this.query) this.doSearch()
  },

  watch: {
    '$route.query.q'(newQ) {
      if (newQ && newQ !== this.query) {
        this.query = newQ
        this.raw = this.$route.query.raw === '1'
        if (this.$route.query.filter) {
          try { this.filter = JSON.parse(this.$route.query.filter) } catch {}
        }
        this.doSearch()
      }
    },
  },

  methods: {
    onSearch({ query, raw, filter, top_k }) {
      this.query = query
      this.raw = raw
      this.filter = filter
      if (top_k) this.topK = top_k
      const routeQuery = { q: query, raw: raw ? '1' : '0' }
      if (filter) routeQuery.filter = JSON.stringify(filter)
      this.$router.replace({ path: '/results', query: routeQuery })
      this.doSearch()
    },

    onFilterChange({ filter, top_k }) {
      this.filter = filter
      this.topK = top_k
      if (this.query) this.doSearch()
    },

    async doSearch() {
      this.loading = true
      this.error = null
      this.results = null
      this.covers = {}
      this.rawResponse = null
      this.enrichSubjects = []
      this.enrichClassifications = []
      this.enrichErrors = []
      this.enrichLoading = false

      try {
        const params = {
          query: this.query,
          top_k: this.topK,
          raw: this.raw,
        }
        if (this.filter) params.filter = this.filter

        const data = await apiCall('search', params)
        this.rawResponse = data
        this.results = data.results || []
        this.expandedQuery = data.expanded_query || ''
        this.performance = data.performance || null

        this.fetchCovers()
        this.fetchEnrichment()
      } catch (err) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    async fetchCovers() {
      if (!this.results?.length) return

      // Build isbn_map using 001 as key and ISBNS array as value
      const isbnMap = {}
      for (const r of this.results) {
        const id = r.metadata?.['001'] || r.lc_001
        const isbns = r.metadata?.ISBNS
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
        // Non-critical, ignore cover fetch failures
      }
    },

    async fetchEnrichment() {
      if (!this.results?.length) return

      const ids = []
      for (const r of this.results) {
        const id = r.metadata?.['001'] || r.lc_001
        if (id) ids.push(id)
      }
      if (!ids.length) return

      this.enrichLoading = true
      try {
        const data = await enrich(ids.slice(0, 10))
        this.enrichSubjects = (data.unique_subjects || []).map(s => s.label)
        this.enrichClassifications = data.unique_classifications || []
        if (data.errors) this.enrichErrors = Object.keys(data.errors)
      } catch {
        // Non-critical
      } finally {
        this.enrichLoading = false
      }
    },

    subjectSearchUrl(subject) {
      const normalized = subject.replace(/\s*--\s*/g, '--').replace(/\.+$/, '')
      const encoded = encodeURIComponent(`subjects.value==/string "${normalized}"`)
      return `https://search.catalog.loc.gov/search?option=query&pageNumber=1&query=${encoded}&recordsPerPage=25`
    },

    onSelectResult(result) {
      const id = result.lc_001 || result.key
      this.$router.push(`/record/${id}`)
    },

    async onRate(rating) {
      try {
        await submitRating({
          query: this.query,
          action: 'search',
          rating,
        })
      } catch {
        // Silent fail for ratings
      }
    },
  },
}
</script>

<style scoped>
.results-page {
  width: 100%;
  padding: 20px 32px;
  position: relative;
}

.results-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.back-link {
  position: absolute;
  top: 20px;
  left: 32px;
  font-size: 14px;
  color: #888;
  text-decoration: none;
  transition: color 0.2s;
}

.back-link:hover {
  color: #1a1a2e;
}

.results-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.error {
  text-align: center;
  padding: 20px;
  background: #fff5f5;
  color: #c53030;
  border-radius: 8px;
}

.results-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #fafafa;
  border-radius: 10px;
  border: 1px solid #eee;
}

.tech-btn {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #fff;
  font-size: 14px;
  color: #555;
  cursor: pointer;
  transition: background 0.2s;
}

.tech-btn:hover {
  background: #f0f0f0;
}

.tech-details {
  background: #1a1a2e;
  border-radius: 10px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tech-section h3 {
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #888;
  margin-bottom: 8px;
}

.expanded-query-pre {
  background: #111;
  color: #e0e0e0;
  padding: 14px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: monospace;
  max-height: 300px;
  overflow-y: auto;
}

.json-view {
  background: #111;
  color: #a5d6a7;
  padding: 14px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: monospace;
  max-height: 500px;
  overflow-y: auto;
}

.enrich-panel {
  margin-top: 24px;
  padding: 20px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 12px;
}

.enrich-title {
  font-size: 16px;
  font-weight: 700;
  color: #166534;
  margin-bottom: 14px;
}

.enrich-section {
  margin-bottom: 12px;
}

.enrich-section h4 {
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #888;
  margin-bottom: 8px;
}

.enrich-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.enrich-tag {
  font-size: 13px;
  padding: 5px 12px;
  border-radius: 6px;
  text-decoration: none;
}

.enrich-tag.subject {
  background: #eef2ff;
  color: #3730a3;
  cursor: pointer;
  transition: background 0.15s;
}

.enrich-tag.subject:hover {
  background: #dbeafe;
  text-decoration: underline;
}

.enrich-tag.classification {
  background: #fef3c7;
  color: #92400e;
}

.enrich-hierarchy {
  font-size: 11px;
  color: #a78bfa;
  margin-left: 4px;
}

.enrich-errors {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.enrich-error {
  font-size: 12px;
  color: #b45309;
  background: #fef3c7;
  padding: 3px 8px;
  border-radius: 4px;
}

.enrich-loading {
  margin-top: 16px;
  text-align: center;
  font-size: 14px;
  color: #999;
  padding: 16px;
}
</style>
