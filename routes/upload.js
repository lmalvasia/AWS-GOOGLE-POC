const router = require('express-promise-router')()
const multer = require('multer')({
  dest: 'public/uploads'
})
const fs = require('fs')
const path = require('path')
const util = require('util')
const aws = require('../aws')
const google = require('../google')
const querystring = require('querystring')

router.route('/').get((req, res) => {
  res.render('uploadForm.ejs')
})

router.post('/upload', [multer.single('attachment')], (req, res, next) => {
  return storeWithOriginalName(req.file)
    .then(data => {
      const filePath = encodeURIComponent(data.fullNewPath)
      const fileName = encodeURIComponent(data.name)
      return { filePath, fileName }
    })
    .then(encoded => {
      const query = querystring.stringify({
        filePath: encoded.filePath,
        fileName: encoded.fileName
      })
      res.redirect(`/upload/success?${query}`)
    })
    .catch(next)
})

router.get('/upload/success', async (req, res, next) => {
  const fileName = decodeURIComponent(req.query.fileName)
  const filePath = decodeURIComponent(req.query.filePath)
  console.log('Upload File to Amazon S3')
  const url = await aws.uploadFile(filePath, fileName)
  console.log('The url is: ', url)
  const date = Date.now().toString()
  const startTranscriptionJob = await aws.startTranscriptionJob(url, date)
  console.log(startTranscriptionJob)
  let transcriptionJob = await aws.getTranscriptionJob(date)
  console.log('Generating transcription with Amazon Transcribe')
  while (
    transcriptionJob.TranscriptionJob.TranscriptionJobStatus === 'IN_PROGRESS'
  ) {
    transcriptionJob = await aws.getTranscriptionJob(date)
  }
  const awstranscript = await aws.getTranscript(
    transcriptionJob.TranscriptionJob.Transcript.TranscriptFileUri
  )
  console.log('Upload File to Google Cloud Storage')
  const uri = await google.uploadFile(filePath, fileName)
  console.log('The url is: ', uri)
  console.log('Generating transcription with Google Speech to Text')
  const gtranscript = await google.transcriptAudio(uri)
  res.render('transcribePage.ejs', { gtranscript, awstranscript })
})

router.post('/upload/success/medical', async (req, res, next) => {
  const { transcribe } = req.body
  const medicalEntities = await aws.comprehendMedical(transcribe)
  let medicalCategories = await aws.entitiesToCategories(medicalEntities)
  console.log(medicalCategories)
  res.render('medicalPage.ejs', { medicalCategories, transcribe })
})

storeWithOriginalName = file => {
  const fullNewPath = path.join(file.destination, file.originalname)
  const rename = util.promisify(fs.rename)

  return rename(file.path, fullNewPath).then(() => {
    const name = file.originalname
    return { fullNewPath, name }
  })
}

module.exports = router
