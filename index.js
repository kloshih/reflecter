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
// const reflecterGlobal = global[symReflect] ||= new Reflecter();


/** 
 * @type {Reflecter & {
 *   Reflecter: typeof Reflecter,
 *   Package: typeof Package,
 *   Module: typeof Module,
 *   symReflect: typeof symReflect,
 * }} 
 */
export const reflecter = Object.assign(
    global[symReflect] ||= new Reflecter(),
    {
        Reflecter,
        Package,
        Module,
        symReflect,
    }
)

// reflecterGlobal.Reflecter = Reflecter;

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
