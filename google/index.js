const credentials = {
  type: process.env.type,
  project_id: process.env.project_id,
  private_key_id: process.env.private_key_id,
  private_key: process.env.private_key,
  client_email: process.env.client_email,
  client_id: process.env.client_id,
  auth_uri: process.env.auth_uri,
  token_uri: process.env.token_uri,
  auth_provider_x509_cert_url: process.env.auth_provider_x509_cert_url,
  client_x509_cert_url: process.env.client_x509_cert_url
}
const speech = require('@google-cloud/speech')
const storage = require('@google-cloud/storage')
const fs = require('fs')

module.exports = {
  uploadFile: async (path, name) => {
    const client = new storage.Storage({
      credentials
    })
    const data = await client
      .bucket('lmalvasiatest')
      .upload(path)
      .then(() => {
        return `gs://lmalvasiatest/${name}`
      })
      .catch(err => {
        console.log(err)
      })
    return data
  },
  transcriptAudio: async uri => {
    const client = new speech.v1.SpeechClient({
      credentials
    })
    const audio = {
      uri
    }
    const config = {
      enableAutomaticPunctuation: true,
      encoding: 'LINEAR16',
      languageCode: 'en-US',
      model: 'video'
    }
    const request = {
      audio,
      config
    }
    // Detects speech in the audio file. This creates a recognition job that you
    // can wait for now, or get its result later.
    const [operation] = await client
      .longRunningRecognize(request)
      .then(data => {
        return data
      })
      .catch(err => {
        console.log(err)
      })
    // Get a Promise representation of the final result of the job
    const [response] = await operation.promise().catch(err => {
      console.log(err)
    })
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n')
    return transcription
  }
}
