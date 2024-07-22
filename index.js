/*
 * index.js
 * 
 * Copyright (c) 2021-present Lo Shih
 */

const { 
    Reflecter,
    Package,
    Module,
    symReflect,
} = require("./reflecter");

/* Using a global reflecter allows us to detach from multiple loading 
 * versions of the reflecter. This is the best way to go for singletons, 
 * since class definition is fluid. */
// const kReflecter = Symbol('kReflecter');
// const symReflect = Reflecter.symReflect
const reflecter = global[symReflect] ||= new Reflecter();

reflecter.Reflecter = Reflecter;

module.exports = {
    reflecter,
    Reflecter,
    Package,
    Module,
    symReflect,
}
// { 
//   default: reflecter,
//   reflecter,
// }
