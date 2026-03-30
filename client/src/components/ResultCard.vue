<template>
  <div class="result-card">
    <div class="card-top">
      <div class="cover-area">
        <img v-if="coverUrl" :src="coverUrl" alt="Cover" class="cover-img" />
        <div v-else class="cover-placeholder">
          <img v-if="meta.MT" :src="asset('/' + meta.MT + '.svg')" :alt="meta.MT" class="mt-icon" />
        </div>
      </div>
      <div class="card-info">
        <div class="card-header">
          <h3 class="title">{{ meta.Title || 'Untitled' }}</h3>
          <span class="score">{{ (result.score * 100).toFixed(1) }}%</span>
        </div>
        <p v-if="meta.TitleEN" class="translated-text">
          <span class="mt-badge">machine translation</span> {{ meta.TitleEN }}
        </p>
        <p v-if="meta.Creator" class="creator">
          <span
            v-if="bioFields.length"
            class="creator-link"
            @click.stop="bioExpanded = !bioExpanded"
          >{{ meta.Creator }} <span class="bio-indicator">▸ bio</span></span>
          <span v-else>{{ meta.Creator }}</span>
        </p>
        <div v-if="bioExpanded && bioFields.length" class="bio-details">
          <div v-for="f in bioFields" :key="f.key" class="bio-row">
            <span class="bio-key">{{ f.label }}:</span>
            <span class="bio-value">{{ f.value }}</span>
          </div>
        </div>
        <div class="meta-row">
          <span v-if="meta.LCC" class="meta-tag">{{ meta.LCC }}</span>
          <span v-if="meta.LCCCode" class="meta-tag mono">{{ meta.LCCCode }}</span>
          <span v-if="meta.MT" class="meta-tag">{{ materialLabel }}</span>
          <span v-if="meta.Genre" class="meta-tag">{{ meta.Genre }}</span>
        </div>
        <p v-if="meta.LCCN" class="lccn">
          LCCN:
          <a :href="'https://lccn.loc.gov/' + meta.LCCN" target="_blank" rel="noopener" class="lccn-link">
            {{ meta.LCCN }}
          </a>
        </p>
      </div>
    </div>

    <p v-if="meta.Summary" class="summary">{{ meta.Summary }}</p>
    <p v-if="meta.SummaryEN && meta.SummaryEN.toLowerCase() !== 'not available'" class="summary translated-summary">
      <span class="mt-badge">machine translation</span> {{ meta.SummaryEN }}
    </p>

    <div v-if="meta.Subjects && meta.Subjects.length" class="subjects">
      <span class="subjects-label">Subjects:</span>
      <a
        v-for="s in visibleSubjects"
        :key="s"
        :href="s.includes('--') ? subjectSearchUrl(s) : undefined"
        :target="s.includes('--') ? '_blank' : undefined"
        rel="noopener"
        class="subject-tag"
        :class="{ clickable: s.includes('--') }"
        @click.stop
      >{{ s }}</a>
      <button
        v-if="meta.Subjects.length > 5 && !subjectsExpanded"
        class="expand-btn"
        @click.stop="subjectsExpanded = true"
      >+{{ meta.Subjects.length - 5 }} more</button>
      <button
        v-if="subjectsExpanded"
        class="expand-btn"
        @click.stop="subjectsExpanded = false"
      >Show less</button>
    </div>

    <div class="card-footer">
      <div class="footer-left">
        <span class="record-id">001: {{ meta['001'] || result.lc_001 }}</span>
        <span v-if="meta.ISBNS && meta.ISBNS.length" class="isbns">ISBN: {{ meta.ISBNS.join(', ') }}</span>
      </div>
      <button
        class="similar-btn"
        @click.stop="toggleSimilar"
        :disabled="similarLoading"
      >
        <span v-if="similarLoading" class="similar-spinner"></span>
        {{ showSimilar ? 'Hide Similar' : 'Show Similar' }}
      </button>
    </div>

    <div v-if="showSimilar && similarResults.length" class="similar-panel">
      <div v-for="item in similarResults" :key="item.key || item.lc_001" class="similar-item">
        <img
          v-if="similarCovers[item.metadata && item.metadata['001'] || item.key]"
          :src="similarCovers[item.metadata && item.metadata['001'] || item.key]"
          class="similar-cover"
        />
        <div v-else class="similar-cover-placeholder">
          <img v-if="item.metadata && item.metadata.MT" :src="asset('/' + item.metadata.MT + '.svg')" class="similar-mt-icon" />
        </div>
        <div class="similar-info">
          <p class="similar-title">{{ item.metadata && item.metadata.Title || 'Untitled' }}</p>
          <p v-if="item.metadata && item.metadata.Creator" class="similar-creator">{{ item.metadata.Creator }}</p>
          <a
            v-if="item.metadata && item.metadata.LCCN"
            :href="'https://lccn.loc.gov/' + item.metadata.LCCN"
            target="_blank"
            rel="noopener"
            class="similar-lccn"
            @click.stop
          >LCCN: {{ item.metadata.LCCN }}</a>
          <span class="similar-score">{{ (item.score * 100).toFixed(1) }}%</span>
        </div>
      </div>
    </div>
    <div v-if="showSimilar && !similarLoading && !similarResults.length" class="similar-empty">
      No similar records found.
    </div>
  </div>
