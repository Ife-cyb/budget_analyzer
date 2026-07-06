<script setup>
import { computed } from 'vue'
import { useTransactionsStore } from '../store/transactions'
import { Pie, Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
} from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, ArcElement, BarElement, CategoryScale, LinearScale)

const props = defineProps({
  type: { type: String, default: 'pie' },
})

const store = useTransactionsStore()

const pieData = computed(() => {
  const byCat = store.spendByCategory
  const labels = Object.keys(byCat)
  const values = Object.values(byCat)
  const colors = labels.map((_, i) => `hsl(${(i * 60) % 360} 70% 55%)`)
  return {
    labels,
    datasets: [
      {
        label: 'Category Breakdown',
        data: values,
        backgroundColor: colors,
      },
    ],
  }
})

const barData = computed(() => {
  const series = store.monthlyTypeSeries
  return {
    labels: series.map((s) => s.month),
    datasets: [
      {
        label: 'Expenses',
        data: series.map((s) => s.expense),
        backgroundColor: '#2563eb',
      },
      {
        label: 'Income',
        data: series.map((s) => s.income),
        backgroundColor: '#16a34a',
      },
    ],
  }
})

const options = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom' },
    tooltip: {
      callbacks: {
        label(ctx) {
          const val = ctx.parsed.y ?? ctx.parsed
          return store.formatCurrency(val)
        },
      },
    },
  },
  scales: props.type === 'bar' ? {
    y: {
      ticks: {
        callback: (v) => store.formatCurrency(v),
      },
    },
  } : {},
}))
</script>

<template>
  <div class="grid grid-cols-1 gap-4">
    <div class="bg-white rounded-lg shadow p-4 h-72">
      <component :is="type === 'pie' ? Pie : Bar" :data="type === 'pie' ? pieData : barData" :options="options" />
    </div>
  </div>
</template> 