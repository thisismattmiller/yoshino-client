<template>
  <div class="filter-panel">
    <div class="filter-group">
      <label class="filter-label">LCC Class (L1)</label>
      <select v-model="l1" @change="onFilterChange" class="filter-select">
        <option value="">All</option>
        <option v-for="c in lccClasses" :key="c.code" :value="c.code">
          {{ c.code }} - {{ c.label }}
        </option>
      </select>
    </div>
    <div class="filter-group">
      <label class="filter-label">Top K results</label>
      <select v-model.number="topK" @change="onFilterChange" class="filter-select">
        <option :value="5">5</option>
        <option :value="10">10</option>
        <option :value="20">20</option>
        <option :value="50">50</option>
      </select>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FilterPanel',

  props: {
    initialTopK: { type: Number, default: 20 },
  },

  data() {
    return {
      l1: '',
      topK: this.initialTopK,
      lccClasses: [
        { code: 'A', label: 'General Works' },
        { code: 'B', label: 'Philosophy, Religion' },
        { code: 'C', label: 'Auxiliary Sciences of History' },
        { code: 'D', label: 'World History' },
        { code: 'E', label: 'History of the Americas' },
        { code: 'F', label: 'History of the Americas (Local)' },
        { code: 'G', label: 'Geography, Anthropology' },
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
    }
  },

  methods: {
    onFilterChange() {
      const filter = this.l1 ? { L1: this.l1 } : null
      this.$emit('change', { filter, top_k: this.topK })
    },
  },
}
</script>

<style scoped>
.filter-panel {
  display: flex;
  gap: 16px;
  padding: 12px 16px;
  background: #fafafa;
  border-radius: 12px;
  border: 1px solid #eee;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-label {
  font-size: 12px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.filter-select {
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  background: #fff;
  cursor: pointer;
  outline: none;
}
</style>
