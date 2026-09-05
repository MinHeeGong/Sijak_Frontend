// src/app/lib/dataEvents.ts
// AI 채팅창에서 schedule_task 등을 호출해 DB가 바뀌어도, DailyTimeline/WeeklyGrid/
// MonthlyCalendar/CategoryView는 완전히 독립된 컴포넌트라 서로의 변경을 알 방법이 없었음
// (탭을 벗어났다 돌아와야만 우연히 재마운트되어 새로고침됨) - 이게 "AI는 추가했다는데
// 화면엔 안 보임" 버그의 실제 원인. window CustomEvent로 가볍게 "데이터 바뀜"을 방송.
const EVENT_NAME = "sijak:data-changed";

export function emitDataChanged() {
  window.dispatchEvent(new Event(EVENT_NAME));
}

// 컴포넌트에서: useEffect(() => onDataChanged(refetch), [refetch]);
export function onDataChanged(callback: () => void): () => void {
  window.addEventListener(EVENT_NAME, callback);
  return () => window.removeEventListener(EVENT_NAME, callback);
}
