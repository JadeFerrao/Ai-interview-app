import { serve } from "std/server";
import { createClient } from "supabase";


const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
        const groqApiKey = Deno.env.get('GROQ_API_KEY') ?? '';

        const supabase = createClient(supabaseUrl, supabaseKey);
        const { pathname, searchParams } = new URL(req.url);
        const action = pathname.split('/').pop();

        // Mapping old routes to actions
        // /api/interview/start -> action: start
        // /api/interview/answer -> action: answer
        // /api/interview/evaluation/:interviewId -> action: evaluation, id from param?
        // /api/interview/history/:userId -> action: history

        // For more flexibility, we can use search params or part of the path
        // We'll just check the action name

        if (req.method === 'POST') {
            const body = await req.json();

            if (action === 'start') {
                const { jobTitle, userId } = body;
                const systemPrompt = `You are a professional and friendly technical interviewer conducting a ${jobTitle} interview. 

Your role:
- Ask exactly 7 questions total, one at a time
- Be conversational and encouraging
- Ask a mix of technical skills, experience, and behavioral questions
- Keep questions concise and clear
- Show genuine interest in their answers

Start with a warm greeting and the first question.`;

                const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${groqApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: "llama-3.3-70b-versatile",
                        messages: [{ role: "system", content: systemPrompt }]
                    })
                });

                const groqData = await groqResponse.json();
                const firstQuestion = groqData.choices[0].message.content;

                const { data, error } = await supabase.from('interviews').insert([{
                    user_id: userId,
                    job_title: jobTitle,
                    transcript: [{ role: 'assistant', content: firstQuestion }],
                    question_count: 1
                }]).select();

                if (error) throw error;

                return new Response(JSON.stringify({ interviewId: data[0].id, question: firstQuestion, questionNumber: 1 }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                });
            }

            if (action === 'answer') {
                const { interviewId, answer, transcript } = body;

                // Validate answer quality
                const answerText = answer.trim();
                const wordCount = answerText.split(/\s+/).length;

                if (wordCount <= 3 || answerText.length < 20) {
                    return new Response(JSON.stringify({
                        nextMessage: "I appreciate your response, but could you elaborate more on that? In an interview, it's important to provide detailed answers that showcase your experience and thought process. Please expand on your answer with specific examples or more context.",
                        questionNumber: transcript.filter((m: any) => m.role === 'assistant').length,
                        isComplete: false,
                        needsElaboration: true
                    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
                }

                const { data: interview, error: fetchError } = await supabase
                    .from('interviews')
                    .select('*')
                    .eq('id', interviewId)
                    .single();

                if (fetchError) throw fetchError;

                const currentQuestionCount = interview.question_count || 1;
                const updatedTranscript = [...transcript, { role: 'user', content: answer }];
                const cleanedMessages = updatedTranscript.map(msg => ({ role: msg.role, content: msg.content }));

                if (currentQuestionCount >= 7) {
                    const evaluationPrompt = `Based on this interview transcript, provide a detailed evaluation of the candidate for the ${interview.job_title} position.

Rate the candidate on:
1. Technical Skills (1-10)
2. Communication (1-10)
3. Problem Solving (1-10)
4. Experience Relevance (1-10)
5. Overall Fit (1-10)

Provide:
- Individual scores with brief explanations
- Overall average score
- Key strengths (2-3 points)
- Areas for improvement (2-3 points)
- Final recommendation (Strong Hire / Hire / Maybe / No Hire)

Format your response clearly with sections.`;

                    cleanedMessages.push({ role: 'user', content: evaluationPrompt });

                    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${groqApiKey}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: cleanedMessages })
                    });

                    const groqData = await groqResponse.json();
                    const evaluation = groqData.choices[0].message.content;

                    await supabase.from('interviews').update({
                        transcript: updatedTranscript,
                        evaluation: evaluation,
                        completed: true
                    }).eq('id', interviewId);

                    return new Response(JSON.stringify({
                        isComplete: true,
                        evaluation: evaluation,
                        nextMessage: "Thank you for completing the interview! Let me prepare your evaluation..."
                    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
                }

                const nextQuestionCount = currentQuestionCount + 1;
                const interviewerPrompt = `You are continuing a ${interview.job_title} interview. This is question ${nextQuestionCount} of 7.

Guidelines:
- Acknowledge their previous answer briefly and naturally
- If their answer was good, acknowledge it; if it was weak or vague, gently note that more detail would be helpful in a real interview
- Ask the next relevant question based on their experience level
- Be conversational and encouraging but professional
- Keep it concise`;

                cleanedMessages.push({ role: 'system', content: interviewerPrompt });

                const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${groqApiKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: cleanedMessages })
                });

                const groqData = await groqResponse.json();
                const aiMessage = groqData.choices[0].message.content;

                const newTranscript = [...updatedTranscript, { role: 'assistant', content: aiMessage }];
                await supabase.from('interviews').update({
                    transcript: newTranscript,
                    question_count: nextQuestionCount
                }).eq('id', interviewId);

                return new Response(JSON.stringify({
                    nextMessage: aiMessage,
                    questionNumber: nextQuestionCount,
                    isComplete: false
                }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            if (action === 'profile-save') {
                const { userId, name } = body;
                const { data, error } = await supabase
                    .from('profiles')
                    .upsert({ user_id: userId, name: name })
                    .select();
                if (error) throw error;
                return new Response(JSON.stringify(data[0]), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }
        }

        if (req.method === 'GET') {
            const { pathname } = new URL(req.url);
            const parts = pathname.split('/');
            // Expected: /interview-handler/evaluation/:id or /interview-handler/history/:userId

            const action = parts[parts.length - 2];
            const id = parts[parts.length - 1];

            if (action === 'evaluation') {
                const { data, error } = await supabase
                    .from('interviews')
                    .select('evaluation, job_title, completed')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                if (!data.completed) {
                    return new Response(JSON.stringify({ error: 'Interview not yet completed' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
                }

                return new Response(JSON.stringify({
                    evaluation: data.evaluation,
                    jobTitle: data.job_title
                }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            if (action === 'history') {
                const { data, error } = await supabase
                    .from('interviews')
                    .select('id, job_title, created_at, completed')
                    .eq('user_id', id)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                return new Response(JSON.stringify(data || []), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            if (action === 'profile') {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('name')
                    .eq('user_id', id)
                    .single();

                if (error) return new Response(JSON.stringify({ name: null }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
                return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }
        }

        return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
})
