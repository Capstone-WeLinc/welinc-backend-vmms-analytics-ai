const apiKey = process.env.GEMINI_API_KEY || 'AQ.Ab8RN6J1f2kdf8_LxVam4DmszMAHln12Z7YV43z-OUaodqXMMw';
const url = 'https://generativelanguage.googleapis.com/v1beta';

async function listModels() {
  try {
    const res = await fetch(`${url}/models?key=${apiKey}`);
    if (res.ok) {
      const data = await res.json();
      console.log(data.models.map(m => m.name).join('\n'));
    } else {
      console.log(await res.text());
    }
  } catch(e) {
    console.log(e.message);
  }
}

listModels();
