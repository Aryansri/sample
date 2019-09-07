const webSocketServer=require('ws').Server
const update = require("update-immutable").default;
const wss =new webSocketServer({port:8080 , auto_ping_timeout : 12 })
let clientsData = require('./clients.json')
let fs = require('fs')
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

let betPlaces = []
// const clients = new Set();
let lib = JSON.parse(fs.readFileSync('./clients.json', 'utf8'));
wss.on('connection', function connection(ws) {
    // clients.add(ws);
    ws.on('message', function incoming(data) {
        let res = JSON.parse(data)
        console.log("messge",res)
        
            if(res && res.type === "connection") {
            lib =  update(lib , {$push : [res]})
            const stringToWrite = JSON.stringify(lib, null, 2);
            
                // fs.writeFile("clients.json", stringToWrite, 'utf8', function (err) {
                //     if (err) {
                //         console.log("An error occured while writing JSON Object to File.");
                //         return console.log(err);
                //     }
                 
                //     console.log("JSON file has been saved.");
                // });
        }

        if(res && res.type === "placeBet") {
            let prev = bets[res.number].filter(user => user.name == res.by )
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
            
            betplace = update(betplace , {data : {by : {$set : res.by}}})
            betplace = update(betplace , {data : {number : {$set : res.number}}})
            betplace = update(betplace , {data : {amount : {$set : res.betValue}}})

            if(betPlaces.length === 0) {
                betplace = update(betplace , { data :{summary : {numbers : { [res.number]: {$set : parseInt(res.betValue)}} }}})
                betPlaces.push(betplace)
            } else {
                betPlaces.map((value ,index) => {
                    if(value.data.by === res.by) {
                        let anybet = value.data.summary.numbers[res.number]
                        let originalBet = parseInt(anybet) + parseInt(res.betValue)
                        betplace = update(value , { data :{summary : {numbers : { [res.number]: {$set : originalBet}} }}})
                        betPlaces = update(betPlaces , {[index] : {$set : betplace}})
                    } else {
                        betplace = update(betplace , { data :{summary : {numbers : { [res.number]: {$set : parseInt(res.betValue)}} }}})
                        betPlaces.push(betplace)
                    }
                })
            }

            summary = update(summary , {data :{game : {numbers : {$set : numbers}}}})
            summary = update(summary , {data :{game : {players : {$set : players}}}})
            summary = update(summary , {data :{game : {bets : {$set : bets}}}})
            wss.clients.forEach(function each(client) {
                client.send(JSON.stringify(betplace))
                client.send(JSON.stringify(summary))

            })
        }

        if(res && res.type === "diceRolling") {
            let dies = [Math.floor(Math.random() * 6+1) ,Math.floor(Math.random() * 6+1),Math.floor(Math.random() * 6+1)]
            console.log('dies',dies)
            // ws.send(JSON.stringify({type : "changeStatus" , data : { state : "dice rolled"}}))
            function getOccurrence(array, value) {
               var count = 0;
               array.map((v) => (v === value && count++));
               return count;
           }

           Object.keys(numbers).map(number => {
              let winAmountOccurence = getOccurrence(dies ,parseInt(number))
              let betAmount = numbers[number].betAmount
              numbers = update(numbers , {[number]:{winAmount : {$set:winAmountOccurence*betAmount}}})
           })

         Object.keys(bets).map(index => {
            let winAmountOccurence = getOccurrence(dies ,parseInt(index))
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
                  players : players,
                  dies : dies
               }
            }
            wss.clients.forEach(function each(client) {

                client.send(JSON.stringify(result))
            })

            bets = {
                1: [],
                2:[],
                3:[],
                4:[],
                5:[],
                6:[]
             }
             
             numbers = {
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
             
             players = []
             
             summary = {
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
             
             betPlaces = []


            
            // ws.send(JSON.stringify({  
            //     type:"diceRolled",
            //     data:{  
            //        numbers:dies
            //   }
            // }))
        }
    }
    
    )
        


        // if(response && res.betValue) {
        //     ws.send(JSON.stringify({type : "changeStatus" , data : { state : "settling bets"}}))
        //     let prev = bets[res.number].length > 0 && bets[res.number].filter(user => user.name == res.by )
        //     console.log("prev",prev)
        //     let betValue = prev.length > 0 ? parseInt(prev[0].amount) + parseInt(res.betValue) : res.betValue  
        //     console.log('prevlenth',betValue)
        //     if(prev.length > 0) {
        //        let index = bets[res.number].findIndex(user => user.name == res.by)
        //        delete bets[res.number][index]
        //     }
        //     let bet = {
        //        "name":res.by,
        //        "amount" : betValue
        //     }

        //     console.log("bet",bet)
        //     bets = update(bets ,{[res.number]:{$push: [bet]}})

        //     let isPlayer = players.findIndex(player => player.name == res.by)
        //     if(isPlayer > -1) {
        //        let sum = parseInt(players[isPlayer].amount) + parseInt(res.betValue)
        //        players = update(players , {[isPlayer] : {amount : {$set : sum}}})
        //     } else {
        //        players.push(bet)
        //     }


        //     Object.keys(bets).map(index => {
        //        if(bets[index].length > 0) {
        //           let sum = 0
        //           bets[index].map(value => {
        //              sum = parseInt(value.amount)
        //           })
        //           numbers = update(numbers , {[index] :{betAmount : {$set : sum}}})
        //        }
        //     })

        //     let anybet = betplace.data.summary.numbers[res.number]
        //     let originalBet = parseInt(anybet) + parseInt(res.betValue)
        //     betplace = update(betplace , {data : {by : {$set : res.by}}})
        //     betplace = update(betplace , {data : {number : {$set : res.number}}})
        //     betplace = update(betplace , {data : {amount : {$set : res.betValue}}})
        //     betplace = update(betplace , { data :{summary : {numbers : { [res.number]: {$set : originalBet}} }}})

        //     summary = update(summary , {data :{game : {numbers : {$set : numbers}}}})
        //     summary = update(summary , {data :{game : {players : {$set : players}}}})
        //     summary = update(summary , {data :{game : {bets : {$set : bets}}}})

        //     client.send(JSON.stringify(betplace))
        //     client.send(JSON.stringify(summary))
        //   }



    ws.on('close', function() {
        // clients.delete(ws);
        console.log("closed called")
    });
})