</template>

<script>
import { apiCall } from '../api.js'
import { asset } from '../assets.js'

const MT_LABELS = {
  BK: 'Book',
  SE: 'Serial',
  MU: 'Musical Score',
  MP: 'Map',
  VM: 'Visual Material',
  MX: 'Mixed Material',
}

export default {
  name: 'ResultCard',

  props: {
    result: { type: Object, required: true },
    coverUrl: { type: String, default: null },
  },

  data() {
    return {
      subjectsExpanded: false,
      bioExpanded: false,
      showSimilar: false,
      similarLoading: false,
      similarResults: [],
      similarCovers: {},
    }
  },

  computed: {
    meta() {
      return this.result.metadata || {}
    },
    materialLabel() {
      return MT_LABELS[this.meta.MT] || this.meta.MT
    },
    bioFields() {
      const fields = []
      for (const [key, value] of Object.entries(this.meta)) {
        if (key.startsWith('Bio')) {
          fields.push({ key, label: key.replace('Bio', '').replace(/_/g, ' '), value })
        }
      }
      return fields
    },
    visibleSubjects() {
      if (!this.meta.Subjects) return []
      return this.subjectsExpanded
        ? this.meta.Subjects
        : this.meta.Subjects.slice(0, 5)
    },
  },

  methods: {
    asset,
    subjectSearchUrl(subject) {
      const normalized = subject.replace(/\s*--\s*/g, '--')
      const encoded = encodeURIComponent(`subjects.value==/string "${normalized}"`)
      return `https://search.catalog.loc.gov/search?option=query&pageNumber=1&query=${encoded}&recordsPerPage=25`
    },

    async toggleSimilar() {
      if (this.showSimilar) {
        this.showSimilar = false
        return
      }

      if (this.similarResults.length) {
        this.showSimilar = true
        return
      }

      this.similarLoading = true
      try {
        const recordId = this.meta['001'] || this.result.lc_001
        const data = await apiCall('find_similar', { record_id: recordId, top_k: 10 })
        this.similarResults = data.results || []
        this.showSimilar = true
        this.fetchSimilarCovers()
      } catch (err) {
        console.error('find_similar error:', err)
      } finally {
        this.similarLoading = false
      }
    },

    async fetchSimilarCovers() {
      const isbnMap = {}
      for (const r of this.similarResults) {
        const id = (r.metadata && r.metadata['001']) || r.key
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
        this.similarCovers = newCovers
      } catch {
        // ignore
      }
    },
  },
}
</script>

<style scoped>
.result-card {
  width: 100%;
  padding: 20px;
  border: 1px solid #eee;
  border-radius: 12px;
  transition: box-shadow 0.2s, border-color 0.2s;
}

.result-card:hover {
  border-color: #ccc;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.card-top {
  display: flex;
  gap: 16px;
}

.cover-area {
  flex-shrink: 0;
}

.cover-img {
  width: 120px;
  height: 170px;
  object-fit: cover;
  border-radius: 6px;
}

.cover-placeholder {
  width: 120px;
  height: 170px;
  background: #f0f0f0;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mt-icon {
  width: 48px;
  height: 48px;
  opacity: 0.4;
}

.card-info {
  flex: 1;
  min-width: 0;
}

