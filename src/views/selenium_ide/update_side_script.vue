<template>
  <div id="SeleniumIdeUpdateSide" class="app-container">
    <div id="left">
      <h1>最新檔案(限一個 .side)</h1>
      <input :ref="leftSideUploadInput" :class="leftSideUploadInput" type="file" accept=".side" @change="inputChange(true)">
      <div
        class="drop"
        :class="leftRight === 'left'? 'mouse-over':''"
        @drop.prevent="e=>handleDrop(e,true)"
        @dragover="e=>dragOver(e, true)"
        @dragleave="handleLeave"
        @mouseover="()=>handleOver(true)"
        @mouseleave="handleLeave"
        @click="handleSelect(true)"
      >
        <template v-if="leftFile">
          <div>
            <ul style="width: fit-content; user-select: none;">
              <li class="el-upload-list__item is-success" style="list-style: none;" @click.stop>
                <div class="file">
                  <div class="file_name">
                    <a class="el-upload-list__item-name" style="color: #1890ff"><i class="el-icon-document" />{{ leftFile.file.name }}</a>
                    <label class="el-upload-list__item-status-label">
                      <i class="el-icon-upload-success el-icon-circle-check" />
                    </label>
                    <i class="el-icon-close" @click.stop="rmUpload(leftFile, true)" />
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </template>
        <template v-else>
          <div>
            <i class="el-icon-upload" />
            Drop Side files here or click
            <el-button type="primary">
              Select
            </el-button>
          </div>
        </template>
      </div>
      <template v-if="leftFile">
        <el-button type="primary" :disabled="selectNames.length === leftFile.data.tests.length" @click.stop="selectAll">{{ '全選' }}</el-button>
        <el-button type="primary" :disabled="selectNames.length === 0" @click.stop="cancelSelectAll">{{ '全不選' }}</el-button>
        <el-button type="primary" @click.stop="reverseSelect">{{ '反向選' }}</el-button>
        <el-table ref="dragTable" class="" :data="leftFile.data.tests" row-key="name" border fit highlight-current-row>
          <el-table-column :label="`${leftFile.file.name} (${leftFile.data.name})`">
            <template slot-scope="{row}">
              <div class="td_layout">
                <div />
                <el-checkbox :key="row.name" v-model="row.check" :checked="row.check">{{ row.name }}</el-checkbox>
                <div />
              </div>
            </template>
          </el-table-column>
        </el-table>
      </template>
    </div>
    <div id="right">
      <h1>待修改檔案(可多檔案 .side)</h1>
      <input :ref="rightSideUploadInput" :class="rightSideUploadInput" type="file" accept=".side" multiple @change="inputChange()">
      <div
        class="drop"
        :class="leftRight === 'right'? 'mouse-over':''"
        @drop.prevent="handleDrop"
        @dragover="dragOver"
        @dragleave="handleLeave"
        @mouseover="handleOver()"
        @mouseleave="handleLeave"
        @click="handleSelect()"
      >
        <template v-if="rightFiles.length">
          <el-button type="primary" :disabled="rightFilesOpen.length === rightFiles.length" @click.stop="allOpenClose(true)">{{ '全展開' }}</el-button>
          <el-button type="primary" :disabled="rightFilesOpen.length === 0" @click.stop="allOpenClose(false)">{{ '全閉合' }}</el-button>
          <el-button type="primary" :disabled="!selectNames.some(name=>rightFiles.some(file=>!file.changes.includes(name)))" @click.stop="downloadFiles">{{ '下載全部' }}</el-button>
          <div>
            <ul style="width: fit-content; user-select: none;">
              <li
                v-for="row in rightFiles"
                :key="`${row.file.name}${changeDateTime}`"
                class="el-upload-list__item is-success triangle"
                :class="rightFilesOpen.includes(row.file.name)? '':'inverse'"
                style="list-style: none;"
                @click.stop="openClose(row.file.name)"
              >
                <el-button type="primary" :disabled="!selectNames.some(name=>!row.changes.includes(name))" @click.stop="downloadFile(row.file.name, row)">下載</el-button>
                <div class="file">
                  <div class="file_name">
                    <a class="el-upload-list__item-name" style="color: #1890ff"><i class="el-icon-document" />{{ row.file.name }}</a>
                    <label class="el-upload-list__item-status-label">
                      <i class="el-icon-upload-success el-icon-circle-check" />
                    </label>
                    <i class="el-icon-close" @click.stop="rmUpload(row)" />
                  </div>
                  <div v-if="rightFilesOpen.includes(row.file.name)" class="file_info">
                    <template v-for="name in selectNames">
                      <template v-if="!row.changes.includes(name)">
                        <div v-if="row.data.tests.some(test => test.name === name)" :key="`${name}replaces`" class="replaces">{{ `Replace：${name}` }}</div>
                        <div v-else :key="`${name}inserts`" class="inserts">{{ `Insert：${name}` }}</div>
                      </template>
                    </template>
                    <template v-for="test in row.data.tests">
                      <div v-if="!selectNames.includes(test.name) || row.changes.includes(test.name)" :key="`${test.name}show`"> {{ test.name }}</div>
                    </template>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </template>
        <template v-else>
          <div>
            <i class="el-icon-upload" />
            Drop Side files here or click
            <el-button type="primary">
              Select
            </el-button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script>
