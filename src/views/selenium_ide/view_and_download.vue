<template>
  <div class="app-container">
    <el-button :loading="downloadLoading" :disabled="multipleSelection.length===0" style="margin-bottom:20px" type="primary" icon="el-icon-document" @click="downloadFiles()">
      下載選擇的檔案(Zip)
    </el-button>
    <el-button id="multiDelete" :loading="deleteLoading" :disabled="multipleSelection.length===0" style="margin-bottom:20px" type="danger" icon="el-icon-document" @click="deleteFiles()">
      刪除選擇的檔案
    </el-button>
    <el-table
      ref="multipleTable"
      v-loading="reportsLoading"
      :data="reports"
      element-loading-text="拼命加载中"
      height="calc(80vh)"
      border
      fit
      highlight-current-row
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" align="center" />
      <el-table-column align="center" label="Id" width="95">
        <template slot-scope="scope">
          {{ scope.row.id }}
        </template>
      </el-table-column>
      <el-table-column label="Name">
        <template slot-scope="scope">
          <!--          <a class="view_one_file" :href="`${$origin}${$serverRoute.VIEW_ALLURE.route}/${scope.row.name}`" target="_blank">{{ scope.row.name }}</a>-->
          <a class="view_one_file" :href="oneAllureFileUrl(scope.row.name)" target="_blank">{{ scope.row.name }}</a>
        </template>
      </el-table-column>
      <el-table-column align="center" label="autotestVideo">
        <template slot-scope="scope">
          <el-button type="info" @click="showTestVideo(scope.row.name)">
            查看自動化測試錄影檔
          </el-button>
        </template>
      </el-table-column>
      <el-table-column align="center" label="finishCount" width="110">
        <template slot-scope="scope">
          {{ scope.row.progress.finishCount }}
        </template>
      </el-table-column>
      <el-table-column align="center" label="totalCount" width="110">
        <template slot-scope="scope">
          {{ scope.row.progress.totalCount }}
        </template>
      </el-table-column>
      <el-table-column align="center" label="finishRate" width="110">
        <template slot-scope="scope">
          <div class="rate" :style="background_hsl(scope.row.progress.finishRate, false)">
            {{ scope.row.progress.finishRate.toFixed(1).replace(/\.0$/, '') }}
            <div v-if="scope.row.progress.finishRate === 100" class="el-icon-upload-success el-icon-circle-check" />
          </div>
        </template>
      </el-table-column>
      <el-table-column align="center" label="passRate" width="110">
        <template slot-scope="scope">
          <div class="rate" :style="background_hsl(scope.row.progress.passRate, true)">
            {{ scope.row.progress.passRate.toFixed(1).replace(/\.0$/, '') }}
            <div v-if="scope.row.progress.passRate === 100" class="el-icon-upload-success el-icon-circle-check" />
          </div>
        </template>
      </el-table-column>
    </el-table>
    <el-dialog width="65%" top="5vh" style="padding-bottom: 5vh; padding-top: 5vh" :center="true" :title="`${testCaseDateTime}${videoName}`" :visible.sync="dialogFormVisible" :before-close="closeDialog">
      <div>
        <video controls style="width: 100%" :src="videoSrc" type="video/mp4">
          <track ref="subtitle" :label="videoName" kind="subtitles" :src="subtitleSrc" srclang="def">
        </video>
      </div>
      <el-button @click="changeTreeExpandStatus(true)">全展開</el-button>
      <el-button @click="changeTreeExpandStatus(false)">全閉合</el-button>
      <el-input
        v-model="filterText"
        placeholder="篩選關鍵字"
      />
      <el-tree ref="tree" v-loading="downloadVideoLoading" element-loading-text="下載中..." :data="testCases" default-expand-all :filter-node-method="filterNode">
        <template v-slot="{data}">
          <span v-if="data.children.length">{{ data.label }}</span>
          <div v-else class="videoButtonsRow">
            <button :class="videoName===`(${data.label})`?'selectVideo':''" @click="fetchVideoAndSubtitleSrc(data.path, data.label)">{{ data.label }}</button>
            <div>
              <button @click="downloadVideoAndSubtitle(data)">下載影片和字幕(分開)</button>
              <button @click="downloadMergeVideoSubtitle(data)">下載影片和字幕(合併)</button>
            </div>
          </div>
        </template>
      </el-tree>
    </el-dialog>
  </div>
</template>

