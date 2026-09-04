// src/app/category/layout.ts
// 노드 x,y를 저장하는 컬럼이 스키마에 없어서(의도적으로 단순하게 유지),
// 로드될 때마다 parent 관계로 방사형 트리 레이아웃을 계산함.
// 유저가 드래그로 위치를 바꿔도 새로고침하면 다시 이 레이아웃으로 초기화됨.
// -> 위치를 영구 저장하고 싶어지면 나중에 categories/projects/tasks에
//    mindmap_x, mindmap_y 컬럼을 추가하는 걸 고려 (지금은 스코프 밖으로 뺌).

export interface LayoutNode {
  key: string; // 'cat-1', 'proj-2', 'task-3'
  parentKey: string | null;
}

const X_GAP = 240;
const Y_GAP = 90;

export function computeTreeLayout(nodes: LayoutNode[]): Record<string, { x: number; y: number }> {
  const childrenOf: Record<string, string[]> = {};
  const roots: string[] = [];

  for (const n of nodes) {
    if (n.parentKey == null) {
      roots.push(n.key);
    } else {
      (childrenOf[n.parentKey] ??= []).push(n.key);
    }
  }

  const positions: Record<string, { x: number; y: number }> = {};
  let cursorY = 0;

  function place(key: string, depth: number): number {
    const children = childrenOf[key] ?? [];
    if (children.length === 0) {
      const y = cursorY;
      positions[key] = { x: depth * X_GAP, y: y * Y_GAP };
      cursorY += 1;
      return y;
    }
    const childYs = children.map((c) => place(c, depth + 1));
    const avgY = childYs.reduce((a, b) => a + b, 0) / childYs.length;
    positions[key] = { x: depth * X_GAP, y: avgY * Y_GAP };
    return avgY;
  }

  for (const root of roots) place(root, 0);

  return positions;
}
