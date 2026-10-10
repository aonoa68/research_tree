import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import { allNodes, branches, coverage, entries, filterEntries, filterPapers, papers, projects, researchTree, type ResearchNode } from "../lib/research";
import { ancestorIds, createLayout, height, width } from "../lib/tree-layout";

test("recent additions preserve every original topic, paper and relationship", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const expression = html.slice(html.indexOf("const treeData = ") + 17, html.indexOf("\n\n        class TreeChart")).trim().replace(/;$/, "");
  const original = JSON.parse(JSON.stringify(vm.runInNewContext(`(${expression})`)));
  const baseline: ResearchNode = JSON.parse(readFileSync(new URL("../data/research-tree.json", import.meta.url), "utf8"));
  assert.deepEqual(JSON.parse(JSON.stringify(baseline, (key, value) => key === "id" ? undefined : value)), original);
  function verify(node: ResearchNode) {
    const current = allNodes.find(item => item.id === node.id)!;
    assert.ok(current);
    assert.equal(current.name, node.name); assert.equal(current.description, node.description); assert.equal(current.level, node.level);
    node.papers?.forEach(paper => assert.deepEqual(current.papers?.find(item => item.id === paper.id), paper));
    node.children?.forEach(child => { assert.ok(current.children?.some(item => item.id === child.id)); verify(child); });
  }
  verify(baseline);
  assert.equal(filterPapers({query:"",branchId:"all",throughYear:2024}).length, 19);
});

test("publications and ongoing projects have separate counts, metadata and filters", () => {
  assert.equal(papers.length, 26); assert.equal(projects.length, 13);
  assert.equal(new Set(entries.map(entry => entry.id)).size, entries.length);
  assert.deepEqual(coverage, {from:2010,to:2026});
  const latest = filterEntries({query:"",branchId:"all",throughYear:2026,fromYear:2025});
  assert.equal(latest.filter(entry => entry.kind === "paper").length, 7);
  assert.equal(latest.filter(entry => entry.kind === "project").length, 13);
  papers.filter(paper => Number(paper.year) >= 2025).forEach(paper => {
    assert.ok(paper.url?.startsWith("https://")); assert.ok(paper.publicationType); assert.ok(paper.journal);
  });
  projects.forEach(project => { assert.equal(project.status,"ongoing"); assert.ok(project.description && project.methods); assert.ok(!("journal" in project)); });
  assert.equal(filterEntries({query:"",branchId:"all",throughYear:2026,kind:"project"}).length,13);
  assert.equal(filterEntries({query:"",branchId:"all",throughYear:2025,kind:"project"}).length,0);
  assert.equal(filterPapers({query:"",branchId:"all",throughYear:2026}).length,26);
});

test("filters combine branch, inclusive year cutoff, type and normalized search", () => {
  const all = filterEntries({ query: "", branchId: "all", throughYear: 2026 });
  assert.ok(all.every((entry, i) => i === 0 || Number(all[i - 1].year) >= Number(entry.year)));
  const bayesian = filterPapers({ query: "ＢＡＹＥＳＩＡＮ", branchId: branches[0].id, throughYear: 2024 });
  assert.equal(bayesian.length, 1); assert.equal(bayesian[0].year, "2024");
  assert.equal(filterPapers({ query: "Bayesian", branchId: branches[0].id, throughYear: 2023 }).length, 0);
  assert.equal(filterPapers({ query: "Bayesian", branchId: branches[1].id, throughYear: 2024 }).length, 0);
  assert.equal(filterEntries({ query: "存在しない検索語xyz", branchId: "all", throughYear: 2026 }).length, 0);
  assert.equal(filterEntries({ query: "ＥＭＡ", branchId: "root-1-6", throughYear: 2026, kind:"project" }).length, 1);
  assert.equal(filterEntries({ query: "ＥＭＡ", branchId: "root-1-2", throughYear: 2026 }).length, 0);
  assert.equal(filterEntries({ query: "GAN-Based", branchId: "root-1-6", throughYear: 2026, kind:"paper" }).length, 1);
});

test("every publication and project is connected once in a deterministic bounded tree", () => {
  const first = createLayout(), second = createLayout();
  assert.deepEqual(first, second, "initial layout must not shift between SSR and hydration");
  assert.equal(first.points.length, allNodes.length + entries.length);
  assert.equal(first.links.length, first.points.length - 1);
  const ids = new Set(first.points.map(point => point.id));
  assert.equal(ids.size, first.points.length);
  first.points.forEach(point => assert.ok(point.x > 25 && point.x < width - 25 && point.y > 25 && point.y < height - 25, `${point.id} out of bounds`));
  first.links.forEach(link => { assert.ok(ids.has(link.source)); assert.ok(ids.has(link.target)); });
  const validate = (node: ResearchNode) => {
    [...(node.children ?? []), ...(node.papers ?? []), ...(node.projects ?? [])].forEach(child => assert.ok(first.links.some(link => link.source === node.id && link.target === child.id)));
    node.children?.forEach(validate);
  };
  validate(researchTree);
  entries.forEach(entry => {
    const path = ancestorIds(entry.id);
    assert.ok(path.has(researchTree.id)); assert.ok(path.has(entry.topicId)); assert.ok(path.has(entry.branchId));
    assert.equal(path.size, entry.path.length + 1);
    assert.equal(first.points.find(point => point.id === entry.id)?.kind, entry.kind);
  });
});
