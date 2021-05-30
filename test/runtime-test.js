/*
 * runtime-test.js
 * 
 * Copyright (c) 2021-present Lo Shih
 */

const { expect } = require('chai')

const runtime = require("..")

describe("Runtime", () => {

  describe("Basics", () => {

    it("provides global instance", () => {
      expect(runtime).to.be.an('object');
    })
    
    it("can introspect packages", () => {
      expect(runtime).to.be.have.property('packages');
    })
    
    it("can introspect local packages", () => {
      // console.log(Object.keys(runtime.locals));
      expect(runtime).to.be.have.property('locals');
    })
    
    it("can introspect a Class.$runtime", () => {
      // console.log(Object.keys(runtime.locals));
      const Runtime = runtime.constructor;
      expect(Runtime.$runtime).to.be.have.property('package');
      expect(Runtime.$runtime).to.be.have.property('module');
      expect(Runtime.$runtime).to.be.have.property('version');
    })
    
    it("can get a Class's package name and version", () => {
      // console.log(Object.keys(runtime.locals));
      const Runtime = runtime.constructor;
      expect(Runtime.$runtime.package.info).to.be.have.property('name', 'reflecter');
      expect(Runtime.$runtime.package.info).to.be.have.property('version');
    })

    // it("waits", (done) => {
    //   runtime.setReloadEnabled(true);
    //   setTimeout(done, 3600e3);
    // })
    
  })

})