import JSZip from 'jszip'

export default {
  name: 'SeleniumIdeUpdateSide',
  data() {
    return {
      leftRight: '',
      leftFile: null,
      rightFiles: [],
      rightFilesOpen: [],
      changeDateTime: new Date(),
      rightSideUploadInput: 'right-side-upload-input',
      leftSideUploadInput: 'left-side-upload-input',
      selectNames: []
    }
  },
  watch: {
    leftFile: {
      handler: function() {
        this.fileChange()
      },
      deep: true
    },
    rightFiles: {
      handler: function() {
        this.fileChange()
      },
      deep: true
    }
  },
  methods: {
    fileChange() {
      if (this.leftFile !== null) {
        const selectNames = []
        this.leftFile.data.tests.forEach(testRow => {
          if (testRow.check === true) {
            selectNames.push(testRow.name)
          }
        })
        this.selectNames = selectNames
        this.changeDateTime = new Date()
      }
    },
    async * newFetchFilePicker(type, fileName) {
      try {
        type = type.toLowerCase()
        if (['side', 'zip'].includes(type)) {
          const accept = {}
          accept[`application/${type}`] = [`.${type}`]
          let filePicker = await window.showSaveFilePicker({
            // suggestedName: `${fileName}.${type.toLowerCase()}`,
            suggestedName: fileName,
            types: [{
              description: `${type} File`,
              accept: accept
            }]
          })
          filePicker = await filePicker.createWritable()
          await filePicker.write(yield true, { type: `application/${type}` })
          await filePicker.close()
        }
        // eslint-disable-next-line no-empty
      } catch {
      }
    },
    downloadFiles() {
      if (this.selectNames.some(name => this.rightFiles.some(file => !file.changes.includes(name)))) {
        const filePickerGenerate = this.newFetchFilePicker('zip', `seleniumIDE_${this.$nowDatetimeFormat()}.zip`)
        filePickerGenerate.next().then(result => {
          if (!result.done) {
            const zip = new JSZip()
            this.rightFiles.forEach(row => {
              if (this.selectNames.some(name => !row.changes.includes(name))) {
                this.insertReplace(row)
                zip.file(row.file.name, JSON.stringify(row.data))
              }
            })
            zip.generateAsync({ type: 'blob' }).then(zipBlob => {
              filePickerGenerate.next(zipBlob)
            })
          }
        })
      }
    },
    downloadFile(fileName, row) {
      if (this.selectNames.some(name => !row.changes.includes(name))) {
        const filePickerGenerate = this.newFetchFilePicker('side', fileName)
        filePickerGenerate.next().then(result => {
          if (!result.done) {
            this.insertReplace(row)
            filePickerGenerate.next(new Blob([JSON.stringify(row.data)], { type: 'application/json' }))
          }
        })
      }
    },
    insertReplace(row) {
      const selectTests = []
      this.leftFile.data.tests.forEach(testRow => {
        if (testRow.check === true) {
          row.changes.push(testRow.name)
          // eslint-disable-next-line no-unused-vars
          const { check, ...test } = testRow
          selectTests.push(test)
        }
      })
      selectTests.forEach(test => {
        const findIndex = row.data.tests.findIndex(testRow => testRow.name === test.name)
        if (findIndex === -1) {
          row.data.tests.push(test)
        } else {
          row.data.tests[findIndex].commands = test.commands
        }
      })
    },
    rmUpload(rowFile, isLeft = false) {
      if (isLeft) {
        if (this.leftFile && this.leftFile === rowFile) {
          this.leftFile = null
        }
      } else {
        this.rightFiles.splice(this.rightFiles.indexOf(rowFile), 1)
      }
    },
    allOpenClose(open) {
      if (open) {
        this.rightFilesOpen = this.rightFiles.map(row => {
          return row.file.name
        })
      } else {
        this.rightFilesOpen = []
      }
    },
    openClose(fileName) {
      if (this.rightFilesOpen.includes(fileName)) {
        this.rightFilesOpen.splice(this.rightFilesOpen.indexOf(fileName), 1)
      } else {
        this.rightFilesOpen.push(fileName)
      }
    },
    selectAll() {
      this.leftFile.data.tests.forEach(test => {
        test.check = true
      })
    },
    cancelSelectAll() {
      this.leftFile.data.tests.forEach(test => {
        test.check = false
      })
    },
    reverseSelect() {
      this.leftFile.data.tests.forEach(test => {
        test.check = !test.check
      })
    },
    fetchJson(file) {
      const reader = new FileReader()
      const readFileAsText = (file) => {
        return new Promise((resolve, reject) => {
          reader.onload = function(e) {
            resolve(e.target.result)
          }
          reader.onerror = function(e) {
            reject(e)
          }
          reader.readAsText(file)
        })
      }
      return readFileAsText(file)
    },
    handleFiles(files, isLeft) {
      if (files.length) {
        const errorType = []
        if (isLeft) {
          const file = files[0]
          if (this.isSide(file)) {
            this.fetchJson(file).then(data => {
              const jsonData = JSON.parse(data)
              jsonData.tests.sort((row1, row2) => {
                return row1.name > row2.name ? 1 : -1
              })
              jsonData.tests.forEach(row => {
                row.check = false
              })
              this.leftFile = { 'data': jsonData, 'file': file }
            })
          } else {
            errorType.push(file.name)
          }
        } else {
          files.forEach(file => {
            if (this.isSide(file)) {
              this.fetchJson(file).then(data => {
                const inArrayIndex = this.rightFiles.findIndex(item => item.file.name === file.name)
                const defaultObject = { 'data': JSON.parse(data), 'file': file, 'changes': [] }
                if (inArrayIndex === -1) {
                  this.rightFiles.push(defaultObject)
                } else {
                  this.rightFiles[inArrayIndex] = defaultObject
                }
              })
            } else {
              errorType.push(file.name)
            }
          })
        }
        if (errorType.length) {
          this.$message.error(`This type not is .side (${errorType.join(', ')})`)
        }
        this.$refs[isLeft ? this.leftSideUploadInput : this.rightSideUploadInput].value = null
      }
    },
    handleDrop(e, isLeft) {
      e.stopPropagation()
      e.preventDefault()
      this.handleFiles(e.dataTransfer.files, isLeft)
    },
    dragOver(e, isLeft = false) {
      e.stopPropagation()
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
      this.handleOver(isLeft)
    },
    handleOver(isLeft = false) {
      this.leftRight = isLeft ? 'left' : 'right'
    },
    handleLeave() {
      this.leftRight = ''
    },
    handleSelect(isLeft = false) {
      this.$refs[isLeft ? this.leftSideUploadInput : this.rightSideUploadInput].click()
    },
    inputChange(isLeft = false) {
      this.handleFiles(isLeft ? this.$refs[this.leftSideUploadInput].files : this.$refs[this.rightSideUploadInput].files, isLeft)
    },
    isSide(file) {
      return /\.side$/.test(file.name)
    }
  }
}
</script>

