<template>
  <div class="classify-page">
    <router-link to="/" class="back-link">&#8592; Back</router-link>
    <header class="classify-header">
      <h1>Classification Tool</h1>
    </header>

    <form class="classify-form" @submit.prevent="onSubmit">
      <div class="form-group">
        <label>Title <span class="required">*</span></label>
        <input v-model="title" type="text" placeholder="Enter work title" required />
      </div>

      <div class="form-group">
        <label>Summary <span class="required">*</span></label>
        <textarea v-model="summary" rows="4" placeholder="Describe the work..." required></textarea>
      </div>

      <div class="form-group">
        <label>Creator</label>
        <input v-model="creator" type="text" placeholder="Author or creator (optional)" />
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Top K</label>
          <select v-model.number="topK">
            <option :value="5">5</option>
            <option :value="10">10</option>
            <option :value="20">20</option>
          </select>
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="autoFilter" />
            Auto-filter by LCC class
          </label>
        </div>
      </div>

      <button type="submit" class="submit-btn" :disabled="loading || !title.trim() || !summary.trim()">
        <span v-if="loading" class="spinner"></span>
        {{ statusText }}
      </button>
    </form>

    <div v-if="error" class="error">{{ error }}</div>

    <!-- Progress -->
    <div v-if="step && !done" class="progress-bar">
      <div class="progress-step" :class="{ active: step === 'classify' }">1. Finding similar records...</div>
      <div class="progress-step" :class="{ active: step === 'enrich' }">2. Collecting subject headings from id.loc.gov... ({{ enrichProgress }}/{{ enrichTotal }})</div>
      <div class="progress-step" :class="{ active: step === 'judge' }">3. Asking LLM to judge subjects...</div>
    </div>

    <!-- Results -->
    <template v-if="done">
      <section class="recommendations">
        <h2>LLM Recommended Subjects</h2>
        <div class="tag-list">
          <a
            v-for="s in recommendedSubjects"
            :key="'rec-' + s"
            :href="s.includes('--') ? subjectSearchUrl(s) : undefined"
            :target="s.includes('--') ? '_blank' : undefined"
            rel="noopener"
            class="tag recommended"
            :class="{ clickable: s.includes('--') }"
          >{{ s }}</a>
        </div>

        <h2>All Collected Subject Headings</h2>
        <div class="tag-list">
          <a
            v-for="s in otherSubjects"
            :key="'other-' + s"
            :href="s.includes('--') ? subjectSearchUrl(s) : undefined"
            :target="s.includes('--') ? '_blank' : undefined"
            rel="noopener"
            class="tag"
            :class="{ clickable: s.includes('--') }"
          >{{ s }}</a>
        </div>

        <h2 v-if="classifications.length">Classifications</h2>
        <div v-if="classifications.length" class="tag-list">
          <span
            v-for="c in classifications"
            :key="c.portion"
            class="tag classification"
          >
            {{ c.portion }}
            <span v-if="c.hierarchy" class="hierarchy">{{ c.hierarchy.join(' > ') }}</span>
          </span>
        </div>
      </section>

      <div v-if="enrichErrors.length" class="enrich-errors">
        <span v-for="e in enrichErrors" :key="e" class="enrich-error">id.loc.gov error for {{ e }} (timeout)</span>
      </div>

      <PerformanceBar v-if="classifyPerformance" :performance="classifyPerformance" />
    </template>
  </div>
</template>

<script>
import { apiCall } from '../api.js'
import { enrich } from '../enrich.js'
import PerformanceBar from '../components/PerformanceBar.vue'

