const fs = require('fs');
const path = require('path');

const TABLES = ['courses', 'modules', 'lessons', 'faqs', 'scripts', 'objections', 'voice_notes', 'assignments', 'quizzes', 'tools'];

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

let modifiedFiles = 0;

function processDir(dir) {
  walkDir(dir, (filePath) => {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    TABLES.forEach(table => {
      const regex = new RegExp(`\\.from\\(['"]${table}['"]\\)\\s*\\.select\\(([^)]*)\\)`, 'g');
      content = content.replace(regex, (match, selectArgs) => {
        // If the match is already followed by .is('deleted_at', null) or similar in the next 30 chars, ignore
        return match;
      });
    });

    // Actually, simple string replacement might be safer manually, or with a more robust parser.
    // Let's do this: 
    TABLES.forEach(table => {
      const regex = new RegExp(`\\.from\\(['"]${table}['"]\\)\\s*\\.select\\(([^)]*)\\)(?!\\s*\\.is\\(['"]deleted_at['"])`, 'g');
      content = content.replace(regex, (match, selectArgs) => {
        return match + `.is('deleted_at', null)`;
      });
    });

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Fixed ' + filePath);
      modifiedFiles++;
    }
  });
}

processDir('./app');
processDir('./lib');

console.log('Done. Modified ' + modifiedFiles + ' files.');
