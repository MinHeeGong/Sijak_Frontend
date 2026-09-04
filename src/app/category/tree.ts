// src/app/category/tree.ts
// 폴더뷰/마인드맵뷰가 공유하는 트리 구성 로직.
//
// 규칙:
// - 최상위(root)에는 parent_id가 null인 category와,
//   parent_id도 category_id도 null인 project가 보임.
// - category 폴더 안에는: 그 카테고리의 하위 category, 그 카테고리 밑에 바로 달린
//   project(parent_id null && category_id === 카테고리), project 없이 이 카테고리에
//   직접 속한 task(project_id null)가 보임.
// - project 폴더 안에는: 그 프로젝트의 하위 project, 그 프로젝트에 속한 task가 보임.

import type { Category, Project, Task } from "../api/types";

export type FolderRef =
  | { type: "root" }
  | { type: "category"; id: number }
  | { type: "project"; id: number };

export function folderKey(f: FolderRef): string {
  return f.type === "root" ? "root" : `${f.type}-${f.id}`;
}

export function getFolderContents(
  folder: FolderRef,
  categories: Category[],
  projects: Project[],
  tasks: Task[]
) {
  if (folder.type === "root") {
    return {
      subCategories: categories.filter((c) => c.parent_id == null),
      subProjects: projects.filter((p) => p.parent_id == null && p.category_id == null),
      leafTasks: [] as Task[], // 최상위에는 task를 직접 두지 않음 (반드시 카테고리 소속)
    };
  }
  if (folder.type === "category") {
    return {
      subCategories: categories.filter((c) => c.parent_id === folder.id),
      subProjects: projects.filter((p) => p.parent_id == null && p.category_id === folder.id),
      leafTasks: tasks.filter((t) => t.category_id === folder.id && t.project_id == null),
    };
  }
  // project
  return {
    subCategories: [] as Category[], // 프로젝트 밑에는 카테고리가 올 수 없음(스키마상)
    subProjects: projects.filter((p) => p.parent_id === folder.id),
    leafTasks: tasks.filter((t) => t.project_id === folder.id),
  };
}

export interface Crumb {
  ref: FolderRef;
  name: string;
}

export function getBreadcrumb(
  folder: FolderRef,
  categories: Category[],
  projects: Project[]
): Crumb[] {
  const trail: Crumb[] = [];
  let current: FolderRef = folder;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (current.type === "root") {
      trail.unshift({ ref: { type: "root" }, name: "전체" });
      break;
    }
    if (current.type === "category") {
      const cat = categories.find((c) => c.id === current.id);
      if (!cat) break;
      trail.unshift({ ref: current, name: cat.name });
      current = cat.parent_id != null ? { type: "category", id: cat.parent_id } : { type: "root" };
      continue;
    }
    // project
    const proj = projects.find((p) => p.id === current.id);
    if (!proj) break;
    trail.unshift({ ref: current, name: proj.name });
    if (proj.parent_id != null) {
      current = { type: "project", id: proj.parent_id };
    } else if (proj.category_id != null) {
      current = { type: "category", id: proj.category_id };
    } else {
      current = { type: "root" };
    }
  }

  return trail;
}