<style lang="scss">
#SeleniumIdeUpdateSide {
  display: flex;
  justify-content: space-between;

  h1 {
    font-size: 2vw;
  }

  .drop {
    cursor: pointer;
    border: .2vw dashed #bbb;
    margin: 0 auto;
    font-size: 2vw;
    border-radius: 1vw;
    text-align: center;
    color: #bbb;

    button > span {
      pointer-events: none;
    }

    > div {
      min-height: 10vw;
      display: flex;
      user-select: none;
      flex-wrap: nowrap;
      justify-content: center;
      align-items: center;

      > i {
        font-size: 6vw
      }

      > button {
        font-size: 1.5vw;
        border-radius: .5vw;
        padding: .8vw;
        margin: 2vw;
      }
    }

    div.file_name > label > i {
      display: flex;
    }

    div.file_name > i::before, div.file_name > label > i::before {
      margin: auto;
      line-height: 0;
    }
  }

  .mouse-over {
    border-color: #1682e6;
  }

  #left {
    width: 49%;
  }

  #right {
    width: 49%;
  }

  ul {
    width: 90% !important;
    padding-inline-start: unset;

    li, li a {
      cursor: default;
    }

    li.triangle, li.triangle a {
      cursor: zoom-out;
    }

    li.inverse, li.inverse a {
      cursor: zoom-in;
    }

    li.triangle::before {
      content: "";
      display: inline-block;
      margin: auto 10px auto 10px;
      border-bottom: 15px solid #5f01d1;
      border-left: 10px solid transparent;
      border-right: 10px solid transparent;
    }

    li.inverse::before {
      border-top: 15px solid #5f01d1;
      border-bottom: 0;
    }

    li {
      display: flex;
      width: 100%;
      border: 1px solid #1f2d3d;

      > .file {
        width: 100%;
        padding-left: 10px;

        > .file_name {
          width: 100%;
          display: flex;

          .el-upload-list__item.is-success .el-upload-list__item-status-label {
            display: flex;
          }

          .el-upload-list__item.is-success:hover .el-upload-list__item-status-label {
            display: none;
          }

          .el-icon-close, .el-upload-list__item-status-label {
            position: unset;
            margin: auto 0 auto auto;
          }
        }

        > .file_info {
          text-align: left;
          margin-left: 5px;

          > .replaces {
            color: #E65D6E;
          }

          > .inserts {
            color: #2ac06d;
          }
        }
      }

      a, i {
        font-size: 1.5vw;
      }

      button.el-button {
        font-size: 1rem;
        height: fit-content;
        margin: auto 0;
        padding: .6rem;
      }
    }
  }

  .el-table {
    tr > th > .cell {
      font-size: 1.8vw;
      line-height: 2.2rem;
    }

    td {
      padding: 0;

      > .cell {
        padding: 0;

        > .td_layout {
          .el-checkbox {
            display: flex;
            padding: 12px;

            > .el-checkbox__input {
              margin: auto 0;

              > .el-checkbox__inner {
                width: 1.5rem;
                height: 1.5rem;
                border-radius: .1vw;
              }

              > .el-checkbox__inner::after {
                width: 35%;
                height: 70%;
                margin: auto;
                display: block;
                position: initial;
              }
            }

            > .el-checkbox__label {
              font-size: 1.5rem;
              white-space: normal;
              word-break: break-word;
            }
          }
        }
      }
    }
  }

  .right-side-upload-input, .left-side-upload-input {
    display: none;
    z-index: -9999;
  }
}
</style>
