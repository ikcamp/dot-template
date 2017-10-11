module.exports = function(vscode) {
  let fileName = vscode.window.activeTextEditor.document.fileName

  return {
    project: fileName.includes('foo') ? 'foo' : 'bar'
  }
}
