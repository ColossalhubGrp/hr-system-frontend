import { openai } from "@ai-sdk/openai"
import { streamText } from "ai"
import { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { jobTitle, industry, tone } = body || {}

        if (!jobTitle || !industry || !tone) {
            return Response.json(
                { error: "Missing required fields: jobTitle, industry, or tone" },
                { status: 400 }
            )
        }

        const result = await streamText({
            model: openai("gpt-4"),
            temperature: 0.5,
            messages: [
                {
                    role: "system",
                    content:
                        "You are an experienced HR professional. Generate concise, professional job descriptions in HTML format with only the sections requested.",
                },
                {
                    role: "user",
                    content: `Generate a job description for ${jobTitle} in the ${industry} industry with a ${tone} tone.

Include ONLY the following sections:
1. **Overall Purpose** - Clear, concise purpose statement
2. **Primary Duties** - 10-12 duties using "by" to establish connections

Do NOT include education, experience, KSAO, skills, or any other sections.

Format requirements:
- Return in HTML format (no body tag)
- Add <br> before each heading
- Keep the description focused and professional
- Relate responsibilities to the ${industry} industry
- Use ${tone} language throughout`,
                },
            ],
        })

        return result.toTextStreamResponse()
    } catch (error) {
        console.error("Error generating job description:", error)
        return Response.json(
            { error: "Failed to generate job description" },
            { status: 500 }
        )
    }
}
