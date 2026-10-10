import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
import GlobalPet from './components/GlobalPet.vue'
import ImageLightbox from './components/ImageLightbox.vue'
import MermaidDiagram from './components/MermaidDiagram.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('MermaidDiagram', MermaidDiagram)
  },
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'layout-bottom': () => [h(ImageLightbox), h(GlobalPet)],
    })
  },
}
