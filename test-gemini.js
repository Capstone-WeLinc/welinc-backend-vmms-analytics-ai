const apiKey = process.env.GEMINI_API_KEY || 'AQ.Ab8RN6J1f2kdf8_LxVam4DmszMAHln12Z7YV43z-OUaodqXMMw';
const url = 'https://generativelanguage.googleapis.com/v1beta';

async function testModel(model) {
  try {
    const res = await fetch(`${url}/models/${model}:generateContent`, {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Hello' }] }]
      })
    });
    console.log(`${model}: ${res.status}`);
    if (!res.ok) {
      console.log(await res.text());
    }
  } catch(e) {
    console.log(model, e.message);
  }
}

async function main() {
  await testModel('gemini-2.0-flash');
  await testModel('gemini-1.5-flash');
  await testModel('gemini-1.5-pro');
  await testModel('gemini-1.0-pro');
  await testModel('gemini-1.0');
}

main();
