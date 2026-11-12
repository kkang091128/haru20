// Cloudflare Pages Functions — 주소: /api/chat
// API 키는 코드에 쓰지 않고, Cloudflare 대시보드의 환경 변수 GEMINI_API_KEY 에 넣습니다.

// ① 사용할 모델 (AI Studio에서 최신 이름 확인 후 바꿔도 됩니다)
const MODEL = "gemini-flash-latest";

// ② 챗봇의 성격과 역할 — 내 사이트 주제에 맞게 고치세요!
const SYSTEM = `너는 '목포 여행 안내' 사이트의 친절한 안내원이야.
- 목포 여행(유달산, 해상케이블카, 갓바위, 근대역사문화공간, 맛집)에 대해서만 답해.
- 관계없는 질문에는 "저는 목포 여행만 안내해요 😊" 라고 답해.
- 답변은 3~5문장, 쉬운 말로, 이모지 1~2개.`;

export async function onRequestPost({ request, env }) {
  try {
    const { messages = [] } = await request.json();

    // 최근 대화 10개만, 한 메시지 1000자까지만 (무료 사용량 아끼기)
    const contents = messages.slice(-10).map((m) => ({
      role: m.role === "model" ? "model" : "user",
      parts: [{ text: String(m.text || "").slice(0, 1000) }],
    }));

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents,
        }),
      }
    );

    const data = await res.json();
    if (!res.ok) {
      console.log("Gemini 오류:", JSON.stringify(data));
      const msg = res.status === 429
        ? "지금 질문이 많아요. 1분 뒤에 다시 물어봐 주세요 🙏"
        : "잠시 문제가 생겼어요. 조금 뒤에 다시 시도해 주세요.";
      return Response.json({ reply: msg }, { status: 200 });
    }

    const reply =
      data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") ||
      "답변을 만들지 못했어요. 다르게 물어봐 주세요.";
    return Response.json({ reply });
  } catch (e) {
    return Response.json({ reply: "요청을 처리하지 못했어요." }, { status: 200 });
  }
}
