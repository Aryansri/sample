const express = require('express')
const app = express()
var bodyParser = require('body-parser')

const port = 3000
const webSocketport = 8080
const webSocketServer=require('ws').Server
const update = require("update-immutable").default;
const wss =new webSocketServer({port:webSocketport})


app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

app.get('/', (req, res) => res.send('Hello World!'))

app.post('/myname',(req,res)=>{
    console.log('your data is',req.body)
    
})

app.post('/connected',(req,res)=>{
    console.log('connecte dtaa',req.body)
})

app.listen(port, () => {
    console.log(`Server started ${port}!`)
    console.log('webSocket Server started',webSocketport)
})