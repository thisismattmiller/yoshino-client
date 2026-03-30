<template>
  <div class="result-list">
    <div v-if="expandedQuery" class="expanded-query">
      <span class="label">Expanded query:</span> {{ expandedQuery }}
    </div>
    <div v-if="!results.length" class="no-results">
      No results found.
    </div>
    <ResultCard
      v-for="item in results"
      :key="item.lc_001 || item.key"
      :result="item"
      :coverUrl="covers[(item.metadata && item.metadata['001']) || item.lc_001 || item.key] || null"
      @select="$emit('select', $event)"
    />
  </div>
</template>

<script>
import ResultCard from './ResultCard.vue'

export default {
  name: 'ResultList',
  components: { ResultCard },

  props: {
    results: { type: Array, default: () => [] },
    expandedQuery: { type: String, default: '' },
    covers: { type: Object, default: () => ({}) },
  },
}
</script>

<style scoped>
.result-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.expanded-query {
  font-size: 13px;
  color: #666;
  padding: 8px 12px;
  background: #fafafa;
  border-radius: 8px;
  margin-bottom: 4px;
}

.expanded-query .label {
  font-weight: 600;
  color: #888;
}

.no-results {
  text-align: center;
  color: #999;
  padding: 40px 0;
}
</style>
