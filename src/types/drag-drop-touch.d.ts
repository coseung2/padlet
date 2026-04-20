// dj-played-delete-touchdrag — 이 패키지는 타입 선언 없이 배포되는 side-effect
// 전용 폴리필. import 시점에 `document`에 touchstart 리스너를 달아 HTML5 DnD
// 이벤트를 터치 환경에서 합성해준다. 별도 API를 쓰지 않으므로 빈 모듈 선언.
declare module "drag-drop-touch";
