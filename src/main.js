import Vue from 'vue'

import Cookies from 'js-cookie'

import 'normalize.css/normalize.css' // a modern alternative to CSS resets

import Element from 'element-ui'
import './styles/element-variables.scss'
// import enLang from 'element-ui/lib/locale/lang/en'// 如果使用中文语言包请默认支持，无需额外引入，请删除该依赖

import '@/styles/index.scss' // global css

import App from './App'
import store from './store'
import router from './router'

import './icons' // icon
import './permission' // permission control
import './utils/error-log' // error log

import * as filters from './filters' // global filters
import { io } from 'socket.io-client'

import VueSweetalert2 from 'vue-sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'
import axios from 'axios'
import JSZip from 'jszip'
// import aside from 'element-ui/packages/aside'

/**
 * If you don't want to use mock-server
 * you want to use MockJs for mock api
 * you can execute: mockXHR()
 *
 * Currently MockJs will be used in the production environment,
 * please remove it before going online ! ! !
 */
if (process.env.NODE_ENV === 'production') {
  const { mockXHR } = require('../mock')
  mockXHR()
}

Vue.use(Element, {
  size: Cookies.get('size') || 'medium' // set element-ui default size
  // locale: enLang // 如果使用中文，无需设置，请删除
})

// register global utility filters
Object.keys(filters).forEach(key => {
  Vue.filter(key, filters[key])
})

Vue.prototype.$nowDatetimeFormat = () => {
  const _ = new Date()
  const datetimeFormat = [
    [_.getFullYear(), _.getMonth(), _.getDay()],
    [_.getHours(), _.getMinutes(), _.getSeconds()]
  ]
  return datetimeFormat.map(row => row.map(column => column.toString().padStart(2, '0')).join('-')).join('_')
  // return `${_.getFullYear()}-${_.getMonth().toString().padStart(2, '0')}-${_.getDay().toString().padStart(2, '0')}_${_.getHours().toString().padStart(2, '0')}-${_.getMinutes().toString().padStart(2, '0')}-${_.getSeconds().toString().padStart(2, '0')}`
}

