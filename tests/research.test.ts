import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import { branches, coverage, filterPapers, papers, researchTree, type ResearchNode } from "../lib/research";
import { ancestorIds, createLayout, height, width } from "../lib/tree-layout";

test("migration preserves every original topic and bibliographic field", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const expression = html.slice(html.indexOf("const treeData = ") + 17, html.indexOf("\n\n        class TreeChart")).trim().replace(/;$/, "");
  const original = JSON.parse(JSON.stringify(vm.runInNewContext(`(${expression})`)));
  const migrated = JSON.parse(JSON.stringify(researchTree, (key, value) => key === "id" ? undefined : value));
  assert.deepEqual(migrated, original);
  assert.equal(papers.length, 19);
  assert.equal(new Set(papers.map(paper => paper.id)).size, papers.length);
  assert.deepEqual(coverage, { from: 2010, to: 2024 });
});

test("filters combine branch, inclusive year cutoff and normalized search", () => {
  const all = filterPapers({ query: "", branchId: "all", throughYear: 2024 });
  assert.equal(all.length, 19);
  assert.ok(all.every((paper, i) => i === 0 || Number(all[i - 1].year) >= Number(paper.year)));
  const bayesian = filterPapers({ query: "ＢＡＹＥＳＩＡＮ", branchId: branches[0].id, throughYear: 2024 });
  assert.equal(bayesian.length, 1);
  assert.equal(bayesian[0].year, "2024");
  assert.equal(filterPapers({ query: "Bayesian", branchId: branches[0].id, throughYear: 2023 }).length, 0);
  assert.equal(filterPapers({ query: "Bayesian", branchId: branches[1].id, throughYear: 2024 }).length, 0);
  assert.equal(filterPapers({ query: "存在しない検索語xyz", branchId: "all", throughYear: 2024 }).length, 0);
  assert.ok(filterPapers({ query: "空間分析", branchId: "all", throughYear: 2024 }).length > 0);
});

test("every source relationship and paper appears in a connected, bounded layout", () => {
  const first = createLayout(), second = createLayout();
  assert.deepEqual(first, second, "initial layout must not shift between SSR and hydration");
  assert.equal(first.points.length, 32);
  assert.equal(first.links.length, 31);
  const ids = new Set(first.points.map(point => point.id));
  assert.equal(ids.size, first.points.length);
  first.points.forEach(point => assert.ok(point.x > 0 && point.x < width && point.y > 0 && point.y < height));
  first.links.forEach(link => { assert.ok(ids.has(link.source)); assert.ok(ids.has(link.target)); });
  const validate = (node: ResearchNode) => {
    [...(node.children ?? []), ...(node.papers ?? [])].forEach(child => assert.ok(first.links.some(link => link.source === node.id && link.target === child.id)));
    node.children?.forEach(validate);
  };
  validate(researchTree);
  papers.forEach(paper => {
    const path = ancestorIds(paper.id);
    assert.ok(path.has(researchTree.id)); assert.ok(path.has(paper.topicId)); assert.ok(path.has(paper.branchId));
    assert.equal(path.size, paper.path.length + 1);
  });
});
