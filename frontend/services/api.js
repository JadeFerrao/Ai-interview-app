const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/interview-handler`;


export async function startInterview(role, userId) {
  try {
    const response = await fetch(`${FUNCTION_URL}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ jobTitle: role, userId }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || 'Unknown error'}`);
    }
    return await response.json();
  } catch (error) {
    console.error('startInterview error:', error);
    // Return a mock response so the UI doesn't crash when backend is offline
    return {
      interviewId: 'mock-id-' + Date.now(),
      question: `Welcome! Let's wait for your ${role} interview to start.`,
      questionNumber: 1,
    };
  }
}

export async function sendAnswer(interviewId, answer, history) {
  const maxRetries = 3;
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(`${FUNCTION_URL}/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ interviewId, answer, transcript: history }),
      });

      if (!response.ok) {
        lastError = new Error(`HTTP error! status: ${response.status}`);

        // Only retry on 500 errors, not on 4xx client errors
        if (response.status >= 500 && attempt < maxRetries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // Exponential backoff, max 5s
          console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw lastError;
      }

      return await response.json();
    } catch (error) {
      lastError = error;

      // If it's a network error and we have retries left, try again
      if (attempt < maxRetries - 1 && error.message.includes('fetch')) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        console.log(`Network error, retry ${attempt + 1}/${maxRetries} after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  // All retries failed, handle gracefully
  console.error('sendAnswer error after retries:', lastError);

  // Check answer quality for mock response
  const answerLength = answer.trim().length;
  const wordCount = answer.trim().split(/\s+/).length;

  // If answer is too short or just "yes/no", push back
  if (wordCount <= 3 || answerLength < 15) {
    return {
      nextMessage: "I appreciate your response, but could you elaborate more on that? In a real interview, we'd want to hear more details about your experience and thought process. Please provide a more comprehensive answer.",
      isComplete: false,
      questionNumber: history.filter(m => m.role === 'assistant').length,
    };
  }

  // Return a mock response that's more realistic
  const questionNum = history.filter(m => m.role === 'assistant').length;
  return {
    nextMessage: "Thank you for sharing that. Let me ask you another question to better understand your skills.",
    isComplete: false,
    questionNumber: questionNum + 1,
  };
}

export async function getEvaluation(interviewId) {
  try {
    const response = await fetch(`${FUNCTION_URL}/evaluation/${interviewId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('getEvaluation error:', error);

    // Return a more detailed mock evaluation
    return {
      evaluation: `Thank you for completing this interview practice session!\n\nWhile we couldn't connect to the evaluation service, here's what you should focus on:\n\n✓ Provide detailed, thoughtful answers\n✓ Use specific examples from your experience\n✓ Explain your reasoning and decision-making process\n✓ Show enthusiasm and genuine interest\n\nRemember: One-word answers like "yes" or "no" won't showcase your skills. Take your time to elaborate on your thoughts and experiences.\n\nKeep practicing, and you'll do great in your real interview!`,
      jobTitle: 'Developer',
    };
  }
}

export async function getHistory(userId) {
  try {
    const response = await fetch(`${FUNCTION_URL}/history/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error('getHistory error:', error);
    return [];
  }
}

export async function getProfile(userId) {
  try {
    const response = await fetch(`${FUNCTION_URL}/profile/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
    });
    if (!response.ok) return { name: null };
    return await response.json();
  } catch (error) {
    return { name: null };
  }
}

export async function saveProfile(userId, name) {
  try {
    const response = await fetch(`${FUNCTION_URL}/profile-save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ userId, name }),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('saveProfile error:', error);
    return null;
  }
}