// 내 컴퓨터에서 메모정리장을 열어 보기 위한 간단한 서버입니다. (Vercel 배포와는 상관없음)
// 실행: npm start  →  브라우저에서 http://localhost:5000 접속
// 포트 번호를 바꾸고 싶으면 아래 PORT 값을 고치세요.
const PORT = 5000;

const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon",
};
// 화면에 필요한 파일만 보여줍니다 (PRD.md, server.js 같은 내부 파일은 숨김)
const allowed = ["/index.html", "/style.css", "/app.js", "/storage.js"];

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  if (!allowed.includes(p)) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("없는 페이지예요");
  }
  fs.readFile(path.join(root, p), (err, data) => {
    if (err) { res.writeHead(500); return res.end("읽기 실패"); }
    res.writeHead(200, { "Content-Type": types[path.extname(p)] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(data);
  });
}).listen(PORT, () => console.log("메모정리장 실행 중 → http://localhost:" + PORT));
