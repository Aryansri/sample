const webSocketServer=require('ws').Server
var update = require("update-immutable").default;
const localStorage = require('localStorage')
const wss =new webSocketServer({port:8080}) 
let bets = {
   1: [],
   2:[],
   3:[],
   4:[],
   5:[],
   6:[]
}

let numbers = {
   1:{
      "betAmount" : 0,
      "winAmount": null
   },
   2:{
      "betAmount" : 0,
      "winAmount": null
   },
   3:{
      "betAmount" : 0,
      "winAmount": null
   },
   4:{
      "betAmount" : 0,
      "winAmount": null
   },
   5:{
      "betAmount" : 0,
      "winAmount": null
   },
   6:{
      "betAmount" : 0,
      "winAmount": null
   }
}

let players = []

let summary = {
   type : "summary",
   data : {
      game : {
         id : "id1",
         table : "table1",
         status : "rolling_dice",
         bets : null,
         numbers : null,
         players : null,
         dealer : {
            name : "srikanth",
            gender : "male"
         }
      }
   }
}
let betplace = {  
   type:"betPlaced",
   data:{  
       by:"",
       number:"",
       amount:"",
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

wss.on('connection', function connection(ws) {
    // console.log('onnnn',ws)  responce to back end part
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
            ws.send(JSON.stringify({type : "changeStatus" , data : { state : "settling bets"}}))
             console.log('ress',res)
            let prev = bets[res.number].length > 0 && bets[res.number].filter(user => user.name == res.by )
            console.log("prev",prev)
            let betValue = prev.length > 0 ? parseInt(prev[0].amount) + parseInt(res.betValue) : res.betValue
            if(prev.length > 0) {
               let index = bets[res.number].findIndex(user => user.name == res.by)
               delete bets[res.number][index]
            }
            let bet = {
               "name":res.by,
               "amount" : betValue
            }

            console.log("bet",bet)
            bets = update(bets ,{[res.number]:{$push: [bet]}})

            let isPlayer = players.findIndex(player => player.name == res.by)
            if(isPlayer > -1) {
               let sum = parseInt(players[isPlayer].amount) + parseInt(res.betValue)
               players = update(players , {[isPlayer] : {amount : {$set : sum}}})
            } else {
               players.push(bet)
            }


            Object.keys(bets).map(index => {
               if(bets[index].length > 0) {
                  let sum = 0
                  bets[index].map(value => {
                     sum = parseInt(value.amount)
                  })
                  numbers = update(numbers , {[index] :{betAmount : {$set : sum}}})
               }
            })

            let anybet = betplace.data.summary.numbers[res.number]
            let originalBet = parseInt(anybet) + parseInt(res.betValue)
            betplace = update(betplace , {data : {by : {$set : res.by}}})
            betplace = update(betplace , {data : {number : {$set : res.number}}})
            betplace = update(betplace , {data : {amount : {$set : res.betValue}}})
            betplace = update(betplace , { data :{summary : {numbers : { [res.number]: {$set : originalBet}} }}})

            summary = update(summary , {data :{game : {numbers : {$set : numbers}}}})
            summary = update(summary , {data :{game : {players : {$set : players}}}})
            summary = update(summary , {data :{game : {bets : {$set : bets}}}})

            client.send(JSON.stringify(betplace))
            client.send(JSON.stringify(summary))
          }

          ////  join room send to front end  data

          if(res && res.type === "diceRolled") {
             ws.send(JSON.stringify({type : "changeStatus" , data : { state : "dice rolled"}}))
            console.log("rice roled",res)
            function getOccurrence(array, value) {
               console.log(array,value)
               var count = 0;
               array.map((v) => (v === value && count++));
               return count;
           }

           Object.keys(numbers).map(number => {
              let winAmountOccurence = getOccurrence(res.data.numbers ,parseInt(number))
              let betAmount = numbers[number].betAmount
              numbers = update(numbers , {[number]:{winAmount : {$set:winAmountOccurence*betAmount}}})
           })

         //   Object.keys(players).map(player => {
         //    let winAmountOccurence = getOccurrence(res.data.numbers ,parseInt(player))
         //    let betAmount = players[player].amount
         //    players = update(players , {[player]:{$merge : {winAmount : winAmountOccurence * betAmount}}})
         // })

         console.log("before",bets)
         Object.keys(bets).map(index => {
            let winAmountOccurence = getOccurrence(res.data.numbers ,parseInt(index))
            if(bets[index].length > 0) {
               // let sum = 0
               bets[index].map((value ,index1) => {
                  // sum = parseInt(value.amount)
                  let betAmount = parseInt(value.amount)
                  bets = update(bets , {[index]:{[index1]:{$merge:{winAmount : winAmountOccurence * betAmount}}}})
               })
               // numbers = update(numbers , {[index] :{betAmount : {$set : sum}}})
            }
         })

            players.map((player,index) => {
               let winAmount = 0
               Object.keys(bets).map(index => {
                  if(bets[index].length > 0) {
                     // let sum = 0
                     bets[index].map((value ,index1) => {
                        if(value.name == player.name) {
                           winAmount = winAmount + parseInt(value.winAmount)
                        }
                     })
                  }
               })
               
               players = update(players , {[index]:{$merge : {winAmount : winAmount}}})
            })

            let result = {
               type : "results",
               data : {
                  numbers : numbers,
                  players : players
               }
            }
            client.send(JSON.stringify(result))
         }

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


// if(res && res.betValue){
//   console.log('Placebet')
//   let PlaceBet={
//           type: "PlaceBet",
//                data: {
//                       number: res.number, 
//                       amount: res.betValue
      
//       }

// }
// client.send(JSON.stringify(PlaceBet));
// }



// dice rolled 




          ///// connection  estbished to front end

          if(res && res.type === "connection") {
            ws.send(JSON.stringify({type : "changeStatus" , data : { state : "connected to server"}}))
            client.send(JSON.stringify({type: "connection",
                            name : res.connection,
                            data: {status: "ok",token: res.token,uuid: res.uuid   
                         }
                        }))
          }


      });
    });
})
   