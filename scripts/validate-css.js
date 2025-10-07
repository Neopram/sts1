#!/usr/bin/env node

/**
 * CSS Validation Script
 * Detects and reports duplicate Tailwind CSS classes
 */

const fs = require('fs');
const path = require('path');

// Function to find all TSX files
function findTsxFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      findTsxFiles(fullPath, files);
    } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Function to extract className attributes
function extractClassNames(content) {
  const classNameRegex = /className=["']([^"']+)["']/g;
  const matches = [];
  let match;
  
  while ((match = classNameRegex.exec(content)) !== null) {
    matches.push({
      fullMatch: match[0],
      classes: match[1],
      index: match.index
    });
  }
  
  return matches;
}

// Function to find duplicate classes within a className
function findDuplicateClasses(classString) {
  const classes = classString.split(/\s+/).filter(c => c.length > 0);
  const seen = new Set();
  const duplicates = new Set();
  
  for (const cls of classes) {
    if (seen.has(cls)) {
      duplicates.add(cls);
    } else {
      seen.add(cls);
    }
  }
  
  return Array.from(duplicates);
}

// Function to get line number from index
function getLineNumber(content, index) {
  return content.substring(0, index).split('\n').length;
}

// Main validation function
function validateCssInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const classNameMatches = extractClassNames(content);
  const issues = [];
  
  for (const match of classNameMatches) {
    const duplicates = findDuplicateClasses(match.classes);
    
    if (duplicates.length > 0) {
      const lineNumber = getLineNumber(content, match.index);
      issues.push({
        file: filePath,
        line: lineNumber,
        duplicates: duplicates,
        fullClassName: match.classes
      });
    }
  }
  
  return issues;
}

// Main execution
function main() {
  console.log('🔍 Validating CSS classes in TSX files...\n');
  
  const srcDir = path.join(process.cwd(), 'src');
  const rootTsxFiles = [
    path.join(process.cwd(), 'sts-clearance-app.tsx')
  ].filter(file => fs.existsSync(file));
  
  const tsxFiles = [
    ...findTsxFiles(srcDir),
    ...rootTsxFiles
  ];
  
  let totalIssues = 0;
  
  for (const file of tsxFiles) {
    const issues = validateCssInFile(file);
    
    if (issues.length > 0) {
      console.log(`❌ ${path.relative(process.cwd(), file)}:`);
      
      for (const issue of issues) {
        console.log(`   Line ${issue.line}: Duplicate classes: ${issue.duplicates.join(', ')}`);
        console.log(`   Full className: "${issue.fullClassName}"`);
        console.log('');
      }
      
      totalIssues += issues.length;
    }
  }
  
  if (totalIssues === 0) {
    console.log('✅ No duplicate CSS classes found!');
  } else {
    console.log(`\n📊 Summary: Found ${totalIssues} CSS issues in ${tsxFiles.length} files`);
    console.log('\n💡 Tip: Remove duplicate classes to improve performance and avoid conflicts');
  }
  
  process.exit(totalIssues > 0 ? 1 : 0);
}

if (require.main === module) {
  main();
}

module.exports = {
  validateCssInFile,
  findDuplicateClasses,
  extractClassNames
};