<template>
  <div id="SeleniumIdeEditTestPlan" class="app-container">
    <div v-if="fileChange" class="file_change">檔案有更動，請重新整理</div>
    <div v-if="planChange" class="plan_change">測試計畫有更動</div>
    <el-button type="primary" style="margin: 1vw" :disabled="unChangeable" @click="rewriteAllScript">儲存</el-button>
    <div>
      <div>
        <el-button type="primary" :disabled="disableSelectAll('project')" @click="selectAll('project')">{{ '全選' }}</el-button>
        <el-button type="primary" :disabled="disableCancelSelectAll('project')" @click="cancelSelectAll('project')">{{ '全不選' }}</el-button>
        <el-button type="primary" :disabled="disableReverseSelect('project')" @click="reverseSelect('project')">{{ '反向選' }}</el-button>
        <el-table ref="dragTable" v-loading="listLoading" class="selenium_ide_project" :data="allScript" :row-key="projectRowKey" border fit highlight-current-row>
          <el-table-column label="File Name (Project Name)" @click="alert('GOGO')">
            <template slot-scope="{row}">
              <div class="td_layout" :class="allScript.indexOf(row)===projectIdx?'selectTrTd': ''" @click="updateProjectIdx(row)">
                <el-checkbox v-model="row.check">{{ row.fileName === row.projectName ? row.fileName : `${row.fileName} (${row.projectName})` }}</el-checkbox>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div>
        <el-button
          type="primary"
          :disabled="disableSelectAll('suite')"
          @click="selectAll('suite')"
        >
          {{ '全選' }}
        </el-button>
        <el-button
          type="primary"
          :disabled="disableCancelSelectAll('suite')"
          @click="cancelSelectAll('suite')"
        >
          {{ '全不選' }}
        </el-button>
        <el-button
          type="primary"
          :disabled="disableReverseSelect('suite')"
          @click="reverseSelect('suite')"
        >
          {{ '反向選' }}
        </el-button>
        <el-table ref="dragTable" v-loading="listLoading" class="selenium_ide_suites" :data="allScript.length&&allScript[projectIdx].suites.length?allScript[projectIdx].suites:[]" :row-key="suiteRowKey" border fit highlight-current-row>
          <el-table-column :label="`${allScript.length?allScript[projectIdx].projectName:'X'}：Suite Name`">
            <template slot-scope="{row}">
              <div class="td_layout" :class="allScript[projectIdx].suites.indexOf(row)===suiteIdx?'selectTrTd': ''" @click="updateSuiteIdx(row)">
                <el-checkbox v-model="row.check" :disabled="!allScript[projectIdx].check">{{ row.suiteName }}</el-checkbox>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div>
        <el-button
          type="primary"
          :disabled="disableSelectAll('test')"
          @click="selectAll('test')"
        >
          {{ '全選' }}
        </el-button>
        <el-button
          type="primary"
          :disabled="disableCancelSelectAll('test')"
          @click="cancelSelectAll('test')"
        >
          {{ '全不選' }}
        </el-button>
        <el-button
          type="primary"
          :disabled="disableReverseSelect('test')"
          @click="reverseSelect('test')"
        >
          {{ '反向選' }}
        </el-button>
        <el-table
          ref="dragTable"
          v-loading="listLoading"
          class="selenium_ide_tests"
          :data="allScript.length&&allScript[projectIdx].suites.length&&allScript[projectIdx].suites[suiteIdx].tests.length?allScript[projectIdx].suites[suiteIdx].tests:[]"
          :row-key="testRowKey"
          border
          fit
          highlight-current-row
        >
          <el-table-column :label="`${allScript.length&&allScript[projectIdx].suites.length?allScript[projectIdx].suites[suiteIdx].suiteName:'X'}：test Name`">
            <template slot-scope="{row}">
              <div class="td_layout" :class="allScript[projectIdx].suites[suiteIdx].tests.indexOf(row)===testIdx?'selectTrTd': ''" @click="updateTestIdx(row)">
                <el-checkbox v-model="row.check" :disabled="!allScript[projectIdx].check || !allScript[projectIdx].suites[suiteIdx].check">{{ row.testName }}</el-checkbox>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<script>
import Sortable from 'sortablejs'

