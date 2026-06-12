const fs = require('fs');
const path = require('path');

// Read .env file
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const config = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const parts = trimmed.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const value = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
    config[key] = value;
  }
});

const GROQ_KEY = config.REACT_APP_GROQ_API_KEY;
console.log("Using Groq API Key:", GROQ_KEY ? "Found" : "Not Found");

async function testGroq() {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_KEY}`
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [{
        role: "user",
        content: `Suggest a price for: "thomas calculus"`
      }],
      max_tokens: 80,
      temperature: 0.4
    })
  });

  console.log("Response Status:", res.status);
  console.log("Response Status Text:", res.statusText);
  const text = await res.text();
  console.log("Response Body:", text);
}

testGroq().catch(err => {
  console.error("Fetch failed:", err);
});
