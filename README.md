# 본사 ISO 45001 운영 프로그램 (웹 버전)

포스코인터내셔널 안전기획실

Power Apps 앱(P-AUDIT_ISO45001.msapp)과 같은 6개 화면을 브라우저에서 쓰도록 만든 정적 웹 앱입니다.
빌드 과정이 없는 HTML/CSS/JS라서 Vercel에 그대로 배포됩니다.

| 화면 | 내용 |
|---|---|
| 준비 현황 | 진척률 4종, 빈출 미완료 알림, 조항별 막대, 마감 임박 할 일 |
| 조항별 체크리스트 | 준비항목 41건, 조항·상태·빈출 필터와 검색, 등록·수정·삭제 |
| 증빙문서 대장 | 증빙 48건, 유지/보유, 확보 상태, 보관 위치 링크, 1년 경과 경고 |
| 예상질문 | 31문항, 답변 골자·답변자·준비 상태 |
| 부적합·시정조치 | 출처·등급·원인·조치·기한, 기한 초과 표시 |
| 심사 당일 요약 | 심사일·인증기관·내 이름·적용범위 설정, 남은 빈출 항목, 백업 |

## 데이터 저장 방식
- **Supabase 연결 시(공유 모드)**: 모든 데이터가 Supabase `iso_records` 테이블에 저장되어 접속한 사람 모두가 같은 데이터를 봅니다. 다른 사람이 바꾼 내용은 30초마다 자동으로 반영됩니다. "내 이름"만 각자 브라우저에 저장됩니다.
- **연결이 없을 때**: 예전처럼 각자 브라우저(localStorage)에만 저장됩니다.
- 브라우저는 Supabase에 직접 접속하지 않습니다. Vercel 서버 함수(`api/records.js`)가 환경변수의 키로만 접근하므로 키가 화면에 노출되지 않습니다.
- 백업 파일 내려받기/불러오기는 두 모드 모두에서 쓸 수 있습니다. 처음 Supabase에 연결하면 그 브라우저에 있던 데이터가 공유 저장소로 올라갑니다.

## Supabase 연결 방법
1. https://supabase.com 에서 New project 생성 (Region: Northeast Asia (Seoul) 권장)
2. 왼쪽 **SQL Editor** → `supabase/schema.sql` 내용을 붙여넣고 **Run**
3. **Project Settings → API Keys**(또는 Data API)에서 아래 두 값을 복사
   - Project URL (예: `https://abcd1234.supabase.co`)
   - secret 키(`sb_secret_…`) 또는 예전 `service_role` 키
4. Vercel 프로젝트 → **Settings → Environment Variables**에 추가 (Production·Preview 모두 체크)

| 이름 | 값 |
|---|---|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | secret / service_role 키 |
| `APP_ACCESS_CODE` | (권장) 직원끼리 공유할 접속 코드. 처음 접속할 때 한 번 묻습니다 |

5. Vercel **Deployments** → 최신 배포 ⋯ → **Redeploy**
6. 사이트 왼쪽 아래에 "● 공유 저장소 연결됨"이 보이면 완료입니다.

## 로컬 실행
```
python3 -m http.server 8080
```
브라우저에서 http://localhost:8080 을 엽니다.

## Vercel 배포
1. Vercel → Add New → Project → 이 GitHub 저장소 선택
2. Framework Preset: **Other**, Build Command 비움, Output Directory 비움(루트)
3. Deploy

`vercel.json`에 검색엔진 차단(noindex)과 보안 헤더가 들어 있습니다.
배포 주소를 아는 사람은 누구나 열 수 있으므로, 사내 전용으로 쓰려면 Vercel 프로젝트 설정의
**Deployment Protection**(Vercel Authentication 또는 Password Protection)을 켜세요.
