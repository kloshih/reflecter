# reflecter

The reflector supports reflection utilities for node.js with no- to little 
impact on runtime performance. These utilies support a small number of features:

- Creates metadata for the following:
  - **Loaded Modules** - all files that have been required with `require()`
  - **Loaded Packages** - all top-level packges with `package.json` and loaded packges one-level deep
  - For exported class, associates the module and package that loaded it for introspection
- Live source reloading



```
npm install --save reflecter
```

## Live Source Reloading

Reflecter supports live reloading of source files into the runtime upon file 
save. It uses `fs.watch()` to observe when source files change in the load 
path whether Javascript or transpiled language (Typescript) an reloads the 
source without restarting the server and affecting application state.

```js
const runtime = require('reflecter');
// Reloading is now live for current and future source file edits if 
// environment variable is set:
// export RELOAD_ENABLED=

runtime.isReloadEnabled           // -> true if RELOAD_ENABLED env variable set
runtime.setReloadEnabled(false);  // Halts source loading
runtime.setReloadEnabled(true);  // (Re)starts source loading
```

- No need to restart server to reload source
- Redefines exported symbols and ES6 classes
- Existing instances of classes adopt new methods and properties
- Reflector tracks version number in `MyClass.$runtime.version`
- Enable using `RELOAD_ENABLED` environment variable 
- Enable programmatically using `runtime.setReloadEnabled(true)`

### Usage Scenarios

- **Speed development**  
  Modify running servers and applications without restarts. 
- **Change source without debugger restart**  
  Stay in the debugger longer. Reflecter plays well with debuggers, 
  allowing you to edit and save changes to source while debugging.
- **Make changes in long running node servers**  
  Without restarting, reduce restarts and downtime. Apply emergency
  patches.


### How does it work?

Reflector's runtime watches all file changes in top-level source directories (ones not inside a `node_modules` directory). Any time a loaded source file is modified, Reflecter walks through `module.exports` looking for redefinable symbols, primarily classes, exports of classes, then copies all property definitions, both static and prototype, from the new definiton into all previous definitions of the class/symbol. This is so that all instances created on prior definitions get to take advantage of the updated implementation, along with accurate debugging line numbers.

If there's a probem when the file is reloaded, such as syntax error, it happens! The existing loaded symbols are left intact.

### Caveats

- Hard bindings to event handlers or timers won't use the new implementation since the binding is at bind() time not call time

  - Instead of  
    `stream.on('data', this.readData.bind(this));` write  
    `stream.on('data', (data) => this.readData(data));`

  - Instead of  
    `stream.on('data', this.readData.bind(this));` write  
    `stream.on('data', (data) => this.readData(data));`




## <a name="Runtime"></a>Runtime

### Properties

- `packages` (Object<string,Package>) 

  Current set of packages with at least one module loaded. The package 
  provides information sucn as all loaded modules within the package
  and information inside the `package.json` file. See the 
  [Package](#Package) 

- `modules` (Object<string,Module>)

  All loaded modules. [Modules](#Module) provide access to the 
  [Package](#Package) it is contained within as well as exported type 
  information.

- `main` (Module)

  The main module or program entry. To find the main package use `runtime.main.package`

- `locals` (Object<string,Package>)

  Local packages, i.e. packages not loaded through `node_modules`

- `isReloadEnabled` (boolean) & `setReloadEnabled()`

  Whether the source reloader is enabled


### Events

> **reloaded**(*path*, *module*)
- **path** (string) – the file path of the file
- **module** (Module) - the reloaded module definition

Emitted when a source file at the given *path* has been reloaded. 

> **package**(*path*, *package*)
- **path** (string) – the directory path of the package 
- **package** (Package) – package definition loaded 

Emitted when a new package is loaded.

> **module**(*path*, *module*)
- **path** (string) – the file path of the loaded module 
- **module** (Module) - the loaded module definition

Emitted when a new module is loaded.

> **watching**(*dir*, *package*)
- **dir** (string) – the director being watched
- **package** (Package) - the watching package

Emitted when a package is being watched

> **unwatched**(*dir*, *package*)
- **dir** (string) – the director being watched
- **package** (Package) - the watching package

Emitted when a package is no longer being watched



----

## <a name="Package"></a>Package class

Represents a package or any local directory with a `package.json`.

### Properties

- `name` (string)

  The basename of the package, such as `"reflecter"`.

- `dir` (string)

  The absolute path of the direcory package.

- `info` (object)

  The contents of the `package.json` for the package or `null` if 
  there's no `package.json` listed in the *dir*.

- `modules` (Object<string,Module>)

  Loaded modules in the package including keyed by the relative file path 
  such as 'lib/file.js'. See the [Module](#Module)

- `dependencies` (Object<string,Package>)

  A map of package dependences as loaded at runtime, as distinct from 
  what's listed in `package.json`. 

-----

## <a name="Module"></a>Module class

Represents a loaded source file

### Properties

- `file` (string)

  The absolute path of the source file

- `stat` (fs.Stat)

  The latest stat for the filea

- `package` (Package)

  The package in which this module is contained. See [Package](#Package)

- `version` (number)

  The runtime version of this module, incremented every time this module
  is reloaded and has symbols to redefine

- `types` (Object<string,function|class>)

  A flatten list of reloadable exported symbols in the module. This is
  the list of symbols defined by the. 

### Methods

- `reload()` 

  Reloads the module programmically. If the file has not changed since
  the last reload, this method does nothing.






