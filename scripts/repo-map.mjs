#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const EXCLUDE = new Set(['node_modules','.git','.next','dist','build','coverage','.turbo','.cache','.DS_Store']);
const MAX_DEPTH = Number(process.env.REPO_MAP_DEPTH || 6);

const HINTS = {
  frontend: [/^client$/, /^web$/, /^app$/, /^ui$/, /^frontend$/, /^packages\/web$/, /^src\/(app|pages)$/],
  backend: [/^server$/, /^api$/, /^backend$/, /^functions$/, /^services$/, /^packages\/server$/],
  shared: [/^shared$/, /^libs?$/, /^packages\/(core|shared|utils|types?)$/]
};

function classify(rel) {
  const p = rel.replace(/\\/g, '/');
  for (const rx of HINTS.frontend) if (rx.test(p)) return 'frontend';
  for (const rx of HINTS.backend)  if (rx.test(p)) return 'backend';
  for (const rx of HINTS.shared)   if (rx.test(p)) return 'shared';
  return 'unknown';
}

function detectFrameworks(root) {
  const pkgPath = path.join(root, 'package.json');
  const frameworks = [];
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (deps.next) frameworks.push('nextjs');
      if (deps.react || deps['react-dom']) frameworks.push('react');
      if (deps.express) frameworks.push('express');
      if (deps.fastify) frameworks.push('fastify');
      if (deps['@aws-sdk/client-lambda'] || deps.serverless) frameworks.push('aws-lambda');
      if (deps['@salesforce/core'] || deps.jsforce) frameworks.push('salesforce');
      if (deps.typescript) frameworks.push('typescript');
      if (deps['@salesforce/commerce-sdk']) frameworks.push('sfcc');
    } catch {}
  }
  return frameworks;
}

function walk(dir, depth = 0, rel = '') {
  if (depth > MAX_DEPTH) return null;
  const name = path.basename(dir);
  if (EXCLUDE.has(name)) return null;

  let node = { name, path: rel || '.', type: 'dir', role: classify(rel || name), children: [] };
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return null; }

  for (const e of entries) {
    if (EXCLUDE.has(e.name)) continue;
    const abs = path.join(dir, e.name);
    const nextRel = rel ? path.posix.join(rel, e.name) : e.name;
    if (e.isDirectory()) {
      const child = walk(abs, depth + 1, nextRel);
      if (child) node.children.push(child);
    } else {
      node.children.push({ name: e.name, path: nextRel, type: 'file' });
    }
  }
  return node;
}

const map = {
  root: path.basename(ROOT),
  frameworks: detectFrameworks(ROOT),
  generatedAt: new Date().toISOString(),
  depth: MAX_DEPTH,
  tree: walk(ROOT)
};

fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs', 'repomap.json'), JSON.stringify(map, null, 2));
console.log('Wrote docs/repomap.json');
