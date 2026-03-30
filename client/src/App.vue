<template>
  <div id="yoshino-app">
    <router-view />
  </div>
</template>

<script>
export default {
  name: 'App',
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  background: #ffffff;
  color: #1a1a2e;
}

a {
  color: inherit;
  text-decoration: none;
}
</style>
