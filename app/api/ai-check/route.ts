import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(req: NextRequest) {
  const { content } = await req.json()

  if (!content?.trim()) {
    return NextResponse.json({ result: '내용이 없습니다.' })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({
      result: 'ANTHROPIC_API_KEY가 설정되지 않았습니다.\n.env.local 파일에 ANTHROPIC_API_KEY를 추가해주세요.',
    })
  }

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `다음은 서비스 기능명세 문서입니다. 아래 관점에서 검토해주세요:

1. **누락된 항목**: 기능명세에서 빠진 중요 내용 (에러처리, 예외케이스 등)
2. **섹션 간 충돌**: 서로 모순되거나 불일치하는 내용
3. **모호한 표현**: 개발자가 구현하기 어려운 불명확한 요구사항
4. **의존성 문제**: 한 기능이 다른 기능을 참조하는데 해당 기능이 명세에 없는 경우

각 항목은 간결하게 bullet point로, 문제가 없으면 "✓ 검토 완료 - 특이사항 없음"이라고 해주세요.

---
${content}`,
        },
      ],
    })

    const result = message.content[0].type === 'text' ? message.content[0].text : ''
    return NextResponse.json({ result })
  } catch (error) {
    console.error('AI check error:', error)
    return NextResponse.json({ result: 'AI 검토 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
