// 브라우저 저장소(localStorage)에 데이터를 읽고 쓰는 부분입니다.
// 저장 이름: memos(메모), todos(할 일), events(일정)
const Store = {
  load(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch (e) {
      return [];
    }
  },
  save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      alert("저장하지 못했어요. 브라우저 저장 공간이 부족하거나 사용할 수 없는 상태예요.");
    }
  },
  newId(prefix) {
    return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
};
