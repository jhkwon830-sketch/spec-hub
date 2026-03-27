# Spec Hub — 개발 컨텍스트

> 다른 컴퓨터에서 Claude와 작업 시작할 때 이 파일을 첨부하거나 붙여넣으세요.

---

## 사용자
- 제품 기획자, Claude와 함께 개발하는 방식 선호
- 짧고 직접적인 답변 선호
- 기술적 결정보다 제품/UX 관점에서 먼저 생각함
- 개인 사이드 프로젝트로 개발 중 (회사 귀속 방지 위해 개인 계정 사용)

---

## 제품 개요
MD 기반 기능명세 작성/공유/피드백 툴.

**포지셔닝**: "기획서는 MD로. 작성/공유/피드백은 여기서."
- MD 자체가 기획서 — 툴 없이도 개발자에게 전달 가능
- Notion처럼 플랫폼에 갇히지 않음
- 내부 툴로 쓰면서 다듬은 뒤 B2B SaaS 방향 검토 중

---

## 기술 스택
- Next.js 16 (App Router, TypeScript)
- Tailwind CSS v4
- CodeMirror 6 (MD 에디터)
- @xyflow/react (트리 시각화)
- marked.js + DOMPurify (MD 렌더링)
- mermaid.js (유저플로우)
- Supabase (PostgreSQL)
- Anthropic Claude API (AI 검토)

---

## DB 구조

```sql
workspaces       -- 제품/프로젝트 단위 (홈에서 관리)
documents        -- workspace_id + parent_id 계층
comments         -- 섹션 단위 인라인 코멘트
versions         -- 스냅샷 버전 관리
share_links      -- view/comment/suggest 권한별 공유링크
```

---

## 핵심 설계 결정

| 항목 | 결정 | 이유 |
|------|------|------|
| 문서 계층 | parent_id (폴더 없음) | 개발자가 폴더 구조 안 따라도 MD 내용으로 관계 표현 |
| 관계 표현 | MD 텍스트 헤더 자동 삽입 | `상위: X`, `하위: Y` — YAML 복잡, 링크는 파일명 바뀌면 깨짐 |
| 워크스페이스 | 별도 테이블 | 제품/프로젝트 단위 분리, 홈에서 관리 |
| 유저플로우 | 문서 단위 | 기능 하나 = 문서 하나 기준 |

---

## 화면 구성

```
홈(/)
  └─ 워크스페이스 카드 목록 (생성/이름변경/삭제)

/workspace/[id]
  └─ 첫 문서로 이동 or 빈 상태

/editor/[id]
  ├─ 좌: 사이드바 (파일트리 / 구조 탭)
  │       + 일괄 생성 (인덴트 텍스트 → 계층 자동 파싱)
  ├─ 중: MD 에디터 (CodeMirror 6)
  └─ 우: 미리보기 / 섹션트리 / 유저플로우
       + GNB: 구조도 보기 버튼 (50vw 드로어)
```

---

## 인프라
- GitHub: `github.com/jhkwon830-sketch/spec-hub`
- Supabase 개인 계정: jhkwon830@gmail.com
- Project ID: lznjrqjronxtdbazvbtq
- URL: `https://lznjrqjronxtdbazvbtq.supabase.co`

### 다른 컴퓨터 세팅
```bash
git clone https://github.com/jhkwon830-sketch/spec-hub.git
cd spec-hub
npm install
# .env.local 직접 생성 (gitignore라 GitHub에 없음)
npm run dev
```

### .env.local
```
ANTHROPIC_API_KEY=여기에_입력
NEXT_PUBLIC_SUPABASE_URL=https://lznjrqjronxtdbazvbtq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=여기에_입력
```

---

## 다음 작업
- [ ] 인증 (Supabase Auth)
- [ ] 워크스페이스 멤버 초대 + 권한
- [ ] AI 기능 강화 (초안 생성, 누락 항목 감지)
- [ ] 공유 링크 뷰어 UX 개선
- [ ] 이메일 알림 (코멘트 시)
