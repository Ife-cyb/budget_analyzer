import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from './store/auth'

const Dashboard = () => import('./views/Dashboard.vue')
const AddExpense = () => import('./views/AddExpense.vue')
const Reports = () => import('./views/Reports.vue')
const Categories = () => import('./views/Categories.vue')
const Login = () => import('./views/auth/Login.vue')
const Register = () => import('./views/auth/Register.vue')
const Logout = () => import('./views/auth/Logout.vue')

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'Dashboard', component: Dashboard, meta: { requiresAuth: true } },
    { path: '/add', name: 'AddExpense', component: AddExpense, meta: { requiresAuth: true } },
    { path: '/add/:id', name: 'EditExpense', component: AddExpense, meta: { requiresAuth: true } },
    { path: '/reports', name: 'Reports', component: Reports, meta: { requiresAuth: true } },
    { path: '/categories', name: 'Categories', component: Categories, meta: { requiresAuth: true } },
    { path: '/login', name: 'Login', component: Login, meta: { guestOnly: true } },
    { path: '/register', name: 'Register', component: Register, meta: { guestOnly: true } },
    { path: '/logout', name: 'Logout', component: Logout, meta: { requiresAuth: true } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  if (!authStore.initialized) {
    await authStore.initialize()
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return {
      name: 'Login',
      query: { redirect: to.fullPath },
    }
  }

  if (to.meta.guestOnly && authStore.isAuthenticated) {
    return { name: 'Dashboard' }
  }
})

export default router