export default {
  name: 'SeleniumIdeEditTestPlan',
  data() {
    return {
      fileChange: false,
      planChange: false,
      allScript: [],
      projectIdx: null,
      suiteIdx: null,
      testIdx: null,
      sortable: null,
      listLoading: true,
      unChangeable: true
    }
  },
  watch: {
    allScript: {
      handler: function() {
        if (this.listLoading === false) {
          this.unChangeable = false
        }
      },
      deep: true
    }
  },
  created() {
    this.getAllScript()
  },
  methods: {
    projectRowKey(projectRow) {
      return projectRow.fileId + projectRow.projectId
    },
    suiteRowKey(suiteRow) {
      const projectRow = this.allScript[this.projectIdx]
      return `${projectRow.fileId}${projectRow.projectId}${suiteRow.suiteId}`
    },
    testRowKey(testRow) {
      const projectRow = this.allScript[this.projectIdx]
      const suiteRow = projectRow.suites[this.suiteIdx]
      return `${projectRow.fileId}${projectRow.projectId}${suiteRow ? suiteRow.suiteId : ''}${testRow ? testRow.testId : ''}`
    },
    async getAllScript() {
      this.listLoading = true
      await this.$request(this.$serverRoute.ALL_SCRIPT.route).then(data => {
        this.allScript = data
        this.projectIdx = 0
        this.suiteIdx = 0
        this.testIdx = 0
        this.connectSocket()
      })
      this.listLoading = false
      this.$nextTick(() => {
        this.setSort()
      })
    },
    connectSocket() {
      this.$socket.on(this.$socketClientOn.SERVER_EMIT_SIDE_FILES_CHANGE.route, () => {
        this.fileChange = true
      })
      this.$socket.on(this.$socketClientOn.SERVER_EMIT_TEST_PLAN_CHANGE.route, (sid) => {
        if (sid !== this.$socket.io.engine.id) this.planChange = true
      })
    },
    setSort() {
      const el1 = document.querySelectorAll('.selenium_ide_project > .el-table__body-wrapper > table > tbody')[0]
      Sortable.create(el1, {
        ghostClass: 'sortable-ghost', // Class name for the drop placeholder,
        setData: function(dataTransfer) {
          // to avoid Firefox bug
          // Detail see : https://github.com/RubaXa/Sortable/issues/1012
          dataTransfer.setData('Text', '')
        },
        onEnd: evt => {
          const targetRow = this.allScript.splice(evt.oldIndex, 1)[0]
          this.sortUpdateIdx(evt, 'projectIdx')
          this.allScript.splice(evt.newIndex, 0, targetRow)
        }
      })
      const el2 = document.querySelectorAll('.selenium_ide_suites > .el-table__body-wrapper > table > tbody')[0]
      this.sortable = Sortable.create(el2, {
        ghostClass: 'sortable-ghost', // Class name for the drop placeholder,
        setData: function(dataTransfer) {
          // to avoid Firefox bug
          // Detail see : https://github.com/RubaXa/Sortable/issues/1012
          dataTransfer.setData('Text', '')
        },
        onEnd: evt => {
          const targetRow = this.allScript[this.projectIdx].suites.splice(evt.oldIndex, 1)[0]
          this.sortUpdateIdx(evt, 'suiteIdx')
          this.allScript[this.projectIdx].suites.splice(evt.newIndex, 0, targetRow)
        }
      })
      const el3 = document.querySelectorAll('.selenium_ide_tests > .el-table__body-wrapper > table > tbody')[0]
      this.sortable = Sortable.create(el3, {
        ghostClass: 'sortable-ghost', // Class name for the drop placeholder,
        setData: function(dataTransfer) {
          // to avoid Firefox bug
          // Detail see : https://github.com/RubaXa/Sortable/issues/1012
          dataTransfer.setData('Text', '')
        },
        onEnd: evt => {
          const targetRow = this.allScript[this.projectIdx].suites[this.suiteIdx].tests.splice(evt.oldIndex, 1)[0]
          this.sortUpdateIdx(evt, 'testIdx')
          this.allScript[this.projectIdx].suites[this.suiteIdx].tests.splice(evt.newIndex, 0, targetRow)
        }
      })
    },
    sortUpdateIdx(event, keyIdx) {
      const { oldIndex, newIndex } = event
      const [min, max] = [Math.min(oldIndex, newIndex), Math.max(oldIndex, newIndex)]
      if (oldIndex === this[keyIdx]) {
        this[keyIdx] = newIndex
      } else if (min <= this[keyIdx] && this[keyIdx] <= max) {
        this[keyIdx] += min < this[keyIdx] && oldIndex < this[keyIdx] ? -1 : 1
      }
    },
    updateProjectIdx(row) {
      this.projectIdx = this.allScript.indexOf(row)
      this.suiteIdx = 0
      this.testIdx = 0
    },
    updateSuiteIdx(row) {
      this.suiteIdx = this.allScript[this.projectIdx].suites.indexOf(row)
      this.testIdx = 0
    },
    updateTestIdx(row) {
      this.testIdx = this.allScript[this.projectIdx].suites[this.suiteIdx].tests.indexOf(row)
    },
    showSuiteTests(row) {
      if (row.tests.length) {
        return row.tests.map(_ => {
          return _.testName.trim().replaceAll(' ', '_')
        }).join(', ')
      } else {
        return 'Not Tests'
      }
    },
    rewriteAllScript() {
      this.$request(this.$serverRoute.REWRITE_ALL_SCRIPT.route, { all_script_json: this.allScript, sid: this.$socket.io.engine.id }).then(data => {
        if (data !== undefined) {
          this.unChangeable = true
          this.$message.info('已儲存')
        }
      })
    },
    fetchLevelArray(level) {
      switch (level) {
        case 'project':
          if (this.allScript.length) {
            return this.allScript
          }
          break
        case 'suite':
          if (this.allScript.length && this.allScript[this.projectIdx].suites.length) {
            return this.allScript[this.projectIdx].suites
          }
          break
        case 'test':
          if (this.allScript.length && this.allScript[this.projectIdx].suites.length && this.allScript[this.projectIdx].suites[this.suiteIdx].tests.length) {
            return this.allScript[this.projectIdx].suites[this.suiteIdx].tests
          }
          break
      }
      return undefined
    },
    selectAll(level) {
      const fetchArray = this.fetchLevelArray(level)
      if (fetchArray) {
        fetchArray.forEach(row => {
          row.check = true
        })
      }
    },
    cancelSelectAll(level) {
      const fetchArray = this.fetchLevelArray(level)
      if (fetchArray) {
        fetchArray.forEach(row => {
          row.check = false
        })
      }
    },
    reverseSelect(level) {
      const fetchArray = this.fetchLevelArray(level)
      if (fetchArray) {
        fetchArray.forEach(row => {
          row.check = !row.check
        })
      }
    },
    disableSelectAll(level) {
      const fetchArray = this.fetchLevelArray(level)
      if (fetchArray) {
        return fetchArray.length === fetchArray.filter(row => row.check).length
      }
      return true
    },
    disableCancelSelectAll(level) {
      const fetchArray = this.fetchLevelArray(level)
      if (fetchArray) {
        return fetchArray.filter(row => row.check).length === 0
      }
      return true
    },
    disableReverseSelect(level) {
      const fetchArray = this.fetchLevelArray(level)
      return !fetchArray
    }
  }
}
</script>

