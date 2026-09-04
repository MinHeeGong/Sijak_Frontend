// src/app/category/MindmapView.tsx
// Mindnode 참고. reactflow로 구현.
// - 라쏘(드래그 영역) 다중선택: 왼쪽 드래그 = 선택 박스, 캔버스 이동은 중간/오른쪽 버튼으로만 (panOnDrag={[1,2]})
// - 노드를 다른 노드 위로 드래그해서 놓으면 그 노드의 자식으로 재배치 (getIntersectingNodes로 감지)
// - 여러 노드를 선택한 채로 같이 드래그하면(onSelectionDragStop) 전부 같은 부모로 일괄 이동

import { useCallback, useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
} from "reactflow";
import "reactflow/dist/style.css";
import { Plus } from "lucide-react";

import type { Category, Project, Task } from "../api/types";
import { createCategory, updateCategory, deleteCategory, bulkUpdateCategoryParent } from "../api/categories";
import { createProject, updateProject, deleteProject, bulkUpdateProjects } from "../api/projects";
import { createTask, updateTask, deleteTask, bulkUpdateTasks } from "../api/tasks";
import { CategoryNode, type CategoryNodeData } from "./CategoryNode";
import { computeTreeLayout, type LayoutNode } from "./layout";
import { DEFAULT_COLOR_PALETTE } from "../api/categories";

const nodeTypes = { categoryNode: CategoryNode };

function keyOf(kind: "category" | "project" | "task", id: number) {
  return `${kind}-${id}`;
}

function parseKey(key: string): { kind: "category" | "project" | "task"; id: number } {
  const [kind, idStr] = key.split("-");
  return { kind: kind as "category" | "project" | "task", id: Number(idStr) };
}

