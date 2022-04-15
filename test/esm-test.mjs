
// const { expect } = require('chai');
import { assert, expect } from 'chai'

import runtime from '../index.js'
import Subject from './esm-test/subject.js'

runtime.setReloadEnabled(true)

describe("Runtime", () => {

  describe("Basic functionality", () => {

    it("can do something", (done) => {
      // expect(Subject).to.be.an('function');

      const subject = new Subject('test');
      subject.on('stop', () => done());
      subject.on('calc', (res) => {
        console.log('calc', res)
      });

      subject.start();

      // done()
    })

  })

})