<style lang="scss">
#SeleniumIdeEditTestPlan {
  text-shadow: #000000 0.05rem 0.05rem 0.1rem;

  > .file_change {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, .9); /* 灰色透明背景 */
    z-index: 9999;
    font-size: 5rem;
    color: red;
    display: flex;
    padding-top: 5rem;
    justify-content: center;
  }

  > .plan_change {
    font-size: 3rem;
    color: red;
    display: flex;
    justify-content: center;
    background-color: yellow;
  }

  > .el-button--primary {
    font-size: 1vw;
    border-radius: .3vw;
    padding: .5vw;
  }

  > div {
    display: flex;

    > div {
      width: 100%;

      > .el-table {

        th {
          padding: 0;

          > .cell {
            font-weight: 700;
            font-size: 2.5rem;
            line-height: unset;
            padding: .6rem;
            word-break: break-word;
          }
        }

        tbody {
          > .sortable-ghost {
            opacity: 2.8;
            color: #fff !important;
            background: #42b983 !important;
          }

          > tr.el-table__row {
            > td {
              padding: 0;

              > div.cell {
                padding: 0;

                > .selectTrTd {
                  background-color: #aeb0b2;
                }

                > div.td_layout {
                  > label.el-checkbox {
                    display: flex;

                    > span.el-checkbox__input {
                      display: flex;
                      margin: auto 0;

                      > .el-checkbox__inner {
                        width: 1vw;
                        height: 1vw;
                        border-radius: .1vw;
                      }

                      > span.el-checkbox__inner::after {
                        width: 0.35vw;
                        height: 0.7vw;
                        margin: -.15vw auto;
                        display: flex;
                        position: unset;
                        border: .2vw solid #FFFFFF;
                        border-left: 0;
                        border-top: 0;
                      }
                    }

                    > .el-checkbox__label {
                      font-size: 2rem;
                      line-height: 2.2rem;
                      white-space: normal;
                      word-break: break-word;
                    }
                  }
                }
              }
            }
          }
        }

        tr.el-table__row {
          label {
            pointer-events: none;
            padding: .6rem;
            width: 100%;
          }
        }

        tr.current-row {
          label {
            pointer-events: auto;
          }
        }
      }
    }
  }
}
</style>
