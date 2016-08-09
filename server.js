const connect = require('connect')
const serveStatic = require('serve-static')
const ws = require('ws')
const fs = require('fs')
const ip = require('ip')
const child_process = require('child_process')
const PeerTalk = require('peertalk')
const firebase = require("firebase");

// constants

const FIREBASE_SERVICE_FILE = 'firebase.json'
const FIREBASE_DATABASE_URL = 'https://blatt-3000-mission-control.firebaseio.com'

const STATIC_FOLDER = 'app'
const SCORE_FOLDER = 'score'
const MEDIA_FOLDER = 'media'
const VENDOR_FOLDER = 'bower_components'
const COMMON_FOLDER = 'assets'
const PDF_FOLDER = 'pdfs'
const LOGS_FOLDER = 'logs'

const SCORE_PATH = SCORE_FOLDER + '/score.json'

const ADDRESS_ROOT = 'unm'

const HTTP_SERVER_PORT_CONTROL = 3000
const HTTP_SERVER_PORT_PROJECTION = 4000

const WEBSOCKET_SERVER_PORT = 9000

const ALL = 'all'
const PROJECTION = 'projection'
const CONTROL = 'control'

const SYNCHRONIZATION_DELAY = 50

// server

let clients

let score, scoreIndex

let httpServer = {}

let wsServer

let usb

let startupTimestamp

// performance

let isAppKilled

// log

function _format(sNumber) {
  return (sNumber < 10 ? '0' : '') + sNumber
}

function _log(sMessage) {
  const now = new Date()
  const time = _format(now.getHours()) + ':' + _format(now.getMinutes()) + ':' + _format(now.getSeconds())

  const msg = time + ' - ' + sMessage
  const date = `${now.getFullYear()}${_format(now.getMonth() + 1)}${_format(now.getDate())}`

  console.log(msg)

  fs.appendFile([LOGS_FOLDER, `log_${date}.txt`].join('/'), `${msg}\n`)
}

function _getPDFFiles() {
  let files, dir
  files = []
  dir = fs.readdirSync([__dirname, SCORE_FOLDER, PDF_FOLDER].join('/'))
  for (let i in dir){
    if (dir[i].includes('.pdf')) {
      files.push(dir[i])
    }
  }
  return files
}

function _scene() {
  let i, scene, sceneNext, messages, nextScenescoreIndex

  scene = score[scoreIndex]
  messages = []

  for (i = 0; i < 3; i++) {
    Object.keys(scene[i]).forEach(function(eCommand) {
      messages.push({
        address: [PROJECTION, i, eCommand],
        args: [scene[i][eCommand], false]
      })
    })
  }

  if (scoreIndex + 1 > score.length - 1) {
    nextScenescoreIndex = 0
  } else {
    nextScenescoreIndex = scoreIndex + 1
  }

  sceneNext = score[nextScenescoreIndex]

  messages.push({
    address: [CONTROL, 'info'],
    args: ['#' + scoreIndex + ' ' + scene.title, '#' + nextScenescoreIndex + ' ' + sceneNext.title]
  })

  _log('SCENE #' + scoreIndex + ' ' + scene.title)
  _broadcast(messages)
}

function _trigger() {
  scoreIndex++

  if (scoreIndex > score.length - 1) {
    scoreIndex = 0
  }

  _scene()
}

function _undo() {
  scoreIndex--

  if (scoreIndex < 0) {
    scoreIndex = score.length - 1
  }

  _scene()
}

function _reset() {
  _read(SCORE_PATH)

  scoreIndex = -1
  isAppKilled = false

  _broadcast([{
    address: [ 'reset' ]
  }])
}

function _say(eMessage, eIsMuted) {
  if (! eIsMuted) {
    child_process.exec('say ' + eMessage, function() {})
  }
  _log('SAY "' + eMessage + '"')
}

function _ask(eMessage) {
  _say(eMessage, isAppKilled)
  _broadcast([{
    address: [ PROJECTION, Math.floor(Math.random() * 3), 'ask' ],
    args: [ eMessage ]
  }])
}

function _type(eProjectionId, eMessage) {
  _broadcast([{
    address: [ PROJECTION, eProjectionId, 'type' ],
    args: [ eMessage ]
  }])
}

function _kill() {
  isAppKilled = true
}

function _mute(eProjectionId, eStatus) {
  _broadcast([{
    address: [ PROJECTION, eProjectionId, 'mute' ],
    args: [ eStatus ]
  }])
}

