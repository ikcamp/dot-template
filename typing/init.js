import * as fs from 'fs-extra'
import * as path from 'path'

const outDir = path.resolve(__dirname, '../out')
const typingDir = path.resolve(__dirname)

const typeDirs = ['common', 'core']

const types = typeDirs
  .map(d => path.join(outDir, d))
  .reduce((all, dir) => addTypingFile(all, dir), [])

types.forEach(f => {
  fs.copySync(f, path.join(typingDir, path.relative(outDir, f)))
})

function addTypingFile(result, filepath) {
  let stats = fs.statSync(filepath)
  if (stats.isFile() && filepath.endsWith('.d.ts')) result.push(filepath)
  else if (stats.isDirectory()) fs.readdirSync(filepath).forEach(f => addTypingFile(result, path.join(filepath, f)))
  return result
}
