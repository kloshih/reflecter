/*
 *
 */

const EventEmitter = require('events')
const _path = require('path');
const fs = require('fs');

/**
 * 
 */
class Runtime extends EventEmitter {

  static {
    setImmediate(() => {
      process.env.RELOAD;
    })
  }

  constructor() {
    this.projects = {};
    this.modules = {};
    this.locals = {};
    this.main = null;
    this.reloadEnabled = process.env.RELOAD_ENABLED != null;
    this.quiet = process.env.RELOAD_ENABLED == 'quiet';
    this.pending = true;
    this.sync()
    delete(this.pending);
    this.timer = setInterval(() => this.cacheSync(), 5e3)
    this.timer.unref()

    /* Preload */
    (process.env.RELOAD?.split(':') || []).forEach(dir => this.addProjectPath(dir))
  }

  cacheSync() {
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
            this.modules[file] = parent.module(module);
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

  /**
   * 
   */
  isReloadEnabled() {
  }

  setReloadEnabled(enabled) {
  }

  addProjectPath(path) {
    path = fs.realpathSync(path);
    if (!fs.existsSync(path))
      return;
    const project = new Project(path, this);
    this.projects[path] = project;
  }

  removeProjectPath(path) {
  }

}

/**
 * 
 */
class Project {

  constructor(path, runtime) {
    this.runtime = runtime;
    this.path = path;
    this.name = _path.basename(path);
    try {
      this.info = require(path.join(this.path, 'package.json'))
      this.name = this.info.name;
      this.version = this.info.version;
    } catch (err) {
      this.name = _path.basename(path);     
    }
    this.modules = {};
    // this.dependencies = {};
  }

  /**
   * Returns the module for the given *path*
   * @param {string} file The module path
   * @return {Module?} The module
   */
  module(file) {
    file = fs.readFileSync(file);
    if (!file.startsWith(this.path)) 
      throw new Error(`Module not inside project: ${file}`)
    const subfile = file.substring(this.path.length + 1)
    let module = this.modules[subfile];
    if (!module) {
      module = this.modules[subfile] = new Module(file, this)
      if (!this.runtime.pending)
        this.runtime.emit('module', file, module)
    }
  }

  watch() {
    this.watcher = fs.watch(this.path, { recusrive:true, persistent:false, encoding:'utf8' }, (event, file) => this.fileChanged(event, file))
    this.watcher.on('close', () => console.log(`watcher closed`))
    this.watcher.on('error', err => console.log(`watcher error: ${err}`))
    if (!this.runtime.pending)
      this.runtime.emit('watch', this.path, this)
  }

  unwatch() {
    if (!this.watcher) {
      this.watcher.close()
      this.watcher = null;
      if (!this.runtime.pending)
        this.runtime.emit('unwatch', this.dir., this)
    }
  }

  _changed(event, subfile) {
    try {
      const file = path.join(this.path, subfile)
      const module = this.runtime.module(file);
      if (!module)
        return;
      switch (event) {
        case 'change':  module.reload(); break;
        case 'rename':  module.renamed = true; break;
        default: 
      }
    } catch (err) {
      console.log(`Runtime: IMPL ${err.stack}`)
    }
  }

}

class Module {

  constructor(subfile, project) {
    this.project = project
    this.subfile = subfile
    this.path = _path.join(this.project.path, this.subfile)
    this.stat = fs.statSync(this.path)
    this.version = 0
    this.types = Module.exportedTypes()
    this.versions = []
  }

  async reload() {
    const oldStat = this.stat;

    /* If we don't have an initial knowlege of exported types, grab it now */
    if (!this.types) {
      
    }

    

    
    this.versions.push(this.types)

  }

  
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

module.exports = Runtime;
Object.assign(Runtime, { Runtime, Project, Module })

