const credentials = {
  region: process.env.region,
  accessKeyId: process.env.accessKeyId,
  secretAccessKey: process.env.secretAccessKey
}
const AWS = require('aws-sdk')
const awsComprehendMedical = new AWS.ComprehendMedical(credentials)
const transcribeservice = new AWS.TranscribeService(credentials)
const request = require('request-promise')
const s3 = new AWS.S3(credentials)
const fs = require('fs')
const _ = require('lodash')

module.exports = {
  uploadFile: async (path, fileName) => {
    const file = fs.readFileSync(path)
    const base64data = new Buffer(file, 'binary')
    const params = {
      Bucket: 'lmalvasiatest',
      Key: fileName, //Name of file
      Body: base64data
    }
    const data = await s3.upload(params).promise()
    return data.Location
  },
  startTranscriptionJob: async (url, jobName) => {
    var params = {
      LanguageCode: 'en-US',
      Media: {
        /* required */
        MediaFileUri: url
      },
      MediaFormat: 'wav',
      TranscriptionJobName: jobName /* required */,
      // OutputBucketName: 'lmalvasiatest' --> If I want to save the json file in S3.
      Settings: {
        MaxSpeakerLabels: 2,
        ShowSpeakerLabels: true
        // VocabularyName: 'STRING_VALUE'
      }
    }
    const data = await transcribeservice.startTranscriptionJob(params).promise()
    return data
  },
  getTranscriptionJob: async jobName => {
    const transcriptionJob = await transcribeservice
      .getTranscriptionJob({
        TranscriptionJobName: jobName
      })
      .promise()
    return transcriptionJob
  },
  getTranscript: async FileUri => {
    transcript = await request({
      url: FileUri,
      json: true
    })
      .then(body => {
        return body.results.transcripts[0].transcript
      })
      .catch(err => {
        return `Error: ${err}`
      })
    return transcript
  },
  comprehendMedical: async Text => {
    const entities = await awsComprehendMedical
      .detectEntities({
        Text
      })
      .promise()
    return entities
  },
  entitiesToCategories: async entities => {
    let categories = {
      ANATOMY: [],
      MEDICAL_CONDITION: [],
      MEDICATION: [],
      PROTECTED_HEALTH_INFORMATION: [],
      TEST_TREATMENT_PROCEDURE: [],
      UnmappedAttributes: entities.UnmappedAttributes
    }
    entities.Entities.map(entity => {
      switch (entity.Category) {
        case 'ANATOMY':
          categories.ANATOMY.push({
            Text: entity.Text,
            Type: entity.Type,
            Score: entity.Score
          })
          break
        case 'MEDICAL_CONDITION':
          categories.MEDICAL_CONDITION.push({
            Text: entity.Text,
            Type: entity.Type,
            Score: entity.Score,
            Traits: entity.Traits
          })
          break
        case 'MEDICATION':
          categories.MEDICATION.push({
            Text: entity.Text,
            Type: entity.Type,
            Score: entity.Score,
            Attributes: entity.Attributes || [],
            Traits: entity.Traits
          })
          break
        case 'PROTECTED_HEALTH_INFORMATION':
          categories.PROTECTED_HEALTH_INFORMATION.push({
            Text: entity.Text,
            Type: entity.Type,
            Score: entity.Score
          })
          break
        case 'TEST_TREATMENT_PROCEDURE':
          categories.TEST_TREATMENT_PROCEDURE.push({
            Text: entity.Text,
            Type: entity.Type,
            Score: entity.Score,
            Attributes: entity.Attributes || [],
            Traits: entity.Traits
          })
          break
        default:
          break
      }
    })
    categories.ANATOMY = _.orderBy(categories.ANATOMY, 'Score', 'desc')
    categories.MEDICAL_CONDITION = _.orderBy(
      categories.MEDICAL_CONDITION,
      'Score',
      'desc'
    )
    categories.MEDICATION = _.orderBy(categories.MEDICATION, 'Score', 'desc')
    categories.TEST_TREATMENT_PROCEDURE = _.orderBy(
      categories.TEST_TREATMENT_PROCEDURE,
      'Score',
      'desc'
    )
    categories.PROTECTED_HEALTH_INFORMATION = _.orderBy(
      categories.PROTECTED_HEALTH_INFORMATION,
      'Score',
      'desc'
    )
    categories.UnmappedAttributes = _.orderBy(
      categories.UnmappedAttributes,
      'Score',
      'desc'
    )
    return categories
  }
}
