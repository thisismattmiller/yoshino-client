<template>
  <div class="book-cover">
    <img v-if="url" :src="url" alt="Book cover" @error="onError" />
    <div v-else class="placeholder">
      <span>No Cover</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'BookCover',

  props: {
    url: { type: String, default: null },
  },

  data() {
    return {
      failed: false,
    }
  },

  methods: {
    onError() {
      this.failed = true
    },
  },
}
</script>

<style scoped>
.book-cover {
  width: 60px;
  height: 80px;
  flex-shrink: 0;
  border-radius: 4px;
  overflow: hidden;
  background: #f5f5f5;
}

.book-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder span {
  font-size: 10px;
  color: #ccc;
}
</style>