function MindmapInner({
  userId,
  categories,
  projects,
  tasks,
  onRefresh,
}: {
  userId: number;
  categories: Category[];
  projects: Project[];
  tasks: Task[];
  onRefresh: () => void;
}) {
  const { getIntersectingNodes } = useReactFlow();

  const rename = useCallback((kind: "category" | "project" | "task", id: number, name: string) => {
    if (kind === "category") updateCategory(id, { name }).then(onRefresh);
    else if (kind === "project") updateProject(id, { name }).then(onRefresh);
    else updateTask(id, { title: name }).then(onRefresh);
  }, [onRefresh]);

  const remove = useCallback((kind: "category" | "project" | "task", id: number) => {
    if (kind === "category") deleteCategory(id).then(onRefresh);
    else if (kind === "project") deleteProject(id).then(onRefresh);
    else deleteTask(id).then(onRefresh);
  }, [onRefresh]);

  const addChildCategory = useCallback((parentId: number | null) => {
    const color = DEFAULT_COLOR_PALETTE[categories.length % DEFAULT_COLOR_PALETTE.length];
    createCategory({ user_id: userId, name: "새 카테고리", color, parent_id: parentId }).then(onRefresh);
  }, [categories.length, onRefresh, userId]);

  const addChildTask = useCallback((categoryId: number, projectId: number | null) => {
    createTask({ user_id: userId, category_id: categoryId, project_id: projectId, title: "새 task" }).then(onRefresh);
  }, [onRefresh, userId]);

  // --- 노드/엣지 구성 ---
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const layoutInput: LayoutNode[] = [];
    const edges: Edge[] = [];

    for (const c of categories) {
      layoutInput.push({ key: keyOf("category", c.id), parentKey: c.parent_id ? keyOf("category", c.parent_id) : null });
      if (c.parent_id) edges.push({ id: `e-${keyOf("category", c.parent_id)}-${keyOf("category", c.id)}`, source: keyOf("category", c.parent_id), target: keyOf("category", c.id) });
    }
    for (const p of projects) {
      const parentKey = p.parent_id
        ? keyOf("project", p.parent_id)
        : p.category_id
        ? keyOf("category", p.category_id)
        : null;
      layoutInput.push({ key: keyOf("project", p.id), parentKey });
      if (parentKey) edges.push({ id: `e-${parentKey}-${keyOf("project", p.id)}`, source: parentKey, target: keyOf("project", p.id) });
    }
    for (const t of tasks) {
      const parentKey = t.project_id ? keyOf("project", t.project_id) : keyOf("category", t.category_id);
      layoutInput.push({ key: keyOf("task", t.id), parentKey });
      edges.push({ id: `e-${parentKey}-${keyOf("task", t.id)}`, source: parentKey, target: keyOf("task", t.id) });
    }

    const positions = computeTreeLayout(layoutInput);

    const nodes: Node<CategoryNodeData>[] = [
      ...categories.map((c) => ({
        id: keyOf("category", c.id),
        type: "categoryNode",
        position: positions[keyOf("category", c.id)] ?? { x: 0, y: 0 },
        data: {
          label: c.name,
          color: c.color,
          kind: "category" as const,
          onRename: (name: string) => rename("category", c.id, name),
          onAddChild: () => addChildCategory(c.id),
          onDelete: () => remove("category", c.id),
        },
      })),
      ...projects.map((p) => ({
        id: keyOf("project", p.id),
        type: "categoryNode",
        position: positions[keyOf("project", p.id)] ?? { x: 0, y: 0 },
        data: {
          label: p.name,
          color: p.color,
          kind: "project" as const,
          onRename: (name: string) => rename("project", p.id, name),
          onAddChild: () => addChildTask(p.category_id ?? categories[0]?.id, p.id),
          onDelete: () => remove("project", p.id),
        },
      })),
      ...tasks.map((t) => ({
        id: keyOf("task", t.id),
        type: "categoryNode",
        position: positions[keyOf("task", t.id)] ?? { x: 0, y: 0 },
        data: {
          label: t.title,
          color: categories.find((c) => c.id === t.category_id)?.color ?? "#999",
          kind: "task" as const,
          expiresAt: t.expires_at,
          done: t.completed_at != null,
          onRename: (name: string) => rename("task", t.id, name),
          onDelete: () => remove("task", t.id),
        },
      })),
    ];

    return { nodes, edges };
  }, [categories, projects, tasks, rename, remove, addChildCategory, addChildTask]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // 새 데이터 들어오면 노드/엣지 갱신 (레이아웃은 매번 재계산 - layout.ts 주석 참고)
  useMemo(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialNodes, initialEdges]);

  // 드롭된 노드들을 겹친 대상 노드의 자식으로 재배치. kind가 다르면(예: task를 category 위로) 스키마 규칙에 맞게 처리.
  const reparentGroup = useCallback(
    async (draggedIds: string[], targetKey: string) => {
      const target = parseKey(targetKey);
      const byKind: Record<string, number[]> = { category: [], project: [], task: [] };
      for (const dragKey of draggedIds) {
        if (dragKey === targetKey) continue;
        const { kind, id } = parseKey(dragKey);
        byKind[kind].push(id);
      }

      if (byKind.category.length > 0 && target.kind === "category") {
        await bulkUpdateCategoryParent(byKind.category, target.id);
      }
      if (byKind.project.length > 0) {
        if (target.kind === "category") await bulkUpdateProjects(byKind.project, { category_id: target.id, parent_id: null });
        if (target.kind === "project") await bulkUpdateProjects(byKind.project, { parent_id: target.id, category_id: null });
      }
      if (byKind.task.length > 0) {
        if (target.kind === "category") await bulkUpdateTasks({ task_ids: byKind.task, category_id: target.id, project_id: null });
        if (target.kind === "project") await bulkUpdateTasks({ task_ids: byKind.task, project_id: target.id });
      }
      onRefresh();
    },
    [onRefresh]
  );

  const onNodeDragStop = useCallback(
    (_: unknown, node: Node) => {
      const overlaps = getIntersectingNodes(node).filter((n) => n.id !== node.id);
      if (overlaps.length > 0) reparentGroup([node.id], overlaps[0].id);
    },
    [getIntersectingNodes, reparentGroup]
  );

  const onSelectionDragStop = useCallback(
    (_: unknown, draggedNodes: Node[]) => {
      if (draggedNodes.length < 2) return;
      const draggedIds = new Set(draggedNodes.map((n) => n.id));
      // 선택된 그룹 중 하나라도 다른(선택 안 된) 노드와 겹치면 그걸 새 부모로 사용
      for (const n of draggedNodes) {
        const overlap = getIntersectingNodes(n).find((o) => !draggedIds.has(o.id));
        if (overlap) {
          reparentGroup(Array.from(draggedIds), overlap.id);
          return;
        }
      }
    },
    [getIntersectingNodes, reparentGroup]
  );

  return (
    <div className="h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onSelectionDragStop={onSelectionDragStop}
        selectionOnDrag
        panOnDrag={[1, 2]}
        selectNodesOnDrag={false}
        fitView
      >
        <Background gap={20} />
        <Controls showInteractive={false} />
      </ReactFlow>

      <button
        onClick={() => addChildCategory(null)}
        className="absolute bottom-4 left-4 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-foreground text-background text-xs font-medium shadow-sm hover:opacity-90"
      >
        <Plus size={13} /> 최상위 카테고리 추가
      </button>
    </div>
  );
}

export function MindmapView(props: {
  userId: number;
  categories: Category[];
  projects: Project[];
  tasks: Task[];
  onRefresh: () => void;
}) {
  // useReactFlow는 ReactFlowProvider 하위에서만 쓸 수 있어서 래핑
  return (
    <ReactFlowProvider>
      <MindmapInner {...props} />
    </ReactFlowProvider>
  );
}
