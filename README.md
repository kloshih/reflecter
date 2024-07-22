# reflecter

The reflecter supports reflection utilities for node.js with no- to little 
impact on runtime performance. It support a short list of features:

- Works in node.js 
- Creates metadata at runtime:
  - **Loaded Modules** - all files that have been required with `require()`
  - **Loaded Packages** - all top-level packges with `package.json` and loaded packges one-level deep
  - For exported class, associates the module and package that loaded it for introspection 
- Live source reloading


## Installation

```
npm install --save reflecter
```

## Usage

```js
// To enable, set the RELOAD_ENABLED environment variable
// export RELOAD_ENABLED=

require('reflecter');
```

Reflector only needs to be required

-----

```js
// const MyClass = require('./mymodule');
let myItem = new MyClass();

// Find information about this item, from package.json
const pack = myItem.constructor.$reflecter.package;
pack.name;        // name from package.json
pack.version;     // version from package.json
pack.modules;     // all loaded files from package

// Find information about the class
const module = this.constructor.$reflecter.module;
module.file;      // file name that defines this class
module.package;   // package for module
module.reload();  // reloads file if changed

```

## Live Source Reloading

Reflecter supports live reloading of source files into the runtime upon file 
save. It uses `fs.watch()` to observe when source files change in the load 
path whether Javascript or transpiled language (Typescript) an reloads the 
source without restarting the server and affecting application state.

```js
const reflecter = require('reflecter');
// Reloading is now live for current and future source file edits if 
// environment variable is set:
// export RELOAD_ENABLED=

reflecter.isReloadEnabled           // -> true if RELOAD_ENABLED env variable set
reflecter.setReloadEnabled(false);  // Halts source loading
reflecter.setReloadEnabled(true);   // (Re)starts source loading
```

- No need to restart server to reload source
- Redefines exported symbols and ES6 classes
- Existing instances of classes adopt new methods and properties
- Reflector tracks version number in `MyClass.$reflecter.version`
- Enable using `RELOAD_ENABLED` environment variable 
- Enable programmatically using `reflecter.setReloadEnabled(true)`

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

Reflector's reflecter watches all file changes in top-level source directories (ones not inside a `node_modules` directory). Any time a loaded source file is modified, Reflecter walks through `module.exports` looking for redefinable symbols, primarily classes, exports of classes, then copies all property definitions, both static and prototype, from the new definiton into all previous definitions of the class/symbol. This is so that all instances created on prior definitions get to take advantage of the updated implementation, along with accurate debugging line numbers.

If there's a probem when the file is reloaded, such as syntax error, it happens! The existing loaded symbols are left intact.

### Caveats

- Hard bindings to event handlers or timers won't use the new implementation since the binding is at bind() time not call time

  - Instead of  
    `stream.on('data', this.readData.bind(this));` write:  
    `stream.on('data', data => this.readData(data));`

  - Instead of  
    `setInterval(this.reload.bind(this), 10e3);` write  
    `setInterval(() => this.reload(), 10e3);`


-----

## <a name="Reflecter"></a>Reflecter Class

```js
const reflecter = require('reflecter');
reflecter.packages; // all loaded packages
```

### Properties

- **packages** (Record<string,[Package](#Package)>) 

  Current set of packages with at least one module loaded. The package 
  provides information sucn as all loaded modules within the package
  and information inside the `package.json` file. See the 
  [Package](#Package) 

- **modules** (Record<string,[Module](#Module)>)

  All loaded modules. [Modules](#Module) provide access to the 
  [Package](#Package) it is contained within as well as exported type 
  information.

- **main** ([Module](#Module))

  The main module or program entry. To find the main package use `reflecter.main.package`

- **locals** (Record<string,[Package](#Package)>)

  Local packages, i.e. packages not loaded through `node_modules`

- **isReloadEnabled** (boolean) & **setReloadEnabled()**

  Whether the source reloader is enabled

### Methods

- *reflecter*.**package**(*abspath*)  
  *reflecter*.**package**(*class*)  
  *reflecter*.**package**(*object*)
  - *path* (string) – the directory for the package
    *class* (class) – A class, or  
    *object* (object) – An instance of a class
  - *returns ([Package](#Package))*

  This overloaded method returns the [Package](#Package) for the directory or the packagke that defines the class or object's constructor. 

- *reflecter*.**module**(*abspath*)  
  *reflecter*.**module**(*class*)  
  *reflecter*.**module**(*object*)
  - *path* (string) – the directory for the module
    *class* (class) – A class, or  
    *object* (object) – An instance of a class
  - *returns ([Module](#Module))*

  Returns the [Module](#Module) for the file, class or object. 

### Events

- **reloaded**(*path*, *module*)
  - *path* (string) – the file path of the file
  - *module* ([Module](#Module)) - the reloaded module definition

  Emitted when a source file at the given *path* has been reloaded. 

- **package**(*path*, *package*)
  - *path* (string) – the directory path of the package 
  - *package* ([Package](#Package)) – package definition loaded 

  Emitted when a new package is loaded.

- **module**(*path*, *module*)
  - *path* (string) – the file path of the loaded module 
  - *module* ([Module](#Module)) - the loaded module definition

  Emitted when a new module is loaded.

- **watching**(*dir*, *package*)
  - *dir* (string) – the director being watched
  - *package* ([Package](#Package)) - the watching package

  Emitted when a package is being watched

- **unwatched**(*dir*, *package*)
  - *dir* (string) – the director being watched
  - *package* ([Package](#Package)) - the watching package

  Emitted when a package is no longer being watched



----

## <a name="Package"></a>Package class

```js
// ./index.js
const reflecter = require('reflecter');
const pack = reflecter.package(__dirname) ;
pack.modules; // -> all loaded modules/source files
```

Represents a package or any local directory with a `package.json`.

### Properties

- **name** (string)

  The basename of the package, such as `"reflecter"`.

- **dir** (string)

  The absolute path of the direcory package.

- **info** (object)

  The contents of the `package.json` for the package or `null` if 
  there's no `package.json` listed in the *dir*.

- **modules** (Record<string,[Module](#Module)>)

  Loaded modules in the package including keyed by the relative file path 
  such as 'lib/file.js'. See the [Module](#Module)

- **dependencies** (Record<string,[Package](#Package)>)

  A map of package dependences as loaded at reflecter, as distinct from 
  what's listed in `package.json`. 

-----

## <a name="Module"></a>Module class

```js
// ./my-class.js
class MyClass {

  // Get the version from package.json
  packageVersion() {
    const metadata = this.constructor.$reflecter;
    return metadata.package.info.version;
  }

}

// Get information about a class
const reflecter = require('reflector');
const module = reflecter.module(MyClass);
module.file; // file name of the class
module.reload(); // reload if changed

```

Represents a loaded source file

### Properties

- **file** (string)

  The absolute path of the source file

- **stat** (fs.Stat)

  The latest stat for the filea

- **package** ([Package](#Package))

  The package in which this module is contained. See [Package](#Package)

- **version** (number)

  The reflecter version of this module, incremented every time this module
  is reloaded and has symbols to redefine

- **types** (Object<string,function|class>)

  A flatten list of reloadable exported symbols in the module. This is
  the list of symbols defined by the reflecter. 

### Methods

- *module*.**reload()** 

  Reloads the module programmically. If the file has not changed since
  the last reload, this method does nothing.

