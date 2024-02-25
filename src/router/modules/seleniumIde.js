import Layout from '@/layout'

const seleniumIdeRouter = {
  path: '/selenium-ide',
  component: Layout,
  redirect: '/selenium-ide/edit-test-plan',
  name: 'Selenium Ide',
  meta: {
    title: 'Selenium Ide',
    icon: 'selenium-ide64'
  },
  children: [
    {
      path: 'side-script-management',
      component: () => import('@/views/selenium_ide/side_script_management'),
      name: 'SideScriptManagement',
      meta: { title: 'Side Script Management' }
    }, {
      path: 'edit-test-plan',
      component: () => import('@/views/selenium_ide/edit_test_plan'),
      name: 'EditTestPlan',
      meta: { title: 'Edit Test Plan' }
      // redirect: '/nested/menu1/menu1-1',
      // children: [
      //   {
      //     path: 'menu1-1',
      //     component: () => import('@/views/nested/menu1/menu1-1'),
      //     name: 'Menu1-1',
      //     meta: { title: 'Menu 1-1' }
      //   }
      // ]
    }, {
      path: 'run-web-test',
      component: () => import('@/views/selenium_ide/run_web_test'),
      name: 'RunWebTest',
      meta: { title: 'Run Web Test' }
    }, {
      path: 'view-and-download',
      component: () => import('@/views/selenium_ide/view_and_download'),
      name: 'ViewAndDownload',
      meta: { title: 'View And Download' }
    // }, {
    //   path: 'simple-peer',
    //   component: () => import('@/views/selenium_ide/simple_peer'),
    //   name: 'SimplePeer',
    //   meta: { title: 'Simple Peer' }
    // }, {
    //   path: 'simple-peer-server',
    //   component: () => import('@/views/selenium_ide/simple_peer_server'),
    //   name: 'SimplePeerServer',
    //   meta: { title: 'Simple Peer Server' }
    // }, {
    //   path: 'simple-peer-client',
    //   component: () => import('@/views/selenium_ide/simple_peer_client'),
    //   name: 'SimplePeerClient',
    //   meta: { title: 'Simple Peer Client' }
    }, {
      path: 'update-side-script',
      component: () => import('@/views/selenium_ide/update_side_script'),
      name: 'UpdateSideScript',
      meta: { title: 'Update Side Script' }
    }
  ]
}

export default seleniumIdeRouter
