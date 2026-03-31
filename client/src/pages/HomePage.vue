<template>
  <div class="home-page">
    <a class="sandbox-badge" href="https://staff.loc.gov/wikis/display/DIGS/Digital+Strategy+Directorate+and+Artificial+Intelligence" target="_blank" rel="noopener"><img :src="sparkleUrl" class="sparkle-icon" /> A Staff AI Sandbox Experiment</a>
    <LogoScene />
    <div class="resource-status"><span class="status-dot"></span>Searching 20.3 Million Embeddings (data cutoff: mid-2025)</div>
    <SearchBox @search="onSearch" />
    <div class="home-nav-corner">
      <router-link to="/classify" class="nav-link">Classification Tool</router-link>
      <span class="nav-sep">|</span>
      <router-link to="/similar" class="nav-link">Find Similar by LCCN</router-link>
    </div>

    <hr class="home-divider" />
    <section class="intro-section">
      <div class="intro-video">
        <video controls preload="metadata">
          <source src="https://thisismattmiller.s3.us-east-1.amazonaws.com/yoshino.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <a href="https://thisismattmiller.s3.us-east-1.amazonaws.com/yoshino.mp4" target="_blank" rel="noopener" class="video-link">Open video in new tab</a>
      </div>
      <div class="intro-text">
        <h2>What is this?</h2>
        <p>
          This is an experimental semantic search interface over <strong>20.3 million</strong>
          Library of Congress bibliographic records, powered by vector embeddings and AI.
        </p>

        <h3>How it works</h3>
        <p>Type a natural language query, for example:</p>
        <ul class="examples">
          <li>"The history of the Library of Congress"</li>
          <li>"The development and history of cell phones in south america"</li>
          <li>"The history of small villages on the border between France and Germany"</li>
        </ul>
        <ul>
          <li>An LLM expands your query into a high quality bibliographic record, it then looks through all 20 million records for the best match to the created expanded record</li>
          <li>Vector similarity finds the most relevant records across the entire collection</li>
          <li>An LLM reranks the results based on the original query</li>
          <li>Filter by LCC class, material type, or literary form (if filtering by book material type)</li>
        </ul>

        <h3>Tools</h3>
        <p>The vector database is a tool that can be used in many ways, a few examples here:</p>
        <ul>
          <li><strong>Search</strong> — Semantic search across the full catalog</li>
          <li><strong>Classification Tool</strong> — Suggest LCSH subject headings for a new work</li>
          <li><strong>Find Similar</strong> — Enter an LCCN to find related records ("show more like this..." features)</li>
        </ul>

        <h3>Tech Details</h3>
        <ul>
          <li>An experiment using data from mid 2025, newer things will not be in the DB, it is not being updated</li>
          <li>The LC bibliographic data is being enriched before building the vector representation of it, this happens via <a href="https://id.loc.gov" target="_blank" rel="noopener">id.loc.gov</a>, Wikidata, and metadata from the web matching on standard identifiers to enrich the bib record</li>
          <li>The embeddings are made using AWS's Titan-text-embeddings-v2 model</li>
          <li>The vector embeddings are stored in an AWS S3 Vector Bucket</li>
          <li>The expansion, reranking and other tasks like translation are done by Anthropic Haiku 4.5 model</li>
        </ul>
      </div>
    </section>
  </div>
</template>

<script>
import LogoScene from '../components/LogoScene.vue'
import SearchBox from '../components/SearchBox.vue'
import { asset } from '../assets.js'

export default {
  name: 'HomePage',

  components: { LogoScene, SearchBox },

  data() {
    return {
      sparkleUrl: asset('/sparkle.svg'),
    }
  },

  methods: {
    onSearch({ query, raw, filter, top_k }) {
      const routeQuery = { q: query, raw: raw ? '1' : '0' }
      if (filter) routeQuery.filter = JSON.stringify(filter)
      if (top_k) routeQuery.top_k = top_k
      this.$router.push({ path: '/results', query: routeQuery })
    },
  },
}
</script>

<style scoped>
.home-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  min-height: 100vh;
  padding-top: 40px;
  position: relative;
}

.sandbox-badge {
  position: absolute;
  top: 14px;
  left: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  text-decoration: none;
  background: #e0f2fe;
  color: #0369a1;
  padding: 5px 10px;
  border-radius: 6px;
  border: 1px solid #bae6fd;
  transition: background 0.2s;
}

.sandbox-badge:hover {
  background: #bae6fd;
}

.sparkle-icon {
  width: 16px;
  height: 16px;
}

.resource-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #888;
  margin-top: 12px;
  margin-bottom: 4px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
  flex-shrink: 0;
}

.home-nav-corner {
  position: absolute;
  top: 14px;
  right: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-link {
  font-size: 14px;
  color: #888;
  border-bottom: 1px solid transparent;
  transition: color 0.2s, border-color 0.2s;
}

.nav-link:hover {
  color: #1a1a2e;
  border-bottom-color: #1a1a2e;
}

.nav-sep {
  color: #ddd;
  margin: 0 4px;
}

.home-divider {
  width: 200px;
  border: none;
  border-top: 1px solid #e0e0e0;
  margin-top: 36px;
}

.intro-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  width: 100%;
  max-width: 960px;
  margin-top: 48px;
  padding: 0 24px 48px;
}

.intro-video video {
  width: 100%;
  border-radius: 12px;
  background: #f0f0f0;
  aspect-ratio: 16 / 9;
  border: 1px solid #888;
}

.video-link {
  display: inline-block;
  margin-top: 8px;
  font-size: 13px;
  color: #0369a1;
  text-decoration: none;
}

.video-link:hover {
  text-decoration: underline;
}

.intro-text h2 {
  font-size: 22px;
  color: #1a1a2e;
  margin-bottom: 10px;
}

.intro-text h3 {
  font-size: 16px;
  color: #1a1a2e;
  margin-top: 20px;
  margin-bottom: 8px;
}

.intro-text p {
  font-size: 15px;
  color: #555;
  line-height: 1.7;
  margin-bottom: 6px;
}

.intro-text a {
  color: #0369a1;
  text-decoration: underline;
}

.intro-text ul {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.intro-text li {
  font-size: 14px;
  color: #555;
  line-height: 1.6;
  padding-left: 16px;
  position: relative;
}

.intro-text ul.examples {
  margin-left: 20px;
  margin-bottom: 10px;
}

.intro-text ul.examples li {
  font-style: italic;
  color: #666;
}

.intro-text ul.examples li::before {
  background: #0369a1;
}

.intro-text li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 9px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #c4788a;
}
</style>
