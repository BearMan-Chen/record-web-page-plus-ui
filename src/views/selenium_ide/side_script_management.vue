<template>
  <div id="side_management" class="app-container">
    <div id="up">
      <input ref="sideUploadInput" class="sideUploadInput" type="file" accept=".side" multiple @change="inputChange">
      <div
        class="drop"
        :class="over"
        @drop.prevent="handleDrop"
        @dragover="dragOver"
        @dragleave="handleLeave"
        @mouseover="handleOver"
        @mouseleave="handleLeave"
        @click="$refs.sideUploadInput.click()"
      >
        <i class="el-icon-upload" />
        Drop Side files here or click
        <el-button type="primary">
          Select
        </el-button>
      </div>
      <ul>
        <li v-for="file in files" :key="file.name" class="el-upload-list__item is-success" style="list-style: none;">
          <a class="el-upload-list__item-name" style="color: #1890ff"><i class="el-icon-document" />{{ file.name }}
            <i v-if="Object.keys(currentAllSide).includes(file.name)"> (已存在的檔案，上傳將覆蓋。)</i>
          </a>
          <label class="el-upload-list__item-status-label">
            <i class="el-icon-upload-success el-icon-circle-check" />
          </label>
          <i class="el-icon-close" @click="rmUpload(file)" />
        </li>
      </ul>
    </div>
    <el-button type="primary" :disabled="!files.length" @click="handleUpload">
      上傳
    </el-button>
    <hr>
    <div id="down">
      <div>
        <el-button type="primary" :disabled="!Object.values(currentAllSide).some(value => value===true)" @click="addAllSide">全部移入刪除區</el-button>
        <h1>已存在的檔案</h1>
        <ul>
          <template v-for="(status, side) in currentAllSide">
            <li v-if="status === true" :key="side" class="el-upload-list__item is-success">
              <el-button type="success" @click="downloadFile(side)">下載</el-button>
              <a class="el-upload-list__item-name"><i class="el-icon-document" />{{ side }}</a>
              <label class="el-upload-list__item-status-label">
                <i class="el-icon-upload-success el-icon-circle-check" />
              </label>
              <i class="el-icon-close" @click="rmSide(side)" />
            </li>
          </template>
        </ul>
      </div>
      <div>
        <el-button type="primary" :disabled="!Object.values(currentAllSide).some(value => value===false)" @click="rmAllSide">全部移出刪除區</el-button>
        <h1>將刪除檔案</h1>
        <ul>
          <template v-for="(status, side) in currentAllSide">
            <li v-if="status === false" :key="side" class="el-upload-list__item is-success">
              <a class="el-upload-list__item-name"><i class="el-icon-document" />{{ side }}</a>
              <label class="el-upload-list__item-status-label">
                <i class="el-icon-upload-success el-icon-circle-check" />
              </label>
              <i class="el-icon-close" @click="addSide(side)" />
            </li>
          </template>
        </ul>
      </div>
    </div>
    <el-button type="danger" :disabled="!Object.values(currentAllSide).some(x => x === false)" @click="handleDelete">
      刪除選擇的腳本(.side)
    </el-button>
  </div>
</template>

