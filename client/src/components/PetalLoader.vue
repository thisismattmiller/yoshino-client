<template>
  <div class="petal-loader">
    <div class="petal-field">
      <div v-for="n in 12" :key="n" class="petal" :style="petalStyle(n)"></div>
    </div>
    <p class="loader-text">Searching the Library of Congress...</p>
  </div>
</template>

<script>
export default {
  name: 'PetalLoader',
  methods: {
    petalStyle(n) {
      const delay = (n * 0.3).toFixed(1)
      const left = 10 + (n * 7) % 80
      const size = 8 + (n % 4) * 4
      const duration = 2.5 + (n % 3) * 0.8
      return {
        left: left + '%',
        width: size + 'px',
        height: size + 'px',
        animationDelay: delay + 's',
        animationDuration: duration + 's',
      }
    },
  },
}
</script>

<style scoped>
.petal-loader {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 0;
}

.petal-field {
  position: relative;
  width: 300px;
  height: 120px;
  overflow: hidden;
}

.petal {
  position: absolute;
  top: -20px;
  border-radius: 50% 0 50% 0;
  background: radial-gradient(ellipse at 30% 30%, #ffc8d6, #ffb7c5);
  opacity: 0;
  animation: petalFall linear infinite;
}

@keyframes petalFall {
  0% {
    opacity: 0;
    transform: translateY(-10px) rotate(0deg) translateX(0px);
  }
  10% {
    opacity: 0.7;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 0;
    transform: translateY(130px) rotate(360deg) translateX(40px);
  }
}

.loader-text {
  margin-top: 16px;
  font-size: 16px;
  color: #999;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}
</style>
