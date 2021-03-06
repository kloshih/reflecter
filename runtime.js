/*
 * runtime.js
 * 
 * Copyright (c) 2021-present Lo Shih
 */

const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');
const Module_ = require('module')

/**
 * The Runtime class provides the following features:
 * 
 * - All required packages and modules are tracked
 * - Watches local projects for changes
 * - Automatically reloads type classes on file changes 
 * - Annotates type classes with package and versions
 *     Class.$runtime == { module:Module, package:Package, version:0 }
 */
class Runtime extends EventEmitter {

  constructor() {
    super();
    this.packages = {};
    this.modules = {};
    this.locals = {};
    this.main = null;
    this.reloadEnabled = process.env.RELOAD_ENABLED != null;
    this.quiet = process.env.RELOAD_ENABLED == 'quiet';
    this.pending = true;
    this.sync();
    delete(this.pending);
    // sync() require.cache every 5 seconds, for new requires
    this.timer = setInterval(() => this.sync(), 5e3);
    this.timer.unref()
  }

  sync() {
    try {
      /* Loop through the cache */
      // let time = process.hrtime();
      let added;
      const cache = require.cache;
      for (let file in cache) {
        if (this.modules[file]) continue;
        let module = cache[file], match;
        if (match = file.match(/^((\/.*?)\/node_modules\/[^\/]+)\/(.*)$/)) {
          /* If this is inside a to p/node_modules dir, then register both */
          let parent = this.package(match[2]);
          let child = this.package(match[1]);
          parent.dependency(child);
          if (!match[3].includes('/node_modules/')) {
            this.modules[file] = child.module(module);
          }
        } else {
          /* Otherwise, there's no node_modules, so this is a local pkg */
          for (let c = path.dirname(file); c != '/'; c = path.dirname(c)) {
            let parent = this.packages[c];
            if (!parent) {
              if (!fs.existsSync(path.join(c, 'package.json')))
                continue;
              parent = this.package(c);
            }
            this.modules[file] = parent.module({ file, exports:module.exports })
            break;
          }
        }
        /* Track for emit */
        if (this.modules[file]) 
          (added || (added = [])).push(this.modules[file]);
      }
      /* Resolve the main */
      if (!this.main) {
        this.main = this.module(require.main.filename);
      }

      if (added)
        if (!this.pending) this.emit('updated', added);
      // time = process.hrtime(time);
      // time = time[0]*1e3 + time[1]/1e6;
      // console.log(`Runtime: synced in ${time.toFixed(3)}ms`);

    } catch (error) {
      if (!this.quiet) console.log(error.stack)
    }
  }
  
  package(pkg) {
    switch (_typeof(pkg)) {
      case 'object':
        const cls = mod.constructor;
        return cls && cls.$runtime && cls.$runtime.package;

      case 'class':
        return mod.$runtime && mod.$runtime.package;

      case 'string':
        let pack;
        for (let dir = pkg, last; dir != last ; dir = path.dirname(dir)) {
          if (pack = this.packages[dir]) {
            break;
          } else if (fs.existsSync(path.join(dir, 'package.json'))) {
            pkg = dir;
            break;
          }
          last = dir;
        }

        if (!pack) {
          /* Search for the package.json */
          pack = this.packages[pkg] = new Package(pkg, this)
          if (!pkg.includes('/node_modules/')) {
            this.locals[pkg] = pack;
            if (this.reloadEnabled)
              pack.attach();
          }
          if (!this.pending)
            this.emit('package', pkg, pack);
        }
        return pack;
    }
  }
  
  module(mod) {
    switch (_typeof(mod)) {
      case 'object':
        const cls = mod.constructor;
        return cls && cls.$runtime && cls.$runtime.module;
      case 'class':
        return mod.$runtime && mod.$runtime.module;
      case 'string':
        let module = this.modules[mod];
        return module;
    }
  }

  get isReloadEnabled() {
    return this.reloadEnabled;
  }

