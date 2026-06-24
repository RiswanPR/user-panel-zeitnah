const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3');

async function check() {
  const s3 = new S3Client({
    region: 'ap-south-1',
    credentials: {
      accessKeyId: 'AKIAZDTIRCPX5UW25JDZ',
      secretAccessKey: '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',
    }
  });
  
  try {
    const res = await s3.send(new HeadObjectCommand({
      Bucket: 'zeitnahacademy-production',
      Key: 'classes/videos/1781997713459-425769740.mp4'
    }));
    console.log("SUCCESS! FILE EXISTS.");
    console.log(res);
  } catch(e) {
    console.log("FAILED TO FIND FILE IN S3:");
    console.log(e);
  }
}
check();
