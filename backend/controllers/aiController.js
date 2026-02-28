const Groq = require('groq-sdk');
const { createClient } = require('@supabase/supabase-js');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_KEY);

exports.startInterview = async (req, res) => {
  const { jobTitle, userId } = req.body;

  console.log('Starting interview for:', { jobTitle, userId });

  const systemPrompt = `You are a professional and friendly technical interviewer conducting a ${jobTitle} interview. 

Your role:
- Ask exactly 7 questions total, one at a time
- Be conversational and encouraging
- Ask a mix of technical skills, experience, and behavioral questions
- Keep questions concise and clear
- Show genuine interest in their answers

Start with a warm greeting and the first question.`;

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "system", content: systemPrompt }]
    });

    const firstQuestion = response.choices[0].message.content;
    console.log('Got first question from Groq');

    // Save new interview to Supabase
    const { data, error } = await supabase.from('interviews').insert([{
      user_id: userId,
      job_title: jobTitle,
      transcript: [{ role: 'assistant', content: firstQuestion }],
      question_count: 1
    }]).select();

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    console.log('Interview saved to database');
    res.json({ interviewId: data[0].id, question: firstQuestion, questionNumber: 1 });
  } catch (err) {
    console.error('startInterview error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.processAnswer = async (req, res) => {
  const { interviewId, answer, transcript } = req.body;

  console.log('Processing answer for interview:', interviewId);

  try {
    // Validate answer quality
    const answerLength = answer.trim().length;
    const wordCount = answer.trim().split(/\s+/).length;

    // If answer is too short, push back
    if (wordCount <= 3 || answerLength < 20) {
      return res.json({
        nextMessage: "I appreciate your response, but could you elaborate more on that? In an interview, it's important to provide detailed answers that showcase your experience and thought process. Please expand on your answer with specific examples or more context.",
        questionNumber: transcript.filter(m => m.role === 'assistant').length,
        isComplete: false,
        needsElaboration: true
      });
    }

    // Get current interview data
    const { data: interview, error: fetchError } = await supabase
      .from('interviews')
      .select('*')
      .eq('id', interviewId)
      .single();

    if (fetchError) throw new Error(`Failed to fetch interview: ${fetchError.message}`);

    const currentQuestionCount = interview.question_count || 1;
    const updatedTranscript = [...transcript, { role: 'user', content: answer }];

    // Clean messages - remove any extra properties like 'id' that Groq doesn't accept
    const cleanedMessages = updatedTranscript.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Check if we've reached 7 questions
    if (currentQuestionCount >= 7) {
      // Generate evaluation
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

      const evaluationResponse = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: cleanedMessages
      });

      const evaluation = evaluationResponse.choices[0].message.content;

      // Update interview with evaluation
      await supabase
        .from('interviews')
        .update({
          transcript: updatedTranscript,
          evaluation: evaluation,
          completed: true
        })
        .eq('id', interviewId);

      return res.json({
        isComplete: true,
        evaluation: evaluation,
        nextMessage: "Thank you for completing the interview! Let me prepare your evaluation..."
      });
    }

    // Continue with next question
    const nextQuestionCount = currentQuestionCount + 1;
    const interviewerPrompt = `You are continuing a ${interview.job_title} interview. This is question ${nextQuestionCount} of 7.

Guidelines:
- Acknowledge their previous answer briefly and naturally
- If their answer was good, acknowledge it; if it was weak or vague, gently note that more detail would be helpful in a real interview
- Ask the next relevant question based on their experience level
- Be conversational and encouraging but professional
- Keep it concise`;

    cleanedMessages.push({ role: 'system', content: interviewerPrompt });

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: cleanedMessages
    });

    const aiMessage = response.choices[0].message.content;

    // Update transcript and question count
    const newTranscript = [...updatedTranscript, { role: 'assistant', content: aiMessage }];
    await supabase
      .from('interviews')
      .update({
        transcript: newTranscript,
        question_count: nextQuestionCount
      })
      .eq('id', interviewId);

    res.json({
      nextMessage: aiMessage,
      questionNumber: nextQuestionCount,
      isComplete: false
    });
  } catch (err) {
    console.error('processAnswer error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getEvaluation = async (req, res) => {
  const { interviewId } = req.params;

  console.log('Fetching evaluation for interview:', interviewId);

  try {
    const { data, error } = await supabase
      .from('interviews')
      .select('evaluation, job_title, completed')
      .eq('id', interviewId)
      .single();

    if (error) throw new Error(`Failed to fetch evaluation: ${error.message}`);

    if (!data.completed) {
      return res.status(400).json({ error: 'Interview not yet completed' });
    }

    res.json({
      evaluation: data.evaluation,
      jobTitle: data.job_title
    });
  } catch (err) {
    console.error('getEvaluation error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getHistory = async (req, res) => {
  const { userId } = req.params;

  console.log('Fetching history for user:', userId);

  try {
    const { data, error } = await supabase
      .from('interviews')
      .select('id, job_title, created_at, completed')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch history: ${error.message}`);

    res.json(data || []);
  } catch (err) {
    console.error('getHistory error:', err);
    res.status(500).json({ error: err.message });
  }
};
