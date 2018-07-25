'use strict'

class Authenticated {
  async handle ({ request }, next) {
    // call next to advance the request
    await next()
  }
}

module.exports = Authenticated
