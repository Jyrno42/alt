import React from 'react'

import Alt from '../'
import AltContainer from '../AltContainer.js'
import AltIso from '../utils/AltIso'
import { assert } from 'chai'


const alt = new Alt()

const CurrentUserActions = alt.generateActions('receivedCurrentUser', 'failedCurrentUser')

const CurrentUserSource = {
  getCurrentUser() {
    return {
      remote(state, id) {
        return new Promise((resolve, reject) => {
          if (id === 1) {
            reject('fail')
          } else if (id === 2) {
            throw new Error('fail')
          } else {
            setTimeout(() => resolve({email: 'r@r.ee', name: 'John Smith', is_staff: true}), 5)
          }
        })
      },
      success: CurrentUserActions.receivedCurrentUser,
      error: CurrentUserActions.failedCurrentUser
    }
  },

  getFailingCurrentUser() {
    return {
      remote() {
        return new Promise((resolve) => {
          setTimeout(() => resolve({email: 'r@r.ee', name: 'John Smith', is_staff: true}), 5)
        })
      },
      success: CurrentUserActions.throwingReceivedCurrentUser,
      error: CurrentUserActions.failedCurrentUser
    }
  }
}


class CurrentUserStore {
  constructor() {
    this.exportAsync(CurrentUserSource)
    this.bindActions(CurrentUserActions)
  }

  receivedCurrentUser(user) {
    this.isAuthenticated = true
    this.profile = user
  }

  failedCurrentUser() {
    this.isAuthenticated = false
    this.profile = {}
  }

  throwingReceivedCurrentUser(user) {
    throw new Error('failed')
  }
}

const userStore = alt.createStore(CurrentUserStore, 'CurrentUserStore')


const User = AltIso.define((props) => {
  return userStore.getCurrentUser(props.id)
}, class b extends React.Component {
  render() {
    return (
      <AltContainer store={userStore} render={props => {
        let loginState = (props.isAuthenticated === true ? 'true' : props.isAuthenticated === false ? 'false' : 'null')
        let profileName = props.profile && props.profile.name || ''

        return (
          <div>
            <span>{`login:${loginState}`}</span>
            <span>{`name:${profileName}`}</span>
            </div>
        )
      }} />
    )
  }
})

export default {
  'DataSource failures work as expected': {
    beforeEach() {
      alt.recycle()
    },

    'remote reject causes DataStore.error action to be called'(done) {
      AltIso.render(alt, User, {id: 1}).then((markup) => {
        assert(markup.html.indexOf('login:false') !== -1)
        done()
      })
    },

    'remote throw causes DataStore.error action to be called'(done) {
      AltIso.render(alt, User, {id: 2}).then((markup) => {
        assert(markup.html.indexOf('login:false') !== -1)
        done()
      })
    },

    'DataStore.success action gets called'(done) {
      AltIso.render(alt, User, {id: 3}).then((markup) => {
        assert(markup.html.indexOf('login:true') !== -1, 'Login state is not true')
        assert(markup.html.indexOf('name:John Smith') !== -1, 'Name is not John Smith')
        done()
      })
    },

    'markup is empty when action success handler throws'(done) {
      const User = AltIso.define((props) => {
        return userStore.getFailingCurrentUser(props.id)
      }, class b extends React.Component {
        render() {
          return (
            <AltContainer
              store={userStore}
              render={props => <div>RENDERED</div>}
            />
          )
        }
      })

      AltIso.render(alt, User).then((markup) => {
        assert(markup.html.indexOf('RENDERED') === -1, 'Markup was not empty')
        done()
      }).catch(err => done(err))
    },
  }
}
