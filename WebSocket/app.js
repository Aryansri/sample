const webSocketServer=require('ws').Server
var update = require("update-immutable").default;
const localStorage = require('localStorage')
const wss =new webSocketServer({port:8080}) 
wss.on('connection', function connection(ws) {
    console.log('onnnn',ws)
    // wss.clients.forEach(function each(client) {
    //     // let res = JSON.parse(data)
      
    //       client.send(JSON.stringify({type: "connection",
    //                         data: {status: "ok",token: "asdfasdfjai34rkjfasdkf4kjkjagg...",uuid: "74802adf-dd0d-4bd6-978d-c11783d326a4"   
    //                      }
    //                     }))
    // }) 
      
    
    ws.on('message', function incoming(data) {
        console.log('od',data)
      wss.clients.forEach(function each(client) {

        //...betplaceed send to frontend 
        let res = JSON.parse(data)


          if(res && res.betValue) {
            let betplace = {  
                type:"betPlaced",
                data:{  
                    by:res.by,
                    number:res.number,
                    amount:res.betValue,
                    summary:{  
                        numbers:{  
                            1:0,
                            2:0,
                            3:0,
                            4:0,
                            5:0,
                            6:0
                        }
                    }
                }
            }


            //immutable updater(nested object updater)

            betplace = update(betplace , { data :{summary : {numbers : { [res.number]: {$set : res.betValue}} }}})
            client.send(JSON.stringify(betplace))
          }

          ////  join room send to front end  data

          if(res && res.type === "join") {
            let betplace = {  
                type:"join",
                data:{  
                    roomId:12,
                    accessToken:res.token
                }
            }
            client.send(JSON.stringify(betplace))

          }


/////plce bet 


if(res && res.betValue){
  console.log('Placebet')
  let PlaceBet={
          type: "PlaceBet",
               data: {
                      number: res.number, 
                      amount: res.betValue
      
      }

}
client.send(JSON.stringify(PlaceBet));
}









          ///// connection  estbished to front end

          if(res && res.type === "connection") {
            client.send(JSON.stringify({type: "connection",
                            name : res.connection,
                            data: {status: "ok",token: res.token,uuid: res.uuid   
                         }
                        }))
          }


      });
    });
})
   