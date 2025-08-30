import { createRouter, createWebHistory } from 'vue-router'

const Dashboard = () => import('./views/Dashboard.vue')
const AddExpense = () => import('./views/AddExpense.vue')
const Reports = () => import('./views/Reports.vue')

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'Dashboard', component: Dashboard },
    { path: '/add', name: 'AddExpense', component: AddExpense },
    { path: '/add/:id', name: 'EditExpense', component: AddExpense },
    { path: '/reports', name: 'Reports', component: Reports },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router 