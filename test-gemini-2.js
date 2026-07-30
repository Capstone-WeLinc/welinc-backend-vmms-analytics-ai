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
    } else {
        const data = await res.json();
        console.log(data.candidates?.[0]?.content?.parts?.[0]?.text?.substring(0, 50));
    }
  } catch(e) {
    console.log(model, e.message);
  }
}

async function main() {
  await testModel('gemini-2.5-flash');
  await testModel('gemini-flash-latest');
  await testModel('gemini-pro-latest');
  await testModel('gemini-3.5-flash');
}

main();
