import { supabase } from './supabase';

const getSupabaseConfig = () => {
  return {
    url: process.env.EXPO_PUBLIC_SUPABASE_URL,
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  };
};

const getFunctionUrl = () => {
  const { url } = getSupabaseConfig();
  if (!url) return null;
  return `${url}/functions/v1/interview-handler`;
};

const getHeaders = async () => {
  const { anonKey } = getSupabaseConfig();
  const { data: { session } } = await supabase.auth.getSession();

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token || anonKey}`,
    'apikey': anonKey
  };
};


export async function startInterview(role, userId) {
  const FUNCTION_URL = getFunctionUrl();
  if (!FUNCTION_URL) throw new Error('Supabase URL not configured');

  try {
    const response = await fetch(`${FUNCTION_URL}/start`, {
      method: 'POST',
      headers: await getHeaders(),
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
      question: `Welcome! I'm your interviewer today. Since we're having connection issues, let's start with a general question: Tell me about your experience as a ${role}.`,
      questionNumber: 1,
    };
  }
}

export async function sendAnswer(interviewId, answer, history) {
  const FUNCTION_URL = getFunctionUrl();
  const maxRetries = 3;
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(`${FUNCTION_URL}/answer`, {
        method: 'POST',
        headers: await getHeaders(),
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

  // Return a mock response that's more realistic
  return {
    nextMessage: "Thank you for sharing that. I'm having a bit of trouble connecting to my brain right now, but please continue telling me more about your skills.",
    isComplete: false,
    questionNumber: history.filter(m => m.role === 'assistant').length + 1,
  };
}

export async function getEvaluation(interviewId) {
  const FUNCTION_URL = getFunctionUrl();
  try {
    const response = await fetch(`${FUNCTION_URL}/evaluation/${interviewId}`, {
      method: 'GET',
      headers: await getHeaders(),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('getEvaluation error:', error);
    return {
      evaluation: `Great job completing the practice! We're having trouble generating your detailed AI evaluation right now, but keep practicing to stay sharp.`,
      jobTitle: 'Developer',
    };
  }
}

export async function getHistory(userId) {
  const FUNCTION_URL = getFunctionUrl();
  try {
    const response = await fetch(`${FUNCTION_URL}/history/${userId}`, {
      method: 'GET',
      headers: await getHeaders(),
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
  const FUNCTION_URL = getFunctionUrl();
  try {
    const response = await fetch(`${FUNCTION_URL}/profile/${userId}`, {
      method: 'GET',
      headers: await getHeaders(),
    });
    if (!response.ok) return { name: null };
    return await response.json();
  } catch (error) {
    return { name: null };
  }
}

export async function saveProfile(userId, name) {
  const FUNCTION_URL = getFunctionUrl();
  try {
    const response = await fetch(`${FUNCTION_URL}/profile-save`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ userId, name }),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('saveProfile error:', error);
    return null;
  }
}

export async function searchProfile(name) {
  const FUNCTION_URL = getFunctionUrl();
  try {
    const response = await fetch(`${FUNCTION_URL}/profile-search?name=${encodeURIComponent(name)}`, {
      method: 'GET',
      headers: await getHeaders(),
    });
    if (!response.ok) return { user_id: null };
    return await response.json();
  } catch (error) {
    console.error('searchProfile error:', error);
    return { user_id: null };
  }
}