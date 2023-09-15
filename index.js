const express = require('express')
const app = express()
const cors = require('cors');
app.use(cors());

const bodyParser = require('body-parser')
const multer = require('multer') 
const upload = multer() 
//const path = require('path')

const { Database } = require("quickmongo") ;

const db = new Database("mongodb+srv://sharonlews92:mongodb72@cluster0.u6bhg00.mongodb.net");

db.on("ready", () => {
    console.log("Connected to the database");
});

async function load() {
    await db.connect()
}
load()

app.use(bodyParser.json()) 
app.use(bodyParser.urlencoded({ extended: true })) 

//const html = path.join(__dirname, 'library');

//app.use('/', express.static(html));

/*app.get('/librarian', function(req, res) {
    res.sendFile(path.join(__dirname, '/master.html'));
})*/

app.get('/ping', function(req, res) {
  res.send({success: true})
})

async function database(id) {
  let blockedList = await db.get("blocked")
  let blocked = false;
  if(blockedList?.includes(id)) blocked = true
  let date = new Date().getDate()
  let todayData = await db.get("library_" + date)
  if(!todayData) {
    todayData = await db.set("library_" + date, [])
  }
  let entry = true
  let students = todayData.length
  let max = await db.get("max")
  max = max ? max : 60
  let full = false
  if(max <= students) full = true
  if(todayData?.includes(id)) {
    full = false
    await db.pull("library_" + date, id)
    entry = false
    students--
  } else {
    if(!full) {
      await db.push("library_" + date, id)
    students++
    }
  }
  
  let currentStudents = db.get("library_" + date)
  return {success: true, blocked, entry, id, full}
}

app.post('/scan', async function(req, res) {
  if(!req.body?.id) return res.send({success: false})
  const response = await database(req.body.id)
  res.send(response)
})

app.post('/block', async function(req, res) {
  if(!req.body?.id) return res.send({success: false})
  let blocked = await db.get("blocked")
  if(!blocked) {
     await db.push("blocked", req.body.id)
    return res.send({success: true, blocked: true})
  }
  if(blocked?.includes(req.body.id)) {
    await db.pull("blocked", req.body.id)
    return res.send({success: true, blocked: false})
  } else {
    await db.push("blocked", req.body.id)
    return res.send({success: true, blocked: true})
  }
  
})

app.post('/changemax', async function(req, res) {
  if(!req.body?.max) return res.send({success: false})
  await db.set("max", req.body.max)
  return res.send({success: true, max:req.body.max})
})

app.get('/students', async function(req, res) {
   let date = new Date().getDate()
  let students = await db.get("library_" + date)
  if(!students) students = []
  let max = await db.get("max")
  if(!max) max = 60
  return res.send({success: true, students, max})
})

app.listen(process.env.PORT || 3001)
