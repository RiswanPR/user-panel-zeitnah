const API_BASE = 'http://localhost:3000/api';
const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YTRmZjUwNGNlMTg1OGVmMTIxZDQ3NWQiLCJwcmltYXJ5Um9sZSI6IlNUVURFTlQiLCJyb2xlIjoic3R1ZGVudCIsImRldmljZUlkIjoiNWFlY2ZhMzgyODMzYjI5ZmI2M2E5YmE1YjRmM2JjMjkiLCJpYXQiOjE3OTA5NzQxNTgsImV4cCI6MTc5MTU3ODk1OH0.eyARAfjlV5aLp8yLSca8hmTLcY3knfUIafsYiI0oseQ";

async function testUploadAndContract() {
  console.log('--- 1. Testing Real Upload with Valid PNG & Auth Token ---');
  const validPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const pngBuffer = Buffer.from(validPngBase64, 'base64');

  const formData = new FormData();
  const blob = new Blob([pngBuffer], { type: 'image/png' });
  formData.append('file', blob, 'real-test-image.png');

  const res = await fetch(`${API_BASE}/community/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
    },
    body: formData,
  });

  const status = res.status;
  const body = await res.json();
  console.log(`Upload Status: ${status}`);
  console.log('Upload Response Body:', JSON.stringify(body, null, 2));

  if (status === 201 || status === 200) {
    console.log('SUCCESS: S3 Upload verified!');
    console.log('URL:', body.url);
    console.log('Size:', body.size);
    console.log('MimeType:', body.mimeType);

    // Verify user scope in URL
    const expectedUserPrefix = 'community/uploads/6a4ff504ce1858ef121d475d/';
    if (body.url && body.url.includes(expectedUserPrefix)) {
      console.log(`PASS: S3 object key is correctly user-scoped: ${expectedUserPrefix}`);
    } else {
      console.warn(`FAIL: Expected key to contain ${expectedUserPrefix}`);
    }

    // 2. Test Safe S3 Cleanup via DELETE
    console.log('\n--- 2. Testing S3 deletion of uploaded media ---');
    const delRes = await fetch(`${API_BASE}/community/upload`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: body.url }),
    });
    console.log(`Delete Status: ${delRes.status}`);
    const delBody = await delRes.json();
    console.log('Delete Response:', delBody);
  }

  // 3. Test Magic Bytes Failure (Renamed exe to png)
  console.log('\n--- 3. Testing Magic Bytes Rejection of Fake PNG (malicious.exe -> image/png) ---');
  const fakePngBuffer = Buffer.from([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]); // MZ DOS/PE header
  const fakeFormData = new FormData();
  fakeFormData.append('file', new Blob([fakePngBuffer], { type: 'image/png' }), 'malicious.exe.png');

  const fakeRes = await fetch(`${API_BASE}/community/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
    },
    body: fakeFormData,
  });
  console.log(`Fake File Status (Expected 400): ${fakeRes.status}`);
  const fakeBody = await fakeRes.json();
  console.log('Fake File Response:', fakeBody);

  // 4. Test Unauthenticated Request (Expected 401)
  console.log('\n--- 4. Testing Unauthenticated Upload Request (Expected 401) ---');
  const unauthRes = await fetch(`${API_BASE}/community/upload`, {
    method: 'POST',
    body: formData,
  });
  console.log(`Unauthenticated Status (Expected 401): ${unauthRes.status}`);
}

testUploadAndContract().catch(console.error);
