import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
import GlobalPet from './components/GlobalPet.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'layout-bottom': () => h(GlobalPet),
    })
  },
}
