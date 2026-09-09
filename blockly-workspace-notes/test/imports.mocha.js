/**
 * @fileoverview Asserts that `src/` has no circular imports.
 *
 * There used to be one, between `model/note.ts`, `model/stacking.ts` and
 * `utils/guards.ts`, and it was documented as harmless. It was — but only by
 * accident, and the two builds resolved it by different means: the production
 * bundle flattens those modules into one scope, where a cycle is raw temporal
 * dead zone ordering, while the test bundle keeps module boundaries and uses
 * live bindings. So a cycle that broke would have broken in `dist/` and passed
 * here. This test is what stops one coming back unnoticed.
 *
 * Only *value* imports count. `import type` is erased before the bundler ever
 * sees it, so a type-level loop is not a cycle in any build.
 *
 * Deliberately conservative: a mixed `import {type Foo, Bar}` is read as a
 * value edge. A false positive fails loudly and is fixed by splitting the
 * import; a false negative would be invisible, which is the failure this test
 * exists to prevent.
 *
 * Known blind spots, none of which the source uses today: `export * from`,
 * dynamic `import()`, and path aliases.
 */

import {assert} from 'chai';
import * as fs from 'fs';
import * as path from 'path';

/** The source tree, resolved from the package root. */
const SRC = path.join(process.cwd(), 'src');

/**
 * @param dir A directory to walk.
 * @returns Every `.ts` file under it, recursively.
 */
function walk(dir) {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.isFile() && full.endsWith('.ts') ? [full] : [];
  });
}

/**
 * Removes comments, so that an import statement quoted in a fileoverview is
 * not mistaken for a real one. Several of them do exactly that.
 *
 * @param source A TypeScript source file.
 * @returns The same source with block and line comments blanked.
 */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

/**
 * @param file An absolute path to a source file.
 * @returns The files it imports at runtime, as absolute paths.
 */
function valueImportsOf(file) {
  const source = stripComments(fs.readFileSync(file, 'utf8'))
    // Whole type-only statements, which the compiler erases.
    .replace(/\b(?:import|export)\s+type\s+[\s\S]*?from\s*['"][^'"]+['"]/g, '');

  const specifiers = [
    // import … from './x'  /  export … from './x'
    ...source.matchAll(/(?:import|export)\b[^;]*?from\s*['"](\.[^'"]+)['"]/g),
    // import './x' — side-effect only, as plugin.ts does for the stylesheet.
    ...source.matchAll(/import\s*['"](\.[^'"]+)['"]/g),
  ].map((match) => match[1]);

  return specifiers
    .map((specifier) => {
      const base = path.resolve(path.dirname(file), specifier);
      for (const candidate of [`${base}.ts`, path.join(base, 'index.ts')]) {
        if (fs.existsSync(candidate)) return candidate;
      }
      return null;
    })
    .filter((resolved) => resolved !== null);
}

suite('Import graph', function () {
  suiteSetup(function () {
    // Without this, a wrong working directory yields an empty walk, no
    // cycles, and a green test that checked nothing.
    assert.isTrue(
      fs.existsSync(path.join(SRC, 'index.ts')),
      `expected the source tree at ${SRC}`,
    );
    this.files = walk(SRC);
    assert.isAbove(this.files.length, 30, 'the walk found too few files');
  });

  test('no module imports itself, however indirectly', function () {
    const graph = new Map(
      this.files.map((file) => [file, valueImportsOf(file)]),
    );
    const label = (file) => path.relative(SRC, file);

    const state = new Map(); // file -> 'open' | 'done'
    const cycles = [];

    const visit = (file, trail) => {
      if (state.get(file) === 'done') return;
      if (state.get(file) === 'open') {
        const loop = trail.slice(trail.indexOf(file));
        cycles.push([...loop, file].map(label).join(' -> '));
        return;
      }
      state.set(file, 'open');
      for (const next of graph.get(file) ?? []) visit(next, [...trail, file]);
      state.set(file, 'done');
    };

    for (const file of this.files) visit(file, []);

    assert.deepEqual(cycles, [], `circular imports:\n  ${cycles.join('\n  ')}`);
  });
});
