export const groups = [
  {
    id: 'room',
    title: '집 상태',
    icon: 'house',
    description: '면적 · 채광 · 수압',
    items: [
      { id: 'daylight', title: '채광', tip: '불을 끄고 방 안쪽까지 빛이 드는지 보세요. 창 앞을 가리는 건물도 확인하세요.' },
      { id: 'ventilation', title: '환기와 창문', tip: '창문을 직접 열고 닫아 보세요. 바람이 통하는지, 창틀과 방충망에 틈이 있는지 살펴보세요.' },
      { id: 'damp', title: '곰팡이와 누수', tip: '창틀 아래, 천장 모서리, 싱크대 아래의 얼룩과 들뜬 벽지를 살펴보세요.' },
      { id: 'water', title: '수압과 온수', tip: '샤워기와 세면대를 함께 틀어 물줄기가 약해지는지, 온수가 계속 나오는지 보세요.' },
      { id: 'drain', title: '배수와 냄새', tip: '변기를 내려 보고 욕실 바닥에 물을 흘려보세요. 물 고임과 하수구 냄새를 확인하세요.' },
      { id: 'heat', title: '냉난방과 옵션', tip: '보일러와 에어컨을 켜 보고, 두고 갈 냉장고·세탁기의 작동 상태를 확인하세요.' },
      { id: 'layout', title: '가구 자리와 콘센트', tip: '침대와 책상을 둘 벽을 재고, 문을 열 공간과 콘센트 위치를 확인하세요.' },
      { id: 'area-direction', title: '면적과 방향의 기준', tip: '면적이 전용인지 공급인지 확인하세요. 남향 표시도 거실과 큰방 중 어느 창 기준인지 물어보세요.' },
    ],
  },
  {
    id: 'area',
    title: '주변 환경',
    icon: 'map',
    description: '소음 · 교통 · 안전',
    items: [
      { id: 'noise', title: '도로와 이웃 소음', tip: '창문을 열었을 때와 닫았을 때의 차 소리, 복도에서 들리는 소리를 비교하세요.' },
      { id: 'transit', title: '출퇴근 동선', tip: '주로 이용할 역이나 정류장까지 직접 걸어 보세요. 언덕과 횡단보도 대기 시간도 포함하세요.' },
      { id: 'night', title: '밤 귀갓길', tip: '큰길에서 현관까지 골목의 가로등과 사각지대를 보세요. 낮에 봤다면 저녁에 한 번 더 걸어보세요.' },
      { id: 'entry', title: '현관과 창문 잠금', tip: '공동현관 문이 저절로 잠기는지, 방 안에서 도어록과 창문 잠금쇠가 작동하는지 보세요.' },
      { id: 'privacy', title: '창밖 시선', tip: '창가에 서서 맞은편 집이나 길에서 방 안이 얼마나 보이는지 확인하세요.' },
      { id: 'facilities', title: '생활 시설', tip: '장을 볼 곳과 쓰레기 배출 장소를 확인하세요. 건물 1층 가게의 소음과 냄새도 살펴보세요.' },
      { id: 'parking-access', title: '주차와 층 이동', tip: '내 차의 주차 자리와 별도 요금을 물어보세요. 실제 층수와 엘리베이터 유무, 계단 동선도 확인하세요.' },
    ],
  },
  {
    id: 'terms',
    title: '비용·계약',
    icon: 'file-check',
    description: '관리비 · 등기 · 보증금',
    items: [
      { id: 'monthly-cost', title: '월세와 관리비', tip: '수도·전기·가스·난방·인터넷의 포함 여부와 별도 요금을 묻고, 여름·겨울 관리비 고지서를 확인하세요.' },
      { id: 'prices', title: '주변 실거래가', tip: '계약금 전에 비슷한 면적·연식의 매매가와 전월세 거래액을 찾아 보증금과 비교하세요.' },
      { id: 'building', title: '주소와 건축물대장', tip: '계약 전 대장의 주소·용도·위반 표시를 보고, 실제 방문한 집의 층·호수와 계약서를 대조하세요.' },
      { id: 'registry', title: '등기부의 소유자와 빚', tip: '계약 전 최신 등기부의 갑구에서 소유자·압류를, 을구에서 근저당과 채권최고액을 확인하세요.' },
      { id: 'priority', title: '앞선 보증금과 세금', tip: '계약 전 임대인의 국세·지방세 납세증명서를 요청하세요. 다가구라면 먼저 들어온 세입자의 보증금 총액도 확인하세요.' },
      { id: 'guarantee', title: '보증금 반환보증', tip: '전세라면 계약 전에 보증기관에 주소와 보증금을 알려 가입 조건과 신청 기한을 확인하세요.' },
      { id: 'payee', title: '계약 상대와 입금 계좌', tip: '등기상 소유자와 신분증·예금주를 대조하세요. 대리 계약이면 위임장을 보고 집주인에게 직접 확인하세요.' },
      { id: 'agreement', title: '수리 약속과 특약', tip: '제공되는 옵션과 고장 상태를 사진으로 남기세요. 수리할 사람과 기한, 빠진 옵션의 설치 약속을 계약서에 적으세요.' },
      { id: 'occupancy-rules', title: '입주일과 생활 조건', tip: '실제 입주 가능한 날짜를 확인하세요. 반려동물·주차 등 합의한 조건도 계약서에 남기세요.' },
      { id: 'balance', title: '잔금 직전 등기 재확인', tip: '잔금을 보내기 직전에 등기부를 다시 열어 계약 이후 소유자가 바뀌거나 새 근저당이 생겼는지 보세요.' },
      { id: 'move-in', title: '확정일자와 전입신고', tip: '계약서에 확정일자를 받고 입주 당일 전입신고를 하세요. 집을 넘겨받고 전입신고를 마치면 다음 날부터 대항력이 생겨요.' },
    ],
  },
];

export const sources = [
  {
    label: '구로구청 · 면적·방향·관리비 확인 기준',
    url: 'https://www.guro.go.kr/www/contents.do?key=4498',
    groups: ['room', 'area', 'terms'],
  },
  {
    label: '국가기술표준원 · ㎡와 평 환산',
    url: 'https://www.kats.go.kr/content.do?cmsid=78',
    groups: ['room'],
  },
  {
    label: '국토교통부 · 전용면적과 공급면적',
    url: 'https://www.korea.kr/news/policyNewsView.do?newsId=148890758',
    groups: ['room'],
  },
  {
    label: '충북대학교 · 주거독립 강의자료',
    url: 'https://kocw.net/home/search/kemView.do?kemId=1471419',
    groups: ['room', 'area'],
  },
  {
    label: '국토교통부 · 실거래가 조회',
    url: 'https://rt.molit.go.kr/',
    groups: ['terms'],
  },
  {
    label: '주택도시보증공사 · 계약 전후 체크리스트',
    url: 'https://www.khug.or.kr/hug/web/ci/cc/cicc000021.jsp',
    groups: ['terms'],
  },
  {
    label: '찾기쉬운 생활법령정보 · 보증금 보호',
    url: 'https://www.easylaw.go.kr/CSP/CnpClsMain.laf?ccfNo=2&cciNo=3&cnpClsNo=1&csmSeq=629',
    groups: ['terms'],
  },
];