// Vue.config.productionTip = false
Vue.prototype.$request = function(urlPath, data = undefined) {
  if (data === undefined) {
    return axios.get(`${this.$origin}${urlPath}`).then(
      response => {
        if (response.status !== 200) {
          this.$message.error(response.data)
          return undefined
        } else {
          return response.data
        }
      }
    ).catch(response => {
      this.$message.error(`取得${urlPath}失敗：${response.toString()}`)
    })
  } else {
    return axios.post(`${this.$origin}/${urlPath}`, data).then(
      response => {
        if (response.status !== 200) {
          this.$message.error(response.data)
          return undefined
        } else {
          return response.data
        }
      }
    ).catch(response => {
      this.$message.error(`取得${urlPath}失敗：${response.toString()}`)
    })
  }
}
Vue.prototype.$fetchFilename = (contentDisposition) => {
  let filename = /filename\*=UTF-8''(.+)/.exec(contentDisposition)
  if (!filename) {
    filename = /filename=(.+)/.exec(contentDisposition)
  }
  return decodeURIComponent(filename[1])
}
Vue.prototype.$deleteFiles = async function(urlPath, filenames) {
  if (Array.isArray(filenames) && filenames.length) {
    const result = await this.$swal.fire({
      title: '確定刪除檔案嗎?',
      html: `<p>你將要刪除以下的檔案</p>${filenames.map(filename => `<p>${filename}<\p>`).join('')}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: '確定, 刪除!',
      cancelButtonText: '取消'
    })
    if (result.isConfirmed) {
      for (const filename of filenames) {
        await axios.delete(`${this.$origin}${urlPath}/${filename}`).then(response => {
          if (response.status !== 200) {
            this.$message.error(`刪除失敗：${response.data}`)
          }
        })
      }
      return true
    }
  }
  return undefined
}
Vue.prototype.$downloadFileOrZip = async function(urls, zipFileName) {
  try {
    if (Array.isArray(urls) && urls.length) {
      if (urls.length === 1) {
        try {
          const response = await axios.get(`${this.$origin}${urls[0]}`, { responseType: 'blob' })
          const link = document.createElement('a')
          link.href = URL.createObjectURL(new Blob([response.data]))
          link.download = this.$fetchFilename(response.headers['content-disposition'])
          link.click()
        } catch (error) {
          this.$message.error(`下載失敗:${error}`)
        }
      } else {
        const zip = new JSZip()
        for (const url of urls) {
          const response = await axios.get(`${this.$origin}${url}`, { responseType: 'blob' })
          zip.file(this.$fetchFilename(response.headers['content-disposition']), response.data)
        }
        try {
          const content = await zip.generateAsync({ type: 'blob' })
          const link = document.createElement('a')
          link.href = URL.createObjectURL(content)
          link.download = zipFileName
          link.click()
        } catch (error) {
          this.$message.error(`壓縮失敗:${error}`)
        }
      }
    }
  } catch (error) {
    console.log(error)
    this.$message.error(`${error}`)
  }
}

class EnumItem {
  constructor(name, value) {
    this.name = name
    this.value = value
    Object.freeze(this)
  }

  get route() {
    return `/${this.name.match(/[A-Z]*[a-z]*/g).filter(_ => _ !== '').join('-').toLowerCase()}`
  }
}

class Enum {
  constructor(objects) {
    let number = 0
    if (Array.isArray(objects)) {
      objects.forEach(object => {
        const name = object
        this[name] = new EnumItem(name, ++number)
      })
    } else if (typeof objects === 'object' && objects !== null) {
      Object.entries(objects).forEach(([key, value]) => {
        const name = key
        this[name] = new EnumItem(name, value === auto ? ++number : value)
      })
    } else {
      throw new Error('input must array or key-value')
    }
    Object.freeze(this)
  }
}

function auto() {
  return auto
}

// Vue.prototype.$origin = Object.freeze(document.location.origin)
Vue.prototype.$origin = Object.freeze('http://127.0.0.1:9527')
Vue.prototype.$socket = io(Vue.prototype.$origin)
Vue.prototype.$serverRoute = {
  DISK_USAGE: auto(),
  // side_script_management_api
  CURRENT_ALL_SIDE: auto(),
  UPLOAD_SIDE_FILES: auto(),
  DOWNLOAD_SIDE_FILE: auto(),
  DELETE_SIDE_FILES: auto(),
  // edit_sides_api
  ALL_SCRIPT: auto(),
  REWRITE_ALL_SCRIPT: auto(),
  // run_tests_api
  TEST_RESET: auto(),
  TEST_STATUS: auto(),
  TEST_CASES: auto(),
  START_TEST_CASES: auto(),
  STOP_TEST_CASES: auto(),
  SHOW_FOLDER_FILES: auto(),
  UPLOAD_FILES_FOR_TEST: auto(),
  // view_and_download_api
  REPORT_HISTORY: auto(),
  VIEW_ALLURE: auto(),
  DELETE_ALLURES: auto(),
  DOWNLOAD_ALLURE: auto(),
  TEST_CASE_VIDEO: auto(),
  TEST_CASES_VIDEO: auto(),
  TEST_CASE_SUBTITLE: auto(),
  TEST_CASE_MERGE_VIDEO_SUBTITLE: auto()
}
Vue.prototype.$serverRoute = new Enum(Vue.prototype.$serverRoute)

Vue.prototype.$socketClientOn = {
  SERVER_EMIT_RESET: auto(),
  SERVER_EMIT_TEST_STATUS: auto(),
  SERVER_EMIT_TEST_SCREENSHOT: auto(),
  SERVER_EMIT_TEST_PLAN_CHANGE: auto(),
  SERVER_EMIT_SIDE_FILES_CHANGE: auto(),
  SERVER_EMIT_TEST_RESULT_CHANGE: auto(),
  SERVER_EMIT_SPEED_TIME: auto(),
  SERVER_EMIT_VARIABLE_CHANGE: auto()
}
Vue.prototype.$socketClientOn = new Enum(Vue.prototype.$socketClientOn)

Vue.prototype.$socketClientEmit = {
  JOIN_ROOM: auto(),
  LEAVE_ROOM: auto(),
  SERVER_ON_SPEED_TIME: auto(),
  SERVER_ON_VARIABLE_CHANGE: auto()
}
Vue.prototype.$socketClientEmit = new Enum(Vue.prototype.$socketClientEmit)

Vue.use(VueSweetalert2)

new Vue({
  el: '#app',
  router,
  store,
  render: h => h(App)
})