export default {
  name: 'ClassifyPage',

  components: { PerformanceBar },

  data() {
    return {
      title: '',
      summary: '',
      creator: '',
      topK: 10,
      autoFilter: false,
      loading: false,
      error: null,
      step: null,
      done: false,
      enrichProgress: 0,
      enrichTotal: 0,
      allSubjects: [],
      recommendedSubjects: [],
      classifications: [],
      enrichErrors: [],
      classifyPerformance: null,
    }
  },

  computed: {
    statusText() {
      if (!this.loading) return 'Classify'
      if (this.step === 'classify') return 'Finding similar records...'
      if (this.step === 'enrich') return 'Collecting subjects...'
      if (this.step === 'judge') return 'Judging subjects...'
      return 'Working...'
    },
    otherSubjects() {
      const recSet = new Set(this.recommendedSubjects)
      return this.allSubjects.filter(s => !recSet.has(s))
    },
  },

  methods: {
    subjectSearchUrl(subject) {
      const normalized = subject.replace(/\s*--\s*/g, '--')
      const encoded = encodeURIComponent(`subjects.value==/string "${normalized}"`)
      return `https://search.catalog.loc.gov/search?option=query&pageNumber=1&query=${encoded}&recordsPerPage=25`
    },

    async onSubmit() {
      this.loading = true
      this.error = null
      this.done = false
      this.step = 'classify'
      this.allSubjects = []
      this.recommendedSubjects = []
      this.classifications = []
      this.enrichErrors = []
      this.enrichProgress = 0
      this.enrichTotal = 0
      this.classifyPerformance = null

      try {
        // Step 1: Call classify with ids_only to get matching record IDs
        const params = {
          title: this.title,
          summary: this.summary,
          top_k: this.topK,
          auto_filter: this.autoFilter,
          ids_only: true,
        }
        if (this.creator.trim()) params.creator = this.creator.trim()

        const classifyResult = await apiCall('classify', params)
        this.classifyPerformance = classifyResult.performance || null

        // Extract IDs from results
        const ids = (classifyResult.search_results || []).map(
          r => r.metadata?.['001'] || r.lc_001
        ).filter(Boolean)

        if (!ids.length) {
          this.error = 'No similar records found'
          return
        }

        // Step 2: Client-side enrich to collect subjects
        this.step = 'enrich'
        this.enrichTotal = ids.length

        const enrichResult = await enrich(ids, () => {
          this.enrichProgress++
        })

        this.allSubjects = (enrichResult.unique_subjects || []).map(s => s.label)
        this.classifications = enrichResult.unique_classifications || []
        if (enrichResult.errors) this.enrichErrors = Object.keys(enrichResult.errors)

        if (!this.allSubjects.length) {
          this.done = true
          return
        }

        // Step 3: Ask LLM to judge subjects
        this.step = 'judge'
        const text = `${this.title}. ${this.summary}`
        const judgeResult = await apiCall('judge_subjects', {
          subjects: this.allSubjects,
          text,
          top_n: Math.min(this.allSubjects.length, 10),
        })

        this.recommendedSubjects = judgeResult.subjects || []
        this.done = true
      } catch (err) {
        this.error = err.message
      } finally {
        this.loading = false
        this.step = null
      }
    },
  },
}
</script>

<style scoped>
.classify-page {
  max-width: 800px;
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

.classify-header {
  text-align: center;
  margin-bottom: 24px;
}

.classify-header h1 {
  font-size: 22px;
  color: #1a1a2e;
}

.classify-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-group label {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.required {
  color: #c53030;
}

.form-group input,
.form-group textarea,
.form-group select {
  padding: 10px 14px;
  border: 1px solid #ddd;
  border-radius: 10px;
  font-size: 15px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group textarea:focus {
  border-color: #999;
}

.form-row {
  display: flex;
  gap: 16px;
  align-items: flex-end;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  cursor: pointer;
}

.submit-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 32px;
  border: none;
  border-radius: 12px;
  background: #1a1a2e;
  color: #fff;
  font-size: 16px;
  cursor: pointer;
  align-self: flex-start;
  transition: background 0.2s;
}

.submit-btn:hover {
  background: #2d2d4e;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  width: 16px;
  height: 16px;
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
}

.progress-bar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background: #fafafa;
  border-radius: 10px;
  border: 1px solid #eee;
  margin-bottom: 20px;
}

.progress-step {
  font-size: 14px;
  color: #bbb;
  padding: 6px 10px;
  border-radius: 6px;
  transition: all 0.3s;
}

.progress-step.active {
  color: #1a1a2e;
  font-weight: 600;
  background: #e0f2fe;
}

.recommendations {
  margin-bottom: 24px;
}

.recommendations h2 {
  font-size: 16px;
  margin-bottom: 10px;
  margin-top: 20px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  padding: 6px 14px;
  background: #f0f0f0;
  border-radius: 6px;
  font-size: 14px;
  color: #555;
  text-decoration: none;
  cursor: default;
}

.tag.recommended {
  background: #e6f4ea;
  color: #1e7e34;
  font-weight: 600;
}

.tag.clickable {
  cursor: pointer;
  transition: background 0.15s;
}

.tag.clickable:hover {
  text-decoration: underline;
}

.tag.recommended.clickable:hover {
  background: #d1fae5;
}

.tag.classification {
  background: #fef3c7;
  color: #92400e;
}

.hierarchy {
  font-size: 11px;
  color: #a78bfa;
  margin-left: 4px;
}

.enrich-errors {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
  margin-bottom: 12px;
}

.enrich-error {
  font-size: 12px;
  color: #b45309;
  background: #fef3c7;
  padding: 3px 8px;
  border-radius: 4px;
}
</style>
