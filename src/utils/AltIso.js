import Iso from 'iso'
import * as Render from './Render'


// Extra context types to add to withData HOC
let extraContextTypes = {}

export default {
  define(fetch, MaybeComponent) {
    // Also send extraContextTypes as the third argument
    return Render.withData(fetch, MaybeComponent, extraContextTypes)
  },

  setExtraContextTypes(extra) {
    extraContextTypes = extra
  },

  render(alt, Component, props) {
    // recycle state
    alt.recycle()

    if (typeof window === 'undefined') {
      alt.buffer = true
      return Render.toString(Component, props).then((obj) => {
        return {
          html: Iso.render(obj.html, alt.takeSnapshot(), { iso: 1 })
        }
      }).catch((err) => {
        // return the empty markup in html when there's an error
        return {
          err,
          html: Iso.render()
        }
      })
    } else {
      return Promise.resolve(
        Iso.bootstrap((state, meta, node) => {
          alt.bootstrap(state)
          Render.toDOM(Component, props, node, meta.iso)
        })
      )
    }
  }
}
