
// import { any } from './owner.js'
// import { log } from 'logsync'

const ts = require('typescript');

/**
 * 
 * @param {string} code 
 * @param {string} file
 * @param {object} [opts={}]
 * @param {ts.ScriptTarget} [opts.target='Latest'] Target version
 */
function analyzeCode(code, file, opts) {
  // Create a TypeScript SourceFile from the source code
  const sourceFile = ts.createSourceFile(file, code, ts.ScriptTarget['Latest'], /*setParentNodes*/true);

  // Get the AST
  const ast = sourceFile;

  // Print the AST (optional)
  console.log(ts.SyntaxKind[sourceFile.kind]);

  // Create a program
  const program = ts.createProgram({
    rootNames: ['example.ts'],
    options: {},
  });

  // Retrieve type information
  const typeChecker = program.getTypeChecker();
  const typeInfo = typeChecker.getTypeAtLocation(sourceFile);

  // Print type information (optional)
  console.log(typeInfo);
}

// // Read the TypeScript source code from a file
// const fs = require('fs');
// const sourceCode = fs.readFileSync('example.ts', 'utf8');

// // Call the analyzeCode function with the source code
// analyzeCode(sourceCode);


/**
 * {@link Analyzer} doc used for creation and update
 * @typedef {Partial<Analyzer.Config>} Analyzer.Doc
 * 
 * {@link Analyzer} configuration
 * @typedef {typeof Analyzer['defaults']} Analyzer.Config
 */

module.exports = { analyzeCode }

/**
 * A analyzer provides ...
 * 
 * @since  0.1.0
 * @author Lo Shih <kloshih@gmail.com>
 * @copyright 2010-2023 Kenneth Lo Shih. All Rights Reserved
 */
class Analyzer {

  static defaults = {
    /** @type {string=} The name */
    name: undefined
  }

  /**
   * Creates a analyzer 
   * @param {Analyzer.Doc} doc An initial doc
   * @param {any} owner The owner owner 
   */
  constructor(doc, owner) {
    this.config = Object.assign({}, Analyzer.defaults, doc)

    /** @type {any} The owner of the analyzer */
    this.owner = owner
    /** @type {string=} The name of the analyzer */
    this.name
  }



}
