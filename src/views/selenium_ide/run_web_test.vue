<template>
  <div class="app-container">
    <div v-if="fileChange && status===1" class="file_change">檔案有更動，請重新整理</div>
    <div v-if="planChange && status===1" class="plan_change">測試計畫有更動</div>
    <div class="test_status">
      <table :style="shadow()">
        <tr>
          <th>運行狀態</th>
          <th>運行進度</th>
        </tr>
        <tr>
          <td>{{ socketStatusList[status].statusText }}</td>
          <td>{{ progress }}</td>
        </tr>
      </table>
      <!--      <el-button type="primary" :style="socketStatusList[status].style" :disabled="wait || allScript.length===0" plain @click="startOrStopTest">{{ socketStatusList[status].text }}</el-button>-->
      <el-button :type="socketStatusList[status].type" :loading="wait||status===3" :disabled="wait||allScript.length===0||status===3" plain @click="startOrStopTest">{{ socketStatusList[status].text }}</el-button>
    </div>
    <div class="test_url">
      <label>主要網址(取代)：</label>
      <input v-model="testVariable.mainUrl" type="url" placeholder="未填寫則使用腳本內的網址" title="未填寫則使用腳本內的網址" :disabled="status !== 1" @input="variableChange">
    </div>
    <div id="addChangeVariable">
      <div class="speedTime">
        <label>測試執行速度(毫秒)：</label>
        <el-slider v-model="speedTime" :max="3000" :min="0" :format-tooltip="value=>`${value} 毫秒`" show-input @change="changeSpeedTime" />
        <p>PS:每一步驟間隔多久時間(毫秒)</p>
      </div>
      <div class="upload_text">
        <div>PS:上傳和運行中下載的檔案，在<p v-if="downloadsFolderPath">{{ downloadsFolderPath }}</p>
          <el-button type="info" :disabled="status === 0" @click="showFolderFiles">查看</el-button>
          ; 運行完都將刪除。
        </div>
      </div>
      <div class="add_upload">
        <input ref="uploadInput" class="uploadInput" type="file" multiple @change="inputChange">
        <el-button type="success" round @click="uploadFiles">上傳檔案</el-button>
        <el-button :disabled="status !== 1" @click="addChangeVariable">增加變數欄位(取代)</el-button>
      </div>
      <template v-for="variable in testVariable.variable">
        <div :key="`${variable}`" class="variable">
          <label>變數名稱：</label>
          <input v-model="variable.key" type="text" placeholder="腳本內的變數名稱，若無則不取代" title="腳本內的變數名稱，若無則不取代" :disabled="status !== 1" @input="variableChange">
          <label>變數的值：</label>
          <input v-model="variable.value" type="text" placeholder="取代該變數名稱的新值" title="取代該變數名稱的新值" :disabled="status !== 1" @input="variableChange">
          <el-button :disabled="status !== 1" @click="removeChangeVariable(variable)">刪除變數欄位</el-button>
        </div>
      </template>
    </div>
    <div class="datetime">
      <label>開始時間：{{ startDatetime }}</label>
      <label>結束時間：{{ endDatetime }}</label>
    </div>
    <hr>
    <div>
      <el-button-group>
        <el-button :class="selectedButton? '': 'selected_button'" @click="()=>{selectedButton = 0}">進度</el-button>
        <el-button :class="selectedButton? 'selected_button': ''" @click="()=>{selectedButton = 1}">畫面</el-button>
      </el-button-group>
    </div>
    <template v-if="allScript.length">
      <template v-if="selectedButton">
        <img id="video" src="" alt="">
      </template>
      <template v-else>
        <ol>
          <li v-for="script in allScript" :key="script.fileId">
            {{ script.projectName }}
            <ol>
              <li v-for="suite in script.suites" :key="suite.suiteId">
                {{ suite.suiteName }}
                <ol>
                  <li v-for="test in insertResult(script.fileId, script.projectId, suite.suiteId, suite.tests)" :key="test.testId">
                    <div :class="test.result" :title="test.testName">
                      <div>{{ test.testName }}</div>
                      <div>
                        <div v-if="test.result==='PASSED'" class="el-icon-upload-success el-icon-circle-check" />
                        {{ test.result }}
                      </div>
                    </div>
                  </li>
                </ol>
              </li>
            </ol>
          </li>
        </ol>
      </template>
    </template>
    <template v-else>
      <h1>沒有可以測試的項目</h1>
    </template>
  </div>