  /**
   * Sets whether the runtime will reload 
   * @param {boolean} enabled `true` to enable reloading
   */
  setReloadEnabled(enabled) {
    if (this.reloadEnabled != enabled) {
      this.reloadEnabled = enabled;
      if (this.reloadEnabled) {
        for (let pack of Object.values(this.locals))
          pack.attach();
      } else {
        for (let pack of Object.values(this.locals))
          pack.detach();
      }
    }
  }
  
}
module.exports = Runtime;

/**
 * The Package represents 
 */
class Package {

  constructor(dir, runtime) {
    this.runtime = runtime;
    this.dir = dir;
    this.name = path.basename(dir);
    const infopath = path.join(this.dir, 'package.json');
    try {
      this.info = require(infopath);
      this.name = this.info.name;
      this.version = this.info.version;
    } catch (error) {
      // console.log("Failed to require: " + infopath);
    }
    this.modules = {};
    this.dependencies = {};
  }

  /* Assigns dependent packages */
  dependency(pack) {
    let dependency = this.dependencies[pack.name];
    if (!dependency) {
      dependency = this.dependencies[pack.name] = pack;
    } else if (dependency !== pack) {
      throw new Error("IMPL: multiple dependencies");
    }
    return dependency;
  }

  module({ file, exports }) {
    if (!file.startsWith(this.dir))
      throw new Error("IMPL")
    let subfile = file.substring(this.dir.length + 1);
    let module = this.modules[subfile];
    if (!module) {
      module = this.modules[subfile] = new Module({ file, exports }, this);
      this.runtime.modules[file] = module;
      if (!this.runtime.pending)
        this.runtime.emit('module', file, module);
    }
    return module;
  }

  providers(name) {
    if (!this.info) return {};
    const types = this.info.providers;
    if (!types) return {};
    return types[name] || {};
  }

  attach() {
    if (this.watcher)
      throw new Error("IMPL: already attached")
    console.log("Runtime attach: watching: " + this.dir);
    const self = this;
    this.watcher = fs.watch(this.dir, { recursive:true, persistent:false, encoding:'utf8' }, function(e, f) {
      if (self.watcher !== this)
        throw new Error("IMPL: watcher?");
      self.fileChanged(e, f, this)
    });
    this.watcher.on('close', () => {
      if (!this.runtime.quiet) console.log("fileChanged: closed");
    })
    this.watcher.on('error', (error) => {
      if (!this.runtime.quiet) console.log("fileChanged: error", error);
    })
    if (!this.runtime.pending)
      this.runtime.emit('watching', this.dir, this);
  }

  detach() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      if (!this.runtime.pending)
        this.runtime.emit('unwatched', this.dir, this);
    }
  }

  async fileChanged(event, filename) {
    try {
      // console.log(new Date().toISOString() + ": fileChanged: event=" + event + ", file=" + filename);
      const file = path.join(this.dir, filename);
      const extname = path.extname(file);
      let module = this.runtime.module(file);

      if (!module && moduleExts.includes(extname)) {
        /* If we don't already have this module when file changed, either:
         * 1. It hasn't been sync()'d yet (unlikely)
         * 2. It is not a module and isn't in require.cache (commonjs)
         * 3. It is an ES module and isn't in require.cache. 
         * To check whether it is an ES module, import the file (cached). If
         * it has a module definition, then 
         */
        try {
          const exports = await import(file);
          console.log(`reflecter:Module.fileChanged(): found exports`, exports)
          module = this.module({ file, exports })
          module.stat = null;
        } catch (err) {
          debugger;
          console.log(`reflecter:Module.fileChanged(): failed to import '${file}': ${err.stack}`)
        }
      }
      switch (event) {
        case 'change':
          if (module)
            await module.reload();
          break;
        case 'rename': // or delete
          if (module)
            module.renamed = true;
          break;
        default:
          if (!this.runtime.quiet) console.log("Unsupported change type");
      }
    } catch (error) {
      if (!this.runtime.quiet) console.log("Runtime: IMPL error: ", error.stack);
    }
  }

}
Runtime.Package = Package;

/**
 * The Runtime.Model 
 */
class Module {