<script>
export default {
  name: 'SeleniumIdeUpload',
  data() {
    return {
      files: [],
      currentAllSide: {},
      over: ''
    }
  },
  created() {
    this.fetchAllSide()
  },
  methods: {
    downloadFile(fileName) {
      window.open(`${this.$origin}${this.$serverRoute.DOWNLOAD_SIDE_FILE.route}/${fileName}`)
    },
    rmUpload(file) {
      this.files.splice(this.files.indexOf(file), 1)
    },
    addAllSide() {
      Object.entries(this.currentAllSide).forEach(([side, status]) => {
        if (status === true) {
          this.currentAllSide[side] = false
        }
      })
    },
    rmAllSide() {
      Object.entries(this.currentAllSide).forEach(([side, status]) => {
        if (status === false) {
          this.currentAllSide[side] = true
        }
      })
    },
    addSide(side) {
      this.currentAllSide[side] = true
    },
    rmSide(side) {
      this.currentAllSide[side] = false
    },
    handleFiles(files) {
      const errorType = []
      const tempFileName = this.files.map(file => {
        return file.name
      })
      files.forEach(file => {
        if (this.isSide(file)) {
          if (!tempFileName.includes(file.name)) {
            this.files.push(file)
            tempFileName.push(file.name)
          }
        } else {
          errorType.push(file.name)
        }
      })
      if (errorType.length) {
        this.$message.error(`This type not is .side (${errorType.join(', ')})`)
      }
      this.$refs.sideUploadInput.value = null
      this.over = ''
    },
    handleDrop(e) {
      e.stopPropagation()
      e.preventDefault()
      this.handleFiles(e.dataTransfer.files)
    },
    dragOver(e) {
      e.stopPropagation()
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
      this.handleOver()
    },
    handleOver() {
      this.over = 'mouse-over'
    },
    handleLeave() {
      this.over = ''
    },
    inputChange() {
      this.handleFiles(this.$refs.sideUploadInput.files)
    },
    async fetchAllSide() {
      this.currentAllSide = await this.$request(this.$serverRoute.CURRENT_ALL_SIDE.route)
    },
    async handleUpload() {
      if (this.files.length) {
        const formData = new FormData()
        this.files.forEach(file => {
          formData.append(file.name, file)
        })
        const result = await this.$request(this.$serverRoute.UPLOAD_SIDE_FILES.route, formData)
        if (result) {
          this.currentAllSide = result
          this.$message.info('上傳完成')
          this.files = []
        }
      }
    },
    async handleDelete() {
      const result = await this.$deleteFiles(this.$serverRoute.DELETE_SIDE_FILES.route, Object.entries(this.currentAllSide).filter(row => row[1] === false).map(row => row[0]))
      if (result) {
        this.currentAllSide = result
      }
    },
    isSide(file) {
      return /\.side$/.test(file.name)
    }
  }
}
</script>

<style lang="scss" scoped>
#side_management {
  margin: 0 2vw;

  > #up {
    > .sideUploadInput {
      display: none;
      z-index: -9999;
    }

    > .drop {
      cursor: pointer;
      border: .2vw dashed #bbb;
      width: 50vw;
      height: 10vw;
      margin: 0 auto;
      font-size: 2vw;
      border-radius: 1vw;
      text-align: center;
      color: #bbb;
      user-select: none;
      display: flex;
      flex-wrap: nowrap;
      justify-content: center;
      align-items: center;

      > i {
        font-size: 6vw
      }

      > button {
        margin: 2vw;
      }
    }

    > .mouse-over {
      border-color: #1682e6;
    }

    > ul {
      width: 47%;
      user-select: none;
      padding-inline-start: unset;

      > li {
        display: flex;
        align-items: center;
        list-style: none;

        > button {
          width: fit-content;
          height: fit-content;
          padding: .3vw;
          border-radius: .2vw;
          font-size: 1.3vw;
          font-weight: 600;
        }

        a {
          margin-right: 1vw;
          font-size: 1.5vw;
          cursor: default !important;
        }

        > label {
          display: flex;
          align-items: center;
          height: 100%;
        }

        > i {
          display: none;
          height: 100%;
          top: 0;
        }

        i {
          font-size: 1.5vw;
        }
      }

      > li:hover {
        > label {
          display: none;
        }

        > i {
          display: flex;
          align-items: center;
        }
      }
    }
  }

  > #down {
    display: flex;
    width: 100%;

    > div {
      width: 46vw;

      > h1 {
        font-size: 2vw;
      }

      > ul {
        width: 95%;
        user-select: none;
        padding-inline-start: unset;

        > li {
          display: flex;
          align-items: center;
          list-style: none;

          > button {
            width: fit-content;
            height: fit-content;
            padding: .3vw;
            border-radius: .2vw;
            font-size: 1.3vw;
            font-weight: 600;
          }

          a {
            margin-right: 1vw;
            font-size: 1.5vw;
            cursor: default !important;
          }

          > label {
            display: flex;
            align-items: center;
            height: 100%;
          }

          > i {
            display: none;
            height: 100%;
            top: 0;
          }

          i {
            font-size: 1.5vw;
          }
        }

        > li:hover {
          > label {
            display: none;
          }

          > i {
            display: flex;
            align-items: center;
          }
        }
      }
    }

    > div:first-child a {
      color: #28c228;
    }

    > div:last-child a {
      color: #c22828;
    }
  }

  > button, #up > .drop > button, #down > div > button {
    font-size: 1.5vw;
    border-radius: .5vw;
    padding: .8vw;
  }

  hr {
    margin-block: 1vw;
    border-width: .11vw;
    margin-inline: .1vw;
  }
}
</style>
