import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
import DocHeader from './components/DocHeader.vue'
import GlobalPet from './components/GlobalPet.vue'
import ImageLightbox from './components/ImageLightbox.vue'
import HomePage from './components/home/HomePage.vue'
import MermaidDiagram from './components/MermaidDiagram.vue'
import TopicDirectory from './components/TopicDirectory.vue'
import './style.css'
import './reading.css'
import './showcase.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('HomePage', HomePage)
    app.component('MermaidDiagram', MermaidDiagram)
    app.component('TopicDirectory', TopicDirectory)
  },
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'doc-before': () => h(DocHeader),
      'doc-footer-before': () => h(DocHeader, { place: 'bottom' }),
      'layout-bottom': () => [h(ImageLightbox), h(GlobalPet)],
    })
  },
}