  /**
   * 
   * @param {{file: string, exports: any}} module The 
   * @param {*} pack 
   */
  constructor({ file, exports }, pack) {
    this.package = pack;
    this.file = file;
    this.exports = exports;
    this.type = require.cache[this.file] ? 'commonjs' : 'module';
    this.stat = fs.statSync(this.file);
    this.version = 0;
    this.types = Module.exportedTypes(exports);
    for (let key in this.types) {
      Object.defineProperty(this.types[key], '$runtime', { value:{module:this, package:this.package, version:0}, enumerable:false, writable:false, configurable:true });
    }
    this.generations = [];
  }

  /**
   * Reloads this module and redefines symbols as needed, writing previous 
   * definitions based on
   */
  async reload() {
    /* To prevent from double-loading, check to see if mtime is too 
     * short */
    const oldStat = this.stat;
    this.stat = fs.statSync(this.file);
    const age = this.stat.mtimeMs - (oldStat ? oldStat.mtimeMs : 0);
    if (age == 0)
      return;

    /* Don't reload files that have no types defined. */
    if (Object.keys(this.types).length == 0) {
      if (!this.package.runtime.quiet) console.log(`Reflecter: package '${this.package.name}' not reloading, no types in module '${this.file}'`);
      return;
    }
    // console.log(`  - ${this.stat.mtimeMs - oldStat.mtimeMs}ms ago`);

    /* Record the previous generation */
    this.generations.push(this.types);

    /* Reload the module and capture the new types */
    // retry: for (let ttl = 3; ttl >= 0; ttl--) {
      try {
        switch (this.type) {
          case 'commonjs':
            delete(require.cache[this.file]);
            this.exports = await import(this.file)
            this.module = require.cache[this.file]
            break;
          case 'module':
            const id = this.stat.mtimeMs;
            this.exports = await import(this.file + `?${id}`)
            break;
        }
      } catch (err) {
        switch (err.code) {
          case 'ERR_UNKNOWN_FILE_EXTENSION':
            this.exports = this.recompile();
            break;
            // if (path.extname(this.file) == '.ts') {
            //   try {
            //     /* Ensure that ts-node/register is here to compile .ts */
            //     this.require || (this.require = createRequire(this.file));
            //     const tsnode = this.require('ts-node');
            //     tsnode.register();
            //     break;
            //   } catch (err) {
            //     console.log(`Reflecter: failed to load file with Typescript: ${this.file}: ${err.stack}`)
            //     break retry;
            //   }
            // }
            /* fall through */
          default:
            console.log(`Reflecter: failed to load file: ${this.file}: ${err.stack}`)
            return;
            // break retry;
        }
      }
    // }
// delete(require.cache[this.file]);
    // const exports = await import(this.file);
    // this.module = require.cache[this.file];
    const newTypes = this.types = Module.exportedTypes(this.exports);

    for (let key in this.types) {
      Object.defineProperty(this.types[key], '$runtime', { value:{module:this, package:this.package, version:0}, enumerable:false, writable:false, configurable:true });
    }

    /* Each previous generation needs to be rewritten to be identical to the 
     * new one, since each of them could have been instantiated */
    for (let oldTypes of this.generations) {
      for (let exportKey in oldTypes) {
        let oldType = oldTypes[exportKey], newType = newTypes[exportKey];
        if (!newType) continue;
        // console.log(`Module(${this.file}): Annotate ${newType.name} type`);
        /* Version bump, annotate previous vesrions? */
        newType.$runtime.version = oldType.$runtime.version + 1;

        const oldTypeProps = Object.getOwnPropertyDescriptors(oldType);
        const newTypeProps = Object.getOwnPropertyDescriptors(newType);
        for (let key in newTypeProps) {
          if (reserved.includes(key)) continue;
          let oldProp = oldTypeProps[key], newProp = newTypeProps[key];
          if (oldProp && !oldProp.configurable) continue;
          // console.log(`  + ${newType.name}.${key}`);
          Object.defineProperty(oldType, key, newProp);
        }

        /* Convert all of the prototype methods to call the new one */
        const oldProto = oldType.prototype, newProto = newType.prototype;
        const oldProtoProps = Object.getOwnPropertyDescriptors(oldProto);
        const newProtoProps = Object.getOwnPropertyDescriptors(newProto);
        for (let key in newProtoProps) {
          if (reserved.includes(key)) continue;
          let oldProp = oldProtoProps[key], newProp = newProtoProps[key];
          let oldPropType = _typeof(oldProp), newPropType = _typeof(newProp);
          if (oldProp && !oldProp.configurable) continue;
          // console.log(`  - ${newType.name}.${key}`);
          Object.defineProperty(oldProto, key, newProp);

          // if (oldPropType === 'function' && newPropType === 'function') {
          //   /* */
          //   console.log(`  - ${newType.name}.${key}()...`);
          //   // const desc = Object.getOwnPropertyDescriptor(oldProto, key);
          //   // console.log(`    old: `, desc);
          //   oldProto[key] = newProp;
          //   // const desc2 = Object.getOwnPropertyDescriptor(oldProto, key);
          //   // console.log(`    new: `, desc2);

          //   console.log(`    Runtime.sync? `);

          // }
        }

      }
    }
    const entries = Object.entries(this.types);
    if (entries.length > 0) {
      this.version++;
      // [['default', Runtime], ['default.Package', Package], ['default.Module', Module]]
      // Runtime@1, { Package@1, Module@1} 
      if (!this.package.runtime.quiet) {
        const defs = entries.map(([key, def]) => {
          let name = key.replace(/^default\.?/, ''), impl = def.name ?? '?';
          return (!name ? impl : name == impl ? impl : name+':'+impl) + '@' + def.$runtime.version
        }).join(', ')
        console.log(`Runtime: package '${this.package.name}' reloaded module '${this.file}' (${defs})`);
      }
      if (!this.package.runtime.pending) 
        this.package.runtime.emit('reloaded', this.file, this);
    }
  }

