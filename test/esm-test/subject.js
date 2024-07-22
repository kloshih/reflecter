
import EventEmitter from 'events';
import fs from 'fs'

export default class Subject extends EventEmitter {

  constructor(name, limit=10) {
    super()
    this.name = name
    this.limit = limit
    this.count = 0
  }

  async calc() {
    const factor = 4; // @editme
    this.emit('calc', { name:this.name, factor, count:this.count++ })
    if (this.count >= this.limit)
      await this.stop()
  }

  async start() {
    if (!this.timer) {
      this.timer = setInterval(() => this.calc(), 2.5e3)
      this.timer.unref()
      this.emit('start')
    }
  }

  async stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
      this.emit('stop')
    }
  }
  
}

export class Opts {
  
}