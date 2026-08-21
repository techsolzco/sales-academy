const fs = require('fs');
const path = require('path');

const regex = /\.from\(['"](courses|modules|lessons|faqs|scripts|objections|voice_notes|assignments|quizzes|tools)['"]\)\s*\.select\((['"`].*?['"`])\)(?![\s\S]{0,10}\.is\(['"]deleted_at['"])/g;

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function processDir(dir) {
  walkDir(dir, (filePath) => {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
    if (filePath.includes('recycle-bin.ts')) return; // skip recycle bin

    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    content = content.replace(regex, (match) => {
      return match + `.is('deleted_at', null)`;
    });

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Fixed ' + filePath);
    }
  });
}

processDir('./app');
processDir('./lib');