  /**
   * Compiles the module.  
   * @return {any} The exports from the compiled file
   */
  recompile() {
    const extname = path.extname(this.file)
    switch (extname) {
      case '.ts':
        if (this.compiler == null) {
          this.require || (this.require = Module_.createRequire(this.file))
          this.tsnode = this.require('ts-node')
          this.compiler = this.tsnode.create({})
        }
        const tsCode = fs.readFileSync(this.file, 'utf8')
        const jsCode = this.compiler.compile(tsCode, this.file)
        const paths = Module_._nodeModulePaths(path.dirname(this.file));
        const mod = new Module_(this.file, module.parent /* ours */)
        mod.filename = this.file;
        mod.paths = paths;
        mod._compile(jsCode, this.file);
        return mod.exports;
        
      default:
        throw new Error(`Reflecter: recompiling ${extname} files not supported: ${this.file}`)
    }
  }

  /**
   * Returns map of exported types by depth key.
   */
  static exportedTypes(exports) {
    const types = {};
    for (let entry, queue = [['', exports, null]], seen = new Map(); 
         entry = queue.shift(); ) {
      let [kp, symbol, parent] = entry;
      if (seen.has(symbol)) continue;
      seen.set(symbol, true);
      const symbolType = _typeof(symbol);
      switch (symbolType) {
        case 'class':
          types[kp] = symbol;
          // fall through
        case 'object':
          const keys = Object.keys(symbol);
          for (let i = 0, ic = keys.length, key; key = keys[i]; i++) {
          // for (let key in symbol) {
            const s = symbol[key], subtype = _typeof(s);
            if (subtype !== 'class')
              continue;
            if (symbolType == 'class' && !_namedLikeClass(s.name || key))
              continue;
            // if (/*subtype == 'object' ||*/ subtype == 'class')
            queue.push([kp ? kp+'.'+key : key, s, symbol])
          }
          break;
      }
    }
    return types;
  }

}
Runtime.Module = Module;

const reserved = ['constructor', 'prototype', 'length', 'arguments'];
const moduleExts = ['.js', '.mjs']

function _typeof(value) {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  let type = typeof(value), ctor, name;
  if (type === 'object') {
    if (Array.isArray(value)) return 'array';
    if ((ctor = value.constructor) && (name = ctor.name))
      return name.toLowerCase();
  } else if (type === 'function') {
    if (!value.hasOwnProperty('arguments') && value.hasOwnProperty('prototype'))
      return 'class';
  }
  return type;
}

function _namedLikeClass(name) {
  return name && name.match(/^[A-Z]/)
}

