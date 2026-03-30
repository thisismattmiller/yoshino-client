import { createRouter, createWebHistory } from 'vue-router'
import HomePage from './pages/HomePage.vue'
import ResultsPage from './pages/ResultsPage.vue'
import RecordPage from './pages/RecordPage.vue'
import ClassifyPage from './pages/ClassifyPage.vue'
import SimilarPage from './pages/SimilarPage.vue'

const routes = [
  { path: '/', component: HomePage },
  { path: '/results', component: ResultsPage },
  { path: '/record/:id', component: RecordPage },
  { path: '/classify', component: ClassifyPage },
  { path: '/similar', component: SimilarPage },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
