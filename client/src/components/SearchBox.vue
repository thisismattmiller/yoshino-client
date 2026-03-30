<template>
  <div class="search-wrap">
    <textarea
      ref="input"
      v-model="query"
      class="search-input"
      rows="3"
      placeholder="Search the Library of Congress..."
      @keydown.enter.exact.prevent="onSearch"
    ></textarea>

    <select v-model="lccFilter" class="filter-select">
      <option value="">Filter by LCC Top Level</option>
      <option v-for="c in lccClasses" :key="c.code" :value="c.code">
        {{ c.code }} – {{ c.label }}
      </option>
    </select>

    <select v-model="typeFilter" class="filter-select">
      <option value="">Filter by Material Type</option>
      <option v-for="t in materialTypes" :key="t.code" :value="t.code">
        {{ t.label }}
      </option>
    </select>

    <select v-if="typeFilter === 'BK'" v-model="litFilter" class="filter-select">
      <option value="">Filter by Literary Form</option>
      <option v-for="l in litForms" :key="l.code" :value="l.code">
        {{ l.code }} – {{ l.label }}
      </option>
    </select>

    <div class="search-actions">
      <select v-model.number="topK" class="topk-select">
        <option :value="20">20 results</option>
        <option :value="30">30 results</option>
        <option :value="40">40 results</option>
        <option :value="50">50 results</option>
      </select>
      <button class="search-btn" @click="onSearch" :disabled="!query.trim() || searching">
        <span v-if="searching" class="spinner"></span>
        {{ searching ? 'Searching...' : 'Search' }}
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SearchBox',

  props: {
    initialQuery: { type: String, default: '' },
    initialRaw: { type: Boolean, default: false },
    searching: { type: Boolean, default: false },
  },

  data() {
    return {
      query: this.initialQuery,
      raw: this.initialRaw,
      topK: 20,
      lccFilter: '',
      typeFilter: '',
      litFilter: '',
      lccClasses: [
        { code: 'A', label: 'General Works' },
        { code: 'B', label: 'Philosophy, Psychology, Religion' },
        { code: 'C', label: 'Auxiliary Sciences of History (General)' },
        { code: 'D', label: 'World History (except American History)' },
        { code: 'E', label: 'American History' },
        { code: 'F', label: 'Local History of the United States and British, Dutch, French, and Latin America' },
        { code: 'G', label: 'Geography, Anthropology, Recreation' },
        { code: 'H', label: 'Social Sciences' },
        { code: 'J', label: 'Political Science' },
        { code: 'K', label: 'Law' },
        { code: 'L', label: 'Education' },
        { code: 'M', label: 'Music' },
        { code: 'N', label: 'Fine Arts' },
        { code: 'P', label: 'Language and Literature' },
        { code: 'Q', label: 'Science' },
        { code: 'R', label: 'Medicine' },
        { code: 'S', label: 'Agriculture' },
        { code: 'T', label: 'Technology' },
        { code: 'U', label: 'Military Science' },
        { code: 'V', label: 'Naval Science' },
        { code: 'Z', label: 'Bibliography, Library Science' },
      ],
      materialTypes: [
        { code: 'BK', label: 'Book' },
        { code: 'CF', label: 'Computer File' },
        { code: 'CR', label: 'Electronic Resource' },
        { code: 'MP', label: 'Map' },
        { code: 'MU', label: 'Musical Score' },
        { code: 'MX', label: 'Mixed Material' },
        { code: 'SE', label: 'Serial' },
        { code: 'VM', label: 'Visual Material' },
      ],
      litForms: [
        { code: '0', label: 'Not fiction' },
        { code: '1', label: 'Fiction' },
        { code: 'd', label: 'Dramas' },
        { code: 'e', label: 'Essays' },
        { code: 'f', label: 'Novels' },
        { code: 'h', label: 'Humor, satires, etc.' },
        { code: 'i', label: 'Letters' },
        { code: 'j', label: 'Short stories' },
        { code: 'm', label: 'Mixed forms' },
        { code: 'p', label: 'Poetry' },
        { code: 's', label: 'Speeches' },
        { code: 'u', label: 'Unknown' },
      ],
    }
  },

  watch: {
    typeFilter(val) {
      if (val !== 'BK') this.litFilter = ''
    },
  },

  mounted() {
    this.$refs.input.focus()
  },

  methods: {
    onSearch() {
      const q = this.query.trim()
      if (!q) return

      const conditions = []
      if (this.lccFilter) conditions.push({ L1: this.lccFilter })
      if (this.typeFilter) conditions.push({ MT: this.typeFilter })
      if (this.typeFilter === 'BK' && this.litFilter) conditions.push({ LF: this.litFilter })

      let filter = null
      if (conditions.length === 1) filter = conditions[0]
      else if (conditions.length > 1) filter = { $and: conditions }

      this.$emit('search', {
        query: q,
        raw: this.raw,
        filter,
        top_k: this.topK,
      })
    },
  },
}
</script>

<style scoped>
.search-wrap {
  margin-top: 24px;
  width: 540px;
  max-width: 90vw;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.search-input {
  width: 100%;
  padding: 14px 20px;
  font-size: 16px;
  font-family: system-ui, -apple-system, sans-serif;
  border: 1px solid #ddd;
  border-radius: 18px;
  outline: none;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.08);
  transition: box-shadow 0.2s, border-color 0.2s;
  resize: none;
  line-height: 1.5;
}

.search-input:focus {
  border-color: #bbb;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
}

.search-input::placeholder {
  color: #aaa;
}

.filter-select {
  width: 100%;
  padding: 10px 14px;
  font-size: 14px;
  font-family: system-ui, -apple-system, sans-serif;
  border: 1px solid #ddd;
  border-radius: 12px;
  outline: none;
  background: #fff;
  color: #333;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
}

.filter-select:focus {
  border-color: #bbb;
}

.search-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
}

.topk-select {
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid #ddd;
  border-radius: 12px;
  background: #fff;
  cursor: pointer;
  outline: none;
}

.search-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 28px;
  border: none;
  border-radius: 12px;
  background: #1a1a2e;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
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
</style>