.translated-text {
  font-size: 15px;
  color: #666;
  font-style: italic;
  margin-top: 2px;
}

.translated-summary {
  margin-top: 6px;
  font-style: italic;
}

.mt-badge {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #9333ea;
  background: #f3e8ff;
  padding: 2px 6px;
  border-radius: 4px;
  font-style: normal;
  margin-right: 4px;
  vertical-align: middle;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.title {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.3;
}

.score {
  flex-shrink: 0;
  font-size: 16px;
  font-weight: 700;
  color: #2d6a4f;
  background: #e6f4ea;
  padding: 4px 10px;
  border-radius: 6px;
}

.creator {
  font-size: 17px;
  color: #555;
  margin-top: 6px;
}

.creator-link {
  cursor: pointer;
  color: #0369a1;
}

.creator-link:hover {
  text-decoration: underline;
}

.bio-indicator {
  font-size: 12px;
  color: #888;
  margin-left: 4px;
}

.bio-details {
  margin-top: 6px;
  margin-left: 16px;
  padding: 8px 12px;
  background: #f9f9f9;
  border-left: 3px solid #ddd;
  border-radius: 0 6px 6px 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bio-row {
  font-size: 14px;
  color: #555;
}

.bio-key {
  font-weight: 600;
  color: #777;
  margin-right: 6px;
  text-transform: capitalize;
}

.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.meta-tag {
  font-size: 14px;
  padding: 4px 10px;
  background: #f5f5f5;
  border-radius: 5px;
  color: #555;
}

.meta-tag.mono {
  font-family: monospace;
}

.lccn {
  font-size: 15px;
  color: #666;
  margin-top: 8px;
}

.lccn-link {
  color: #0369a1;
  text-decoration: underline;
}

.lccn-link:hover {
  color: #0c4a6e;
}

.summary {
  font-size: 15px;
  color: #555;
  line-height: 1.6;
  margin-top: 14px;
  max-height: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
}

.subjects {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  align-items: center;
  margin-top: 10px;
}

.subjects-label {
  font-size: 14px;
  font-weight: 600;
  color: #888;
  margin-right: 4px;
}

.subject-tag {
  font-size: 13px;
  padding: 4px 10px;
  background: #eef2ff;
  color: #3730a3;
  border-radius: 4px;
  text-decoration: none;
  cursor: default;
}

.subject-tag.clickable {
  cursor: pointer;
  transition: background 0.15s;
}

.subject-tag.clickable:hover {
  background: #dbeafe;
  text-decoration: underline;
}

.expand-btn {
  font-size: 13px;
  padding: 4px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  color: #666;
  cursor: pointer;
}

.expand-btn:hover {
  background: #f5f5f5;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
}

.footer-left {
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: #aaa;
  font-family: monospace;
}

.similar-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #fff;
  font-size: 13px;
  color: #555;
  cursor: pointer;
  transition: background 0.2s;
}

.similar-btn:hover {
  background: #f0f0f0;
}

.similar-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.similar-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid #ddd;
  border-top-color: #555;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.similar-panel {
  margin-top: 12px;
  padding: 14px;
  background: #fafafa;
  border: 1px solid #eee;
  border-radius: 10px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.similar-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 8px;
  border-radius: 8px;
  transition: background 0.15s;
}

.similar-item:hover {
  background: #f0f0f0;
}

.similar-cover {
  width: 50px;
  height: 70px;
  object-fit: cover;
  border-radius: 4px;
  flex-shrink: 0;
}

.similar-cover-placeholder {
  width: 50px;
  height: 70px;
  background: #e8e8e8;
  border-radius: 4px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.similar-mt-icon {
  width: 24px;
  height: 24px;
  opacity: 0.35;
}

.similar-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.similar-title {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.3;
}

.similar-creator {
  font-size: 13px;
  color: #666;
}

.similar-lccn {
  font-size: 12px;
  color: #0369a1;
  text-decoration: underline;
}

.similar-lccn:hover {
  color: #0c4a6e;
}

.similar-score {
  font-size: 12px;
  font-weight: 600;
  color: #2d6a4f;
}

.similar-empty {
  margin-top: 12px;
  padding: 16px;
  text-align: center;
  color: #999;
  font-size: 14px;
  background: #fafafa;
  border-radius: 10px;
}
</style>
