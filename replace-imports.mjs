import fs from 'fs';
import path from 'path';

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory() && !file.includes('node_modules') && !file.includes('.git')) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('.');
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    content = content.replace(/https:\/\/www\.gstatic\.com\/firebasejs\/10\.12\.2\/firebase-app\.js/g, 'firebase/app');
    content = content.replace(/https:\/\/www\.gstatic\.com\/firebasejs\/10\.12\.2\/firebase-auth\.js/g, 'firebase/auth');
    content = content.replace(/https:\/\/www\.gstatic\.com\/firebasejs\/10\.12\.2\/firebase-firestore\.js/g, 'firebase/firestore');
    content = content.replace(/https:\/\/www\.gstatic\.com\/firebasejs\/10\.12\.2\/firebase-storage\.js/g, 'firebase/storage');
    content = content.replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/perfect-freehand@1\.2\.2\/\+esm/g, 'perfect-freehand');
    if (original !== content) {
        fs.writeFileSync(file, content);
        console.log(`Updated ${file}`);
    }
});