function _listenHttp(sName, sPort) {
  if (! sName || ! sPort) {
    return false
  }

  if (! (sName in httpServer)) {
    httpServer[sName] = connect()
  } else {
    return false
  }

  _log('LISTEN HTTP (PORT=' + sPort + ', ID=' + sName + ')')

  httpServer[sName].use('/info', (req, res) => {
    res.end(JSON.stringify({
      address: ip.address(),
      port: WEBSOCKET_SERVER_PORT,
      kill: isAppKilled,
      pdfs: _getPDFFiles()
    }))
  })

  httpServer[sName].use(serveStatic([__dirname, STATIC_FOLDER, sName].join('/')))
  httpServer[sName].use(serveStatic([__dirname, STATIC_FOLDER, COMMON_FOLDER].join('/')))
  httpServer[sName].use(serveStatic([__dirname, VENDOR_FOLDER].join('/')))

  if (sName === PROJECTION) {
    httpServer[sName].use(serveStatic([__dirname, SCORE_FOLDER, MEDIA_FOLDER].join('/')))
  }

  if (sName === CONTROL) {
    httpServer[sName].use(serveStatic([__dirname, SCORE_FOLDER, PDF_FOLDER].join('/')))
  }

  httpServer[sName].listen(sPort)

  return true
}

function _delegate(sMessage) {
  let address, receiver, command

  if (sMessage.address[0] === '/') {
    address = sMessage.address.substr(1)
  } else {
    address = sMessage.address
  }

  address = address.split('/')

  if (address.length < 3) {
    _log('MESSAGE FORMAT ERROR: UNKNOWN ADDRESS FORMAT')
    return false
  }

  if (address[0] !== ADDRESS_ROOT) {
    _log('MESSAGE FORMAT ERROR: UNKNOWN ROOT ADDRESS')
    return false
  }

  receiver = address[1]

  if (! [ALL, CONTROL, PROJECTION].includes(receiver)) {
    _log('MESSAGE FORMAT ERROR: UNKNOWN RECEIVER')
    return false
  }

  command = address[2]

  if (command === 'trigger') {
    _trigger()
  } else if (command === 'reset') {
    _reset()
    _trigger()
  } else if (command === 'undo') {
    _undo()
  } else if (command === 'say') {
    if (sMessage.args.length === 2) {
      _say(sMessage.args[0], sMessage.args[1])
    }
  } else if (command === 'ask') {
    if (sMessage.args.length === 1) {
      _ask(sMessage.args[0])
    }
  } else if (command === 'type') {
    if (sMessage.args.length === 2) {
      _type(sMessage.args[0], sMessage.args[1])
    }
  }
}

function _listenWebsocket(sPort) {
  if (! sPort) {
    return false
  }

  // websocket server

  wsServer = new ws.Server({ port: sPort })

  wsServer.on('connection', (sData) => {
    clients++

    _log('NEW PARTICIPANT CONNECTED (TOTAL=' + clients + ')')

    sData.on('message', (rMessage) => {
      _delegate(JSON.parse(rMessage))
    })

    sData.on('close', (rMessage) => {
      clients--
      _log('PARTICIPANT LEFT (TOTAL=' + clients + ', MESSAGE=' + rMessage + ')')
    })

    sData.on('error', (rError) => {
      _log(`WS CLIENT ERROR (MESSAGE=${rError})`)
    })
  })
  return true
}

function _read(sFilePath) {
  fs.readFile([__dirname, sFilePath].join('/'), 'utf8', (eError, eData) => {
    if (eError) throw eError
    score = JSON.parse(eData)
    _log(`READ SCORE. OK (SCENES=${ score.length})`)
  })
}

function _init() {
  startupTimestamp = new Date().toISOString()

  _log('UNM <3000')
  _log(new Date().toUTCString())
  _log(`IP=${ip.address()}`)

  // start http servers

  _listenHttp(PROJECTION, HTTP_SERVER_PORT_PROJECTION)
  _listenHttp(CONTROL, HTTP_SERVER_PORT_CONTROL)

  // start websocket server

  _listenWebsocket(WEBSOCKET_SERVER_PORT)

  // read the score && set initial values

  _reset()

  // clients initial value

  clients = 0

  // hook into firebase

  firebase.initializeApp({
    databaseURL: FIREBASE_DATABASE_URL,
    serviceAccount: FIREBASE_SERVICE_FILE,
  })

  firebase.database().ref('questions').on('child_added', (eSnapshot) => {
    const question = eSnapshot.val()
    if (question.timestamp > startupTimestamp) {
      _ask(question.message)
    }
  })
}

function _broadcast(sMessages) {
  let data, address, args, messages

  if (! sMessages) {
    return false
  }

  messages = []

  sMessages.forEach((eMessage) => {
    if (! eMessage.address) {
      return false
    }

    if (typeof eMessage.address === 'string') {
      address = eMessage.address
    } else if (typeof eMessage.address === 'object' && eMessage.address.length) {
      address = eMessage.address.join('/')
    } else {
      return false
    }

    args = eMessage.args? eMessage.args : []

    messages.push({
      address: '/' + ADDRESS_ROOT + '/' + address,
      args: args
    })
  })

  data = {
    timestamp: Date.now() + SYNCHRONIZATION_DELAY,
    data: messages
  }

  // send to clients

  wsServer.clients.forEach((eClient) => {
    eClient.send(JSON.stringify(data), (rError) => {
      if (rError) {
        _log('WS SERVER ERROR (MESSAGE=' + rError + ')')
      }
    })
  })
}

// go

_init()
