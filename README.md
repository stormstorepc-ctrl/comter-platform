# 컴터어때 (COMTER)

기존 `comter.html` 화면을 유지하고 고객/업체/관리자 인증과 업체 승인 관리 기능을 추가한 별도 플랫폼입니다.

## 주요 기능
- 고객 회원가입/로그인
- 업체 회원가입 → 관리자 승인 대기
- 승인된 업체만 업체 로그인 가능
- 관리자 로그인: Render 환경변수 `ADMIN_USER`, `ADMIN_PASSWORD`
- 관리자센터: 고객 조회/삭제, 업체 조회/승인/승인취소/삭제
- PostgreSQL 기반 데이터 저장
- `/api/health` 서버/DB 상태 확인

## Render 환경변수
- `DATABASE_URL`: Render PostgreSQL 연결 문자열 (render.yaml 사용 시 자동 연결)
- `JWT_SECRET`: 자동 생성
- `ADMIN_USER`: 관리자 아이디
- `ADMIN_PASSWORD`: 관리자 비밀번호

기존 `mycom-v4` 저장소는 이 프로젝트에서 참조하거나 수정하지 않습니다.
