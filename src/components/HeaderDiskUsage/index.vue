<template>
  <el-progress v-if="diskUsage !== undefined" class="diskUsage" type="circle" :percentage="diskUsage" :color="colors" title="硬碟使用率" />
</template>
<script>
export default {
  name: 'HeaderDiskUsage',
  data() {
    return {
      diskUsage: undefined,
      colors: [
        { color: '#5cb87a', percentage: 60 },
        { color: '#1989fa', percentage: 80 },
        { color: '#e6a23c', percentage: 90 },
        { color: '#f56c6c', percentage: 100 }
      ]
    }
  },
  watch: {
    '$route': 'fetchDiskUsage'
  },
  created() {
    this.fetchDiskUsage()
  },
  methods: {
    fetchDiskUsage() {
      this.$request(this.$serverRoute.DISK_USAGE.route).then(data => {
        if (data) {
          this.diskUsage = parseFloat(data)
        }
      })
    }
  }
}
</script>
<style lang="scss">
.diskUsage {
  user-select: none;
  aspect-ratio: 1/1;
  height: 100%;

  > div.el-progress-circle {
    width: unset !important;
    height: 100% !important;
  }

  > div.el-progress__text {
    //-webkit-text-stroke: thick;
    -webkit-text-stroke-width: thick;
  }
}
</style>
