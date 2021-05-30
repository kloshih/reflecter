/*
 * index.js
 * 
 * Copyright (c) 2021-present Lo Shih
 */

const Runtime = require("./runtime");

/* Using a global runtime allows us to detach from multiple loading versions of 
 * the runtime. This is the best way to go for singletons, since class 
 * definition is fluid. */
const kRuntime = Symbol('kRuntime');
const runtime = global[kRuntime] || (global[kRuntime] = new Runtime());

runtime.Runtime = Runtime;
module.exports = runtime;