<script>
export default {
  name: 'SeleniumIdeViewAndDownload',
  data() {
    return {
      reports: [],
      reportsLoading: true,
      multipleSelection: [],
      downloadLoading: false,
      deleteLoading: false,
      dialogFormVisible: false,
      testCases: [],
      filterText: '',
      testCaseDateTime: '',
      videoName: '',
      videoSrc: '',
      subtitleSrc: '',
      downloadVideoLoading: false
    }
  },
  watch: {
    filterText(val) {
      this.$refs.tree.filter(val)
    }
  },
  created() {
    this.fetchHistory()
    this.connectSocket()
  },
  methods: {
    oneAllureFileUrl(datetime) {
      return `${this.$origin}/${this.$serverRoute.VIEW_ALLURE.route}/${datetime}`
    },
    async downloadVideoAndSubtitle(data) {
      this.downloadVideoLoading = true
      const encodeTestCaseDateTime = encodeURIComponent(this.testCaseDateTime)
      const encodePath = encodeURIComponent(data.path)
      await this.$downloadFileOrZip([
        `${this.$serverRoute.TEST_CASE_VIDEO.route}/${encodeTestCaseDateTime}/${encodePath}`,
        `${this.$serverRoute.TEST_CASE_SUBTITLE.route}/${encodeTestCaseDateTime}/${encodePath}`
      ], `${this.testCaseDateTime}_${data.path}.zip`)
      this.downloadVideoLoading = false
    },
    async downloadMergeVideoSubtitle(data) {
      this.downloadVideoLoading = true
      const encodeTestCaseDateTime = encodeURIComponent(this.testCaseDateTime)
      const encodePath = encodeURIComponent(data.path)
      await this.$downloadFileOrZip([
        `${this.$serverRoute.TEST_CASE_MERGE_VIDEO_SUBTITLE.route}/${encodeTestCaseDateTime}/${encodePath}`
      ])
      this.downloadVideoLoading = false
    },
    closeDialog(done) {
      this.videoSrc = ''
      this.subtitleSrc = ''
      this.videoName = ''
      done()
    },
    fetchVideoAndSubtitleSrc(path, label) {
      this.videoName = `(${label})`
      const encodeTestCaseDateTime = encodeURIComponent(this.testCaseDateTime)
      const encodePath = encodeURIComponent(path)
      this.videoSrc = `${this.$origin}${this.$serverRoute.TEST_CASE_VIDEO.route}/${encodeTestCaseDateTime}/${encodePath}`
      this.subtitleSrc = `${this.$origin}${this.$serverRoute.TEST_CASE_SUBTITLE.route}/${encodeTestCaseDateTime}/${encodePath}`
      this.$refs.subtitle.track.mode = 'hidden'
      this.$nextTick(() => {
        this.$refs.subtitle.track.mode = 'showing'
      })
    },
    filterNode(value, data) {
      if (!value) return true
      return data.label.indexOf(value) !== -1
    },
    changeTreeExpandStatus(status, nodes = undefined) {
      (nodes || this.$refs.tree.$children).forEach(node => {
        if (node.$children.length) {
          this.changeTreeExpandStatus(status, node.$children)
        }
        if (node.$refs.node && node.expanded !== status) {
          node.$refs.node.click()
        }
      })
    },
    background_hsl(value, passRate) {
      return { 'background-color': value === 100 ? 'rgb(0, 200, 0)' : passRate ? `rgba(200, 0, 0, ${1 - (value / 110)})` : `rgba(50, 50, 50, ${1 - (value / 110)})` }
    },
    async fetchHistory() {
      this.reportsLoading = true
      this.reports = await this.$request(`${this.$serverRoute.REPORT_HISTORY.route}`)
      this.reportsLoading = false
    },
    connectSocket() {
      this.$socket.removeAllListeners()
      this.$socket.on(this.$socketClientOn.SERVER_EMIT_TEST_RESULT_CHANGE.route, (data) => {
        this.reports = data
      })
    },
    handleSelectionChange(val) {
      this.multipleSelection = val
    },
    async deleteFiles(row = undefined) {
      this.deleteLoading = true
      const result = await this.$deleteFiles(this.$serverRoute.DELETE_ALLURES.route, (row ? [row] : this.multipleSelection).map(row => row.name))
      if (result) {
        this.reports = await this.$request(`${this.$serverRoute.REPORT_HISTORY.route}`)
      }
      this.deleteLoading = false
    },
    async downloadFiles(row = undefined) {
      this.downloadLoading = true
      await this.$downloadFileOrZip((row ? [row] : this.multipleSelection).map(row => `${this.$serverRoute.DOWNLOAD_ALLURE.route}/${row.name}`), `allure_report_${this.$nowDatetimeFormat()}.zip`)
      this.$refs.multipleTable.clearSelection()
      this.downloadLoading = false
    },
    showTestVideo(datetime) {
      this.$request(`${this.$serverRoute.TEST_CASES_VIDEO.route}/${datetime}`).then(data => {
        if (data !== undefined) {
          this.testCaseDateTime = datetime
          this.testCases = data
          this.dialogFormVisible = true
        }
      })
    }
  }
}
</script>

<style scoped lang="scss">
.view_one_file {
  color: #1482f0;
}

.rate {
  color: white;
  text-shadow: black 0.1em 0.1em 0.2em;
  border-radius: .3rem;
}

.videoButtonsRow {
  width: 100%;
  display: flex;
  justify-content: space-between;
}

.videoButtonsRow > .selectVideo {
  background-color: #77ffbb;
}

video {
  -webkit-user-drag: none;
}
</style>
