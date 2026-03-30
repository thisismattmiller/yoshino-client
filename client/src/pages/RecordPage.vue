<template>
  <div class="record-page">
    <header class="record-header">
      <router-link to="/" class="back-home">Library of Congress</router-link>
      <button class="back-btn" @click="$router.back()">&#8592; Back</button>
    </header>

    <div v-if="loading" class="loading">Loading record...</div>
    <div v-if="error" class="error">{{ error }}</div>

    <template v-if="!loading">
      <!-- Record Info -->
      <section v-if="recordMeta" class="record-detail">
        <h1>{{ recordMeta.Title || 'Record ' + recordId }}</h1>
        <p v-if="recordMeta.Creator" class="detail-creator">{{ recordMeta.Creator }}</p>
        <p v-if="recordMeta.LCC" class="detail-lcc">LCC: {{ recordMeta.LCC }}</p>
      </section>

      <!-- Enrichment Data -->
      <section v-if="enrichment" class="enrichment-section">
        <h2>Subjects & Classifications</h2>
        <div v-if="enrichment.subjects?.length" class="enrichment-group">
          <h3>Subjects</h3>
          <ul>
            <li v-for="s in enrichment.subjects" :key="s">{{ s }}</li>
          </ul>
        </div>
        <div v-if="enrichment.classifications?.length" class="enrichment-group">
          <h3>Classifications</h3>
          <ul>
            <li v-for="c in enrichment.classifications" :key="c">{{ c }}</li>
          </ul>
        </div>
      </section>

      <!-- Similar Records -->
      <section v-if="similar.length" class="similar-section">
        <h2>Similar Records</h2>
        <ResultList :results="similar" @select="onSelectSimilar" />
      </section>

      <!-- Performance -->
      <PerformanceBar v-if="performance" :performance="performance" />

      <!-- Rating -->
      <div class="rating-section">
        <RatingWidget @rate="onRate" />
      </div>
    </template>
  </div>
</template>

<script>
import { apiCall, submitRating } from '../api.js'
import ResultList from '../components/ResultList.vue'
import PerformanceBar from '../components/PerformanceBar.vue'
import RatingWidget from '../components/RatingWidget.vue'

export default {
  name: 'RecordPage',

  components: { ResultList, PerformanceBar, RatingWidget },

  data() {
    return {
      recordId: '',
      recordMeta: null,
      similar: [],
      enrichment: null,
      performance: null,
      loading: true,
      error: null,
    }
  },

  created() {
    this.recordId = this.$route.params.id
    this.loadRecord()
  },

  watch: {
    '$route.params.id'(newId) {
      this.recordId = newId
      this.loadRecord()
    },
  },

  methods: {
    async loadRecord() {
      this.loading = true
      this.error = null

      try {
        // Find similar records
        const simData = await apiCall('find_similar', {
          record_id: this.recordId,
          top_k: 10,
        })

        if (simData.found === false) {
          this.error = 'Record not found in index'
          return
        }

        this.similar = simData.results || []
        this.performance = simData.performance || null

        // If we got metadata from the first result or from the response itself
        if (simData.metadata) {
          this.recordMeta = simData.metadata
        }

        // Try to get enrichment via lccn2bibid then enrich
        await this.loadEnrichment()
      } catch (err) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    async loadEnrichment() {
      try {
        // Try lccn lookup first
        const bibData = await apiCall('lccn2bibid', { lccn: this.recordId })
        if (bibData.found && bibData.bib_id) {
          // Store metadata from LCCN lookup
          if (bibData.label && !this.recordMeta) {
            this.recordMeta = { Title: bibData.label }
          }

          const enrichData = await apiCall('enrich', { ids: [bibData.bib_id] })
          if (enrichData.results?.[bibData.bib_id]) {
            this.enrichment = enrichData.results[bibData.bib_id]
          }
        }
      } catch {
        // Enrichment is optional, ignore failures
      }
    },

    onSelectSimilar(result) {
      const id = result.lc_001 || result.key
      this.$router.push(`/record/${id}`)
    },

    async onRate(rating) {
      try {
        await submitRating({
          query: this.recordId,
          action: 'find_similar',
          result_id: this.recordId,
          rating,
        })
      } catch {
        // Silent fail
      }
    },
  },
}
</script>

<style scoped>
.record-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.record-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.back-home {
  font-size: 20px;
  font-weight: 700;
  color: #1a1a2e;
}

.back-btn {
  background: none;
  border: none;
  font-size: 14px;
  color: #888;
  cursor: pointer;
}

.back-btn:hover {
  color: #1a1a2e;
}

.record-detail {
  margin-bottom: 24px;
}

.record-detail h1 {
  font-size: 24px;
  margin-bottom: 8px;
}

.detail-creator {
  font-size: 16px;
  color: #555;
  margin-bottom: 4px;
}

.detail-lcc {
  font-size: 14px;
  color: #888;
  font-family: monospace;
}

.enrichment-section {
  margin-bottom: 24px;
}

.enrichment-section h2 {
  font-size: 18px;
  margin-bottom: 12px;
}

.enrichment-group {
  margin-bottom: 12px;
}

.enrichment-group h3 {
  font-size: 14px;
  color: #888;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.enrichment-group ul {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.enrichment-group li {
  padding: 4px 10px;
  background: #f0f0f0;
  border-radius: 6px;
  font-size: 13px;
}

.similar-section {
  margin-bottom: 24px;
}

.similar-section h2 {
  font-size: 18px;
  margin-bottom: 12px;
}

.loading {
  text-align: center;
  padding: 40px 0;
  color: #888;
}

.error {
  text-align: center;
  padding: 20px;
  background: #fff5f5;
  color: #c53030;
  border-radius: 8px;
}

.rating-section {
  display: flex;
  justify-content: center;
  padding: 16px 0;
}
</style>
