const router = require('koa-router')()
const path = require('path')
const { writeFile, execCommand, getUniqueFilename } = require('./util')

const hostPath = path.join(__dirname, '/code')
const workPath = '/code'
let idx = 0

router.get('/', async ctx => {
  await ctx.render('index', {
    languageList: [
      'node',
      'python'
    ]
  })
})
router.post('/runner', async (ctx) => {
  idx += 1
  const { language, code, version } = ctx.request.body
  const filename = getUniqueFilename(language, idx)
  const filePath = path.join(hostPath, filename)

  const [writeErr, ] = await writeFile(hostPath, filename, code)
  const [execErr, ] = await execCommand(`docker pull ${language}:${version}`, { timeout: 30000 })

  if (writeErr || execErr) {
    return ctx.body = {
      errno: 0,
      data: writeErr || execErr
    }
  }
  const [e, data] = await execCommand(
    `docker run --rm --memory=50m --name runner-${idx} -v ${hostPath}:${workPath} ${language}:${version} ${language} ${filePath}`,
    { timeout: 10000 },
    `docker stop runner-${idx}`
  )

  return ctx.body = {
    errno: 0,
    data: e || data
  }
})
router.get('*', async ctx => {
  await ctx.render('404')
})

module.exports = router