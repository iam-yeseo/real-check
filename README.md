# 집수첩

자취방을 보면서 주소별로 체크 결과와 장단점을 기록하는 모바일 웹입니다.

- **새 집 기록**: 주소, 별칭, 방문일, 계약 유형, 보증금·월세·관리비를 입력합니다. 금액 단위는 만 원입니다.
- **체크리스트**: 집 상태 7개, 주변 환경 6개, 비용·계약 10개를 양호 또는 주의로 표시합니다. 선택한 상태를 다시 누르면 미확인으로 돌아갑니다.
- **장단점 · 메모**: 입력하는 즉시 저장합니다. 하트를 누른 기록은 ‘관심 있는 집’에서 찾을 수 있습니다.
- **집 비교**: 방문 기록이 2개 이상이면 두 집의 월세·관리비 합계, 장단점, 항목별 확인 수를 나란히 볼 수 있습니다. 미입력 금액은 0원으로 계산하지 않습니다.

## 실행

Node.js 22 이상에서 실행합니다.

```sh
npm ci
npm run dev
```

브라우저에서 [로컬 앱](http://localhost:8787)을 엽니다. 정적 HTML·CSS·JavaScript를 사용하므로 별도 빌드가 없습니다.

## Cloudflare Workers 배포

```sh
npx wrangler login
npm run deploy
```

또는 Cloudflare 대시보드에서 Workers에 이 GitHub 저장소를 연결하고, 프로덕션 브랜치 `main`, 루트 디렉터리 `/`, 빌드 명령은 비워 둔 상태, 배포 명령 `npm run deploy`를 선택합니다. [Workers Git 연동](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/) · [Workers 정적 자산](https://developers.cloudflare.com/workers/static-assets/)

`wrangler.jsonc`가 `public/`만 배포합니다. 별도 DB 바인딩이나 앱용 API 키는 필요하지 않습니다.

## 기록과 오프라인

주소와 메모는 이 사이트를 연 브라우저의 localStorage에만 저장합니다. 같은 기기에서도 브라우저나 도메인이 다르면 기록이 공유되지 않습니다. 사이트 데이터를 삭제하면 기록도 삭제됩니다. 일반 브라우저에서 배포 주소를 한 번 열어 리소스가 캐시되면, 인터넷 연결 없이도 체크·메모·다시 열기가 가능합니다. 외부 참고 자료 열기는 인터넷 연결이 필요합니다.

## 자료

- [충북대학교 KOCW 강의자료](https://kocw.net/home/search/kemView.do?kemId=1471419): 집 상태와 생활 환경 점검
- [국토교통부 실거래가 공개시스템](https://rt.molit.go.kr/): 주변 가격 비교
- [주택도시보증공사 셀프 체크 리스트](https://www.khug.or.kr/hug/web/ci/cc/cicc000021.jsp): 계약 전후 보증금 관련 확인사항
- [찾기쉬운 생활법령정보](https://www.easylaw.go.kr/CSP/CnpClsMain.laf?ccfNo=2&cciNo=3&cnpClsNo=1&csmSeq=629): 대항력·보증금 보호

## 검증 및 변경

`npm test`로 방문 기록 모델을, `npm run check:deploy`로 배포 구성을 확인합니다. 체크 항목은 `public/content.js`에 있습니다. 사용자의 저장 기록과 연결되므로 기존 항목 ID는 유지하세요. 정적 파일을 변경하면 `public/sw.js`의 캐시 버전을 올리고 파일 목록도 갱신하세요.