</template>

<script>
export default {
  name: 'SeleniumIdeRunWebTest',
  data() {
    return {
      startDatetime: '-----',
      endDatetime: '-----',
      selectedButton: 0,
      fileChange: false,
      planChange: false,
      speedTime: 1000,
      downloadsFolderPath: '',
      testVariable: {
        mainUrl: '',
        variable: []
      },
      wait: true,
      allScript: [],
      status: 0,
      progress: '0.00%',
      progressResult: {},
      socketStatusList: {
        0: {
          text: '連線中...',
          statusText: '-----',
          type: 'primary',
          style: { color: '#1890ff' }
        },
        1: {
          text: '開始測試',
          statusText: '停止',
          type: 'success',
          style: { color: '#13ce66' }
        },
        2: {
          text: '停止測試',
          statusText: '運行中...',
          type: 'danger',
          style: { color: '#ff4949' }
        },
        3: {
          text: '等待停止',
          statusText: '停止中...',
          type: 'danger',
          style: { color: '#ff4949' }
        },
        4: {
          text: '重置測試',
          statusText: '停止',
          type: 'warning',
          style: { color: '#ffba00' }
        }
      }
    }
  },
  watch: {
    selectedButton: {
      handler: function(newVal) {
        this.$socket.emit(newVal ? this.$socketClientEmit.JOIN_ROOM.route : this.$socketClientEmit.LEAVE_ROOM.route)
      }
    }
  },
  beforeDestroy() {
    this.$socket.emit(this.$socketClientEmit.LEAVE_ROOM.route)
  },
  created() {
    this.getAllScript()
    window.addEventListener('beforeunload', this.leaving)
  },
  methods: {
    variableChange() {
      if (this.status === 1) {
        this.$socket.emit(this.$socketClientEmit.SERVER_ON_VARIABLE_CHANGE.route, this.testVariable)
      }
    },
    insertResult(fileId, projectId, suiteId, tests) {
      const result = []
      tests.forEach(test => {
        test['result'] = this.checkResult(fileId, projectId, suiteId, test.testId)
        result.push(test)
      })
      return result
    },
    checkResult(fileId, projectId, suiteId, testId) {
      if (fileId in this.progressResult) {
        if (projectId in this.progressResult[fileId]) {
          if (suiteId in this.progressResult[fileId][projectId]) {
            if (testId in this.progressResult[fileId][projectId][suiteId]) {
              return this.progressResult[fileId][projectId][suiteId][testId]
              // return this.progressResult[fileId][projectId][suiteId][testId] === 'PASSED' ? 'PASSED' : 'FAILED'
            }
          }
        }
      }
      return ''
    },
    leaving() {
      this.$socket.disconnect()
    },
    async getAllScript() {
      this.wait = true
      this.$request(this.$serverRoute.TEST_CASES.route).then(response => {
        if (response !== undefined) {
          this.allScript = response
          this.connectSocket()
          this.$request(this.$serverRoute.TEST_STATUS.route).then(response => {
            if (response !== undefined) {
              this.updateTestInfo(response)
              this.wait = false
            }
          })
        }
      })
    },
    changeSpeedTime() {
      this.$socket.emit(this.$socketClientEmit.SERVER_ON_SPEED_TIME.route, this.speedTime)
    },
    showFolderFiles() {
      this.$request(this.$serverRoute.SHOW_FOLDER_FILES.route).then(response => {
        if (response !== undefined) {
          this.$swal.fire({
            type: 'info',
            title: `${this.downloadsFolderPath}裡面的檔案如下`,
            html: `<ul style="text-align: left; list-style-type: decimal">${response.map(row => `<li>${row} </li>`).join('')}</ul>`,
            width: 'fit-content',
            customClass: {
              html: 'text-left' // 將文本靠左對齊
            }
          })
        }
      })
    },
    inputChange() {
      const tempFiles = this.$refs.uploadInput.files
      if (tempFiles.length) {
        const tempFilesValue = Object.values(tempFiles)
        const formData = tempFilesValue.reduce((data, file) => {
          data.append(file.name, file)
          return data
        }, new FormData())
        this.$swal.fire({
          title: '確定上傳檔案嗎?',
          html: `<p>你將要上傳以下的檔案</p>${tempFilesValue.map(row => `<p>${row.name}<\p>`).join('')}`,
          icon: 'success',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
          confirmButtonText: '確定, 上傳!',
          cancelButtonText: '取消'
        }).then((result) => {
          if (result.isConfirmed) {
            this.$request(this.$serverRoute.UPLOAD_FILES_FOR_TEST.route, formData).then(response => {
              if (response !== undefined) {
                this.$message.info(response)
                this.showFolderFiles()
              }
            })
          }
        })
        this.$refs.uploadInput.value = ''
      }
    },
    uploadFiles() {
      this.$refs.uploadInput.click()
    },
    connectSocket() {
      this.$socket.removeAllListeners()
      this.$socket.on(this.$socketClientOn.SERVER_EMIT_TEST_STATUS.route, data => this.updateTestInfo(data))
      this.$socket.on(this.$socketClientOn.SERVER_EMIT_TEST_PLAN_CHANGE.route, () => {
        this.planChange = true
      })
      this.$socket.on(this.$socketClientOn.SERVER_EMIT_SPEED_TIME.route, data => {
        this.speedTime = parseInt(data)
      })
      this.$socket.on(this.$socketClientOn.SERVER_EMIT_SIDE_FILES_CHANGE.route, () => {
        this.fileChange = true
      })
      this.$socket.on(this.$socketClientOn.SERVER_EMIT_TEST_SCREENSHOT.route, (data) => {
        if (this.selectedButton) {
          new Blob([data], { type: 'image/jpeg' }).text().then(bytes => {
            document.getElementById('video').src = 'data:image/jpeg;base64,' + bytes
          })
        }
      })
      this.$socket.on(this.$socketClientOn.SERVER_EMIT_RESET.route, _ => {
        this.$request(this.$serverRoute.TEST_CASES.route).then(response => {
          if (response !== undefined) {
            this.allScript = response
            this.fileChange = false
            this.planChange = false
            this.selectedButton = 0
          }
        })
      })
      this.$socket.on(this.$socketClientOn.SERVER_EMIT_VARIABLE_CHANGE.route, (data) => {
        this.testVariable = data
      })
    },
    updateTestInfo(data) {
      this.speedTime = data.speedTime !== undefined ? data.speedTime : this.speedTime
      this.downloadsFolderPath = data.downloadsFolderPath ? data.downloadsFolderPath : ''
      this.testVariable = data.testVariable ? data.testVariable : this.testVariable
      this.startDatetime = data.startDatetime ? data.startDatetime : '-----'
      this.endDatetime = data.endDatetime ? data.endDatetime : '-----'
      this.progress = `${data.progress.toFixed(2)}%`
      this.progressResult = data.progressResult
      this.status = data.status
    },
    async startOrStopTest() {
      this.wait = true
      if (this.status === 1) {
        if (this.testVariable.mainUrl === '' || this.isValidUrl(this.testVariable.mainUrl)) {
          await this.$request(this.$serverRoute.START_TEST_CASES.route, { testCases: this.allScript, testVariable: this.testVariable })
        } else {
          this.$message.error(`該網址有問題：${this.testVariable.mainUrl}`)
        }
      } else if (this.status === 2) {
        await this.$request(this.$serverRoute.STOP_TEST_CASES.route)
      } else if (this.status === 4) {
        await this.$request(this.$serverRoute.TEST_RESET.route)
      }
      this.wait = false
    },
    isValidUrl(url) {
      const pattern = new RegExp('^(https?:\\/\\/)?' + // 協定
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|localhost|' + // 域名
        '((\\d{1,3}\\.){3}\\d{1,3}))' + // 或者 IP 地址
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+#]*)*' + // 端口和路徑
        '(\\?[;&a-z\\d%_.~+=-]*)?' + // 查詢字串
        '(\\#[-a-z\\d_]*)?$', 'i') // 片段識別符
      // 使用正規表達式比對 URL 字串
      return pattern.test(url)
    },
    shadow() {
      return {
        'text-shadow': `${this.socketStatusList[this.status].style.color} 0.1vw 0.1vw 0.2vw`
      }
    },
    addChangeVariable() {
      if (this.status === 1) {
        this.testVariable.variable.push({ key: '', value: '' })
        this.variableChange()
      }
    },
    removeChangeVariable(variable) {
      if (this.status === 1) {
        this.testVariable.variable.splice(this.testVariable.variable.indexOf(variable), 1)
        this.variableChange()
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.app-container {
  padding: 2vw;
}

.file_change {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, .9); /* 灰色透明背景 */
  z-index: 9999;
  font-size: 5vw;
  color: red;
  display: flex;
  padding-top: 5vw;
  justify-content: center;
}

.plan_change {
  font-size: 3vw;
  color: red;
  display: flex;
  justify-content: center;
  background-color: yellow;
}

.test_url {
  width: 90%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: auto;
  padding: .1vw 0;
  font-size: 2vw;

  > label {
    flex-shrink: 0;
  }

  input {
    flex: 1;
  }
}

#addChangeVariable {
  width: 90%;
  display: block;
  margin: auto;

  > div.variable {
    display: flex;
    font-size: 1.2vw;
    align-items: center;

    > label {
      flex-shrink: 0;
      width: auto;
    }

    > label:nth-of-type(2) {
      padding-left: 1vw;
    }

    input:first-of-type {
      flex: 1;
    }

    > input:last-of-type {
      flex: 2;
    }

    button {
      float: right;
      padding: 0.3vw;
      width: fit-content;
      height: fit-content;
      font-size: 1vw;
      font-weight: 700;
      border: 0.1vw solid;
      border-radius: .4vw;
      margin: 0;
    }
  }

  > .speedTime {
    display: flex;
    align-items: center;

    > label, > p {
      font-size: 1vw;
    }

    ::v-deep > .el-slider {
      min-width: 15vw;
      width: 40vw;
      display: flex;
      align-items: center;
      flex-direction: row-reverse;

      .el-slider__runway {
        width: 40vw;
        min-width: 1rem;
        margin-right: 1vw;
        margin-left: 1vw;
        height: .5vw;
        display: flex;
        align-items: center;
        justify-content: center;

        > .el-slider__bar {
          height: .5vw;
        }

        > .el-slider__button-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          top: unset;
          width: 1.5vw;
          height: 1.5vw;

          > .el-slider__button {
            width: 1.5vw;
            height: 1.5vw;
          }
        }
      }

      > .el-slider__input {
        width: 10vw;
        min-width: 4rem;
        height: auto;
        display: flex;
        justify-content: center;
        align-items: center;
        margin: 0 1vw 0 0;

        > span {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 1.5vw;
          min-width: 1rem;
          height: 94%;
          font-size: 1.3vw;
          top: unset;
        }

        > .el-input-number__increase {
          right: calc((0.1rem + 0.1vw) / 2);
        }

        > .el-input-number__decrease {
          left: calc((0.1rem + 0.1vw) / 2);
        }

        > div.el-input {
          line-height: unset;
          height: auto;
          display: block;

          > input.el-input__inner {
            display: block;
            height: auto;
            font-size: 1.5vw;
            padding: 0 1.5vw;
          }
        }
      }
    }
  }

  > .upload_text {
    > div {
      display: flex;
      align-items: center;
      font-size: 1.2vw;

      > p {
        margin: 0;
        padding: .2vw;
        border-radius: 0.4vw;
        font-size: 1.4vw;
        font-weight: 600;
        color: red;
        border: 0.2vw solid red;
      }

      > button {
        padding: 0.5vw;
        width: fit-content;
        height: fit-content;
        font-size: 1.8vw;
        font-weight: 700;
        border: 0.2vw solid;
        border-radius: .8vw;
        margin: 0;
      }
    }
  }

  > div.add_upload {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: flex-end;

    > .uploadInput {
      display: none;
      z-index: -9999;
    }

    > button {
      padding: 0.5vw;
      width: fit-content;
      height: fit-content;
      font-size: 1.8vw;
      font-weight: 700;
      border: 0.2vw solid;
      border-radius: 2.5vw;
      margin: 0;
    }
  }
}

.datetime {
  width: 100%;
  display: flex;
  justify-content: center;
  font-size: 2vw;
  color: #2b2f3a;
  text-shadow: #656566 0.1vw 0.1vw 0.2vw;

  label {
    max-width: 50%;
    min-width: fit-content;
    width: 30%;
  }
}

hr {
  border: 0.3vw solid;
  border-radius: 1vw;
  color: #636cff;
}

.el-button-group {
  display: flex;

  .selected_button {
    background-color: rgba(70, 197, 234, 0.5);
  }

  > button {
    padding: .3vw;
    width: 15vw;
    min-width: fit-content;
    height: 5vw;
    min-height: 1rem;
    font-size: 2.5vw;
    margin-left: 1vw;
    border: .3vw solid;
    border-radius: 1vw;
  }
}

img {
  max-width: 100%;
}

.test_status {
  display: flex;
  justify-content: center;
  align-items: center;

  table, th, td {
    font-size: 5vw;
    border: .2vw solid;
    border-radius: .2vw;
    text-align: center;
    //text-shadow: green 0.1rem 0.1rem 0.2rem;
    width: fit-content;
  }

  > button {
    padding: .3vw;
    width: 30vw;
    min-width: fit-content;
    height: 10vw;
    min-height: 1rem;
    font-size: 5vw;
    margin-left: 2vw;
    border: .3vw solid;
    border-radius: .5vw;
  }
}

ol {
  padding: 0;
  font-size: 3vw;
  counter-reset: level1; /* 重置第一層计数器 */
  list-style-type: none; /* 不显示第一層列表项标记 */
  :before {
    font-weight: 600;
    color: #5fa3e3;
  }

  li:before {
    content: counters(level1, ".") ". "; /* 显示计数器值和标点符号 */
    counter-increment: level1; /* 递增计数器 */
    text-align: right;
    min-width: 5vw;
    display: inline-block;
    text-shadow: black 0.1vw 0.1vw 0.2vw;
  }

  ol {
    font-size: 2.5vw;
    counter-reset: level2; /* 重置第二層计数器 */
    li:before {
      content: counters(level1, ".") "." counters(level2, ".") " "; /* 显示第一层和第二层计数器的值 */
      counter-increment: level2; /* 递增第二层计数器 */
      text-align: right;
      min-width: 9vw;
      display: inline-block;
    }

    ol {
      font-size: 2vw;
      counter-reset: level3; /* 重置第三層计数器 */
      li:before {
        content: counters(level1, ".") "." counters(level2, ".") "." counters(level3, ".") " "; /* 显示第一层、第二层和第三层计数器的值 */
        counter-increment: level3; /* 递增第三层计数器 */
        padding-right: 1vw;
        min-width: 15vw;
        display: inline-block;
      }

      li:nth-child(even) {
        > div {
          background-color: #ddffff;
        }
      }

      li:nth-child(odd) {
        > div {
          background-color: #bbffff;
        }
      }

      li {
        display: flex;
        width: 80%;
        margin-bottom: .1vw;

        > div {
          border: groove;
          width: calc(80% - 2vw);
          display: flex;
          align-items: center;
          padding: .2vw 1vw;
          border-radius: .5vw;

          > div:first-child {
            flex: 1;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
          }

          > div:last-child {
            width: fit-content;
            //display: flex;
            //white-space: nowrap;
            //align-items: center;
            //justify-content: flex-end;
          }
        }
      }
    }
  }
}

.PASSED {
  background-color: #97cc64 !important;
}

.FAILED {
  background-color: #fd5a3e !important;
}

.SKIPPED {
  background-color: #aaa !important;
}

.BROKEN {
  background-color: #ffd050 !important;
}

.UNKNOWN {
  background-color: #d35ebe !important;
}
</style>
