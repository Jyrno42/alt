import React from 'react'

import ReactDOM from 'react-dom'
import ReactDOMServer from 'react-dom/server'

import { assign } from './functions'


export function withData(fetch, MaybeComponent, extraContextTypes) {
  function bind(Component) {
    return React.createClass({
      contextTypes: assign({
        buffer: React.PropTypes.object.isRequired
      }, extraContextTypes || {}),

      childContextTypes: {
        buffer: React.PropTypes.object.isRequired
      },

      getChildContext() {
        return { buffer: this.context.buffer }
      },

      componentWillMount() {
        if (!this.context.buffer.locked) {
          this.context.buffer.push(
            fetch(this.props, this.context)
          )
        }
      },

      render() {
        return React.createElement(Component, this.props)
      }
    })
  }

  // works as a decorator or as a function
  return MaybeComponent ? bind(MaybeComponent) : Component => bind(Component)
}

function call(f) {
  if (typeof f === 'function') f()
}

function usingDispatchBuffer(buffer, Component) {
  return React.createClass({
    childContextTypes: {
      buffer: React.PropTypes.object.isRequired
    },

    getChildContext() {
      return { buffer }
    },

    render() {
      return React.createElement(Component, this.props)
    }
  })
}

export class DispatchBuffer {
  constructor(renderStrategy) {
    this.promisesBuffer = []
    this.locked = false
    this.renderStrategy = renderStrategy
  }

  push(v) {
    this.promisesBuffer.push(v)
  }

  fill(Element) {
    return this.renderStrategy(Element)
  }

  clear() {
    this.promisesBuffer = []
  }

  flush(Element) {
    return Promise.all(this.promisesBuffer).then((data) => {
      // fire off all the actions synchronously
      data.forEach((f) => {
        if (Array.isArray(f)) {
          f.forEach(call)
        } else {
          call(f)
        }
      })
      this.locked = true

      return {
        html: this.renderStrategy(Element),
        element: Element
      }
    }).catch((err) => {
      return Promise.reject({
        err,
        element: Element
      })
    })
  }
}


function getRenderModule() {
  if (typeof window === 'undefined') {
    return ReactDOMServer
  } else {
    return ReactDOM
  }
}


function renderWithStrategy(strategy) {
  return (Component, props) => {
    // create a buffer and use context to pass it through to the components
    const buffer = new DispatchBuffer((Node) => {
      return getRenderModule()[strategy](Node)
    })
    const Container = usingDispatchBuffer(buffer, Component)

    // cache the element
    const Element = React.createElement(Container, props)

    // render so we kick things off and get the props
    buffer.fill(Element)

    // flush out the results in the buffer synchronously setting the store
    // state and returning the markup
    return buffer.flush(Element)
  }
}

export function toDOM(Component, props, documentNode, shouldLock) {
  const buffer = new DispatchBuffer()
  buffer.locked = !!shouldLock
  const Node = usingDispatchBuffer(buffer, Component)
  const Element = React.createElement(Node, props)
  buffer.clear()
  return getRenderModule().render(Element, documentNode)
}

export const toStaticMarkup = renderWithStrategy('renderToStaticMarkup')
export const toString = renderWithStrategy('renderToString')
