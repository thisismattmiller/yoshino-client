<template>
  <div class="rating-widget">
    <span class="rating-label">Rate:</span>
    <div class="thumbs">
      <button
        class="thumb-btn double"
        :class="{ active: selected === 1 }"
        title="Excellent"
        @click="onRate(1)"
      >
        <span class="overlap"><img :src="thumbsUrl" class="thumb-icon up" /><img :src="thumbsUrl" class="thumb-icon up second" /></span>
      </button>
      <button
        class="thumb-btn"
        :class="{ active: selected === 2 }"
        title="Good"
        @click="onRate(2)"
      >
        <img :src="thumbsUrl" class="thumb-icon up" />
      </button>
      <button
        class="thumb-btn"
        :class="{ active: selected === 3 }"
        title="Poor"
        @click="onRate(3)"
      >
        <img :src="thumbsUrl" class="thumb-icon down" />
      </button>
      <button
        class="thumb-btn double"
        :class="{ active: selected === 4 }"
        title="Very poor"
        @click="onRate(4)"
      >
        <span class="overlap"><img :src="thumbsUrl" class="thumb-icon down" /><img :src="thumbsUrl" class="thumb-icon down second" /></span>
      </button>
    </div>
    <span v-if="submitted" class="rating-thanks">Saved!</span>
  </div>
</template>

<script>
import { asset } from '../assets.js'

export default {
  name: 'RatingWidget',

  data() {
    return {
      selected: null,
      submitted: false,
      thumbsUrl: asset('/thumbs.svg'),
    }
  },

  methods: {
    onRate(val) {
      this.selected = val
      this.submitted = true
      this.$emit('rate', val)
    },
  },
}
</script>

<style scoped>
.rating-widget {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rating-label {
  font-size: 14px;
  color: #888;
}

.thumbs {
  display: flex;
  gap: 4px;
}

.thumb-btn {
  display: flex;
  align-items: center;
  gap: 1px;
  background: #f0f0f0;
  border: 2px solid transparent;
  border-radius: 6px;
  padding: 4px 8px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.thumb-btn:hover {
  background: #e4e4e4;
}

.thumb-btn.active {
  border-color: #1a1a2e;
  background: #e0e0ee;
}

.thumb-icon {
  width: 18px;
  height: 18px;
}

.thumb-icon.up {
  transform: none;
}

.thumb-icon.down {
  transform: scaleY(-1);
}

.overlap {
  display: flex;
  align-items: center;
}

.overlap .second {
  margin-left: -10px;
}

.rating-thanks {
  font-size: 13px;
  color: #2d6a4f;
  font-weight: 600;
}
</style>
