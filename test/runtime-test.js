/*
 * reflecter-test.js
 * 
 * Copyright (c) 2021-present Lo Shih
 */

const { expect } = require('chai')

const reflecter = require("..")

describe("Reflecter", () => {

  describe("Basics", () => {

    it("provides global instance", () => {
      expect(reflecter).to.be.an('object');
    })
    
    it("can introspect packages", () => {
      expect(reflecter).to.be.have.property('packages');
    })
    
    it("can introspect local packages", () => {
      // console.log(Object.keys(reflecter.locals));
      expect(reflecter).to.be.have.property('locals');
    })
    
    it("can introspect a Class[symReflect]", () => {
      const symReflect = Symbol.for('reflect')
      // console.log(Object.keys(reflecter.locals));
      const Reflecter = reflecter.constructor;
      expect(Reflecter[symReflect]).to.be.have.property('package');
      expect(Reflecter[symReflect]).to.be.have.property('module');
      expect(Reflecter[symReflect]).to.be.have.property('version');
    })
    
    it("can get a Class's package name and version", () => {
      const symReflect = Symbol.for('reflect')
      // console.log(Object.keys(reflecter.locals));
      const Reflecter = reflecter.constructor;
      expect(Reflecter[symReflect].package.info).to.be.have.property('name', 'reflecter');
      expect(Reflecter[symReflect].package.info).to.be.have.property('version');
    })

    // it("waits", function(done) {
    //   this.timeout(3600e3)
    //   reflecter.setReloadEnabled(true);
    //   setTimeout(done, 3600e3);
    // })
    
  })

})
