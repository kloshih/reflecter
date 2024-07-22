
// const { expect } = require('chai');
import { assert, expect } from 'chai'

import { reflecter } from '../index.js'
import Subject from './esm-test/subject.js'

reflecter.setReloadEnabled(true)

describe("Reflecter", function () {
  this.timeout(2*3600e3)

  describe("Basic functionality", () => {

    it("can work with ESM modules", function (done) {
      this.timeout(2*3600e3)
      // expect(Subject).to.be.an('function');

      const subject = new Subject('test', 1e3);
      subject.on('stop', () => done());
      subject.on('calc', (res) => {
        console.log('calc', res)
      });

      subject.start();

      // done()
    })

  })